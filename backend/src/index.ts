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

const app = express()
const PORT = process.env.PORT ?? 3001

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
app.use(express.json({ limit: '1mb' }))

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
  console.log('[server] Endpoints:')
  console.log(`  GET  http://localhost:${PORT}/health`)
  console.log(`  *    http://localhost:${PORT}/api/products`)
  console.log(`  *    http://localhost:${PORT}/api/inventory`)
  console.log(`  *    http://localhost:${PORT}/api/orders`)
  console.log(`  POST http://localhost:${PORT}/api/webhooks/pos\n`)
})

export default app
