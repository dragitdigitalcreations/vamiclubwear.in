// Load .env.local first, then fall back to .env
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config()

// ── Environment validation ────────────────────────────────────────────────────
const REQUIRED_ENV = ['DATABASE_URL', 'JWT_SECRET']
const missing = REQUIRED_ENV.filter((k) => !process.env[k])
if (missing.length) {
  console.error(`[startup] Missing required environment variables: ${missing.join(', ')}`)
  console.error('[startup] Copy .env.example to .env.local and fill in the values.')
  process.exit(1)
}
if (process.env.JWT_SECRET === 'vami-dev-secret-change-in-production' && process.env.NODE_ENV === 'production') {
  console.error('[startup] JWT_SECRET is still the default value — set a strong secret before deploying.')
  process.exit(1)
}
// Production must set every env whose silent absence would weaken security:
//   RAZORPAY_KEY_SECRET — without it, /payment/verify HMAC check no-ops and
//                         a forged callback can create a paid order.
//   GOOGLE_CLIENT_ID    — same value as NEXT_PUBLIC_GOOGLE_CLIENT_ID on the
//                         frontend; without it, customer.routes accepts a
//                         Google ID token from any OAuth client (account
//                         takeover via attacker-controlled Google app).
if (process.env.NODE_ENV === 'production') {
  const PROD_REQUIRED = ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'GOOGLE_CLIENT_ID']
  const prodMissing = PROD_REQUIRED.filter((k) => !process.env[k])
  if (prodMissing.length) {
    console.error(`[startup] Missing production-required env: ${prodMissing.join(', ')}`)
    console.error('[startup] These gate signature/audience checks that must not silently no-op.')
    process.exit(1)
  }
}

import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import rateLimit from 'express-rate-limit'
import apiRoutes from './routes/index'
import { errorHandler } from './middleware/errorHandler'
import { prisma } from './lib/prisma'
import { ensureCategories } from './lib/ensureCategories'
import { startShippingPoller } from './modules/shipping/shipping.poller'
import { startOrderEmailRetrySweep } from './lib/orderEmailRetry'
import { probeResendHealth } from './lib/email'
import { startBlogDraftScheduler } from './modules/blog/blog.scheduler'

const app = express()
const PORT = process.env.PORT ?? 3001

// Cloud Run / Railway terminate TLS at a load balancer and forward the real
// client IP in X-Forwarded-For. Without this, express-rate-limit keys every
// request to the LB IP and the global limit becomes a planet-wide cap.
app.set('trust proxy', 1)

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet())

// ── gzip compression — shrinks JSON payloads (e.g. /api/products) ~70-80%.
// Cloud Run does not auto-compress; this is the single biggest backend win.
// Cast: @types/compression's RequestHandler doesn't perfectly align with the
// installed Express type signature, but the runtime contract is correct.
app.use(compression() as unknown as express.RequestHandler)

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.FRONTEND_URL ?? 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true)
      return cb(new Error(`CORS: origin ${origin} not allowed`))
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Api-Key'],
    // F4b: session cookies must be allowed on cross-origin fetches from the
    // storefront (frontend at www.vamiclubwear.in → backend at
    // api.vamiclubwear.in for any direct call). The exact-origin allowlist
    // above satisfies the spec's requirement that credentialed requests
    // reject `Access-Control-Allow-Origin: *`.
    credentials: true,
  })
)

// ── Rate limiting ─────────────────────────────────────────────────────────────
app.use(
  '/api',
  rateLimit({
    windowMs:       60 * 1000,    // 1 minute
    max:            120,
    standardHeaders: true,
    legacyHeaders:  false,
    message:        { error: 'Too many requests — please slow down' },
  })
)

// ── Body parser ───────────────────────────────────────────────────────────────
// Retain the raw bytes on req.rawBody so webhook routes can verify HMAC
// signatures against the exact payload as signed by the sender (Razorpay
// signs the bytes; re-serialising the parsed JSON would change whitespace
// and break verification).
app.use(express.json({
  limit: '1mb',
  verify: (req, _res, buf) => { (req as any).rawBody = buf },
}))

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'vami-clubwear-backend',
    ts: new Date().toISOString(),
  })
})

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api', apiRoutes)

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' })
})

// ── Global error handler (must be last) ──────────────────────────────────────
app.use(errorHandler as (err: Error, req: Request, res: Response, next: NextFunction) => void)

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, async () => {
  console.log(`\n[server] Vami Clubwear backend → http://localhost:${PORT}`)
  // Keep the admin Category dropdown in sync with the storefront Nav.
  ensureCategories(prisma).catch(() => {})
  // Background poller — flips order shipping status to SHIPPED / IN_TRANSIT /
  // DELIVERED automatically by polling Delhivery, so admins don't have to
  // depend on Delhivery's webhook firing.
  startShippingPoller()

  // Resend smoke-test on boot — surfaces a missing/invalid RESEND_API_KEY in
  // the container logs immediately rather than letting the next checkout be
  // the canary. Non-blocking; just logs the result.
  probeResendHealth()
    .then((r) => {
      if (r.ok) console.log(`[email] Health check OK — ${r.detail}`)
      else      console.error(`[email] Health check FAILED — ${r.detail}. Order confirmations will not be sent until this is fixed.`)
    })
    .catch((err) => console.error('[email] Health check threw:', err))

  // Retry sweep — backfills order confirmations for any order whose initial
  // send didn't make it (Resend down, key wasn't loaded, etc.). Runs once 30s
  // after boot and every 15 min thereafter.
  startOrderEmailRetrySweep()

  // Weekly AI blog draft (opt-in via BLOG_AUTO_DRAFT=true — see blog.scheduler.ts)
  startBlogDraftScheduler()

  console.log('[server] Endpoints:')
  console.log(`  GET  http://localhost:${PORT}/health`)
  console.log(`  *    http://localhost:${PORT}/api/products`)
  console.log(`  *    http://localhost:${PORT}/api/inventory`)
  console.log(`  *    http://localhost:${PORT}/api/orders`)
  console.log(`  POST http://localhost:${PORT}/api/webhooks/pos\n`)
})

export default app
