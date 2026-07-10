import { Router, Request, Response, NextFunction } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import rateLimit from 'express-rate-limit'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma'
import { AppError, ForbiddenError } from '../../utils/errors'
import { requireAuth, ADMIN_COOKIE } from '../../middleware/auth'

// F4b: 7-day admin session cookie. httpOnly blocks XSS from reading the
// token; Secure keeps it off plain HTTP; SameSite=Lax lets top-level
// navigations (post-login redirect) carry it while blocking CSRF from
// arbitrary third parties. Domain is intentionally omitted so the browser
// scopes the cookie to the response host — with the Vercel /api rewrite
// that's the storefront origin (www.vamiclubwear.in), which is exactly
// where the browser will send it back.
const ADMIN_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000

function cookieOpts(maxAge: number) {
  return {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path:     '/',
    maxAge,
  }
}

// Neon auto-pauses on idle and Cloud Run cold-starts spin up fresh Prisma
// clients — the very first DB call in either case can fail with a transient
// connection error. Retry those (and only those) so a sleeping DB doesn't
// surface as a login failure to the admin.
async function withDbRetry<T>(fn: () => Promise<T>, attempts = 3, delayMs = 300): Promise<T> {
  let lastErr: unknown
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn()
    } catch (err) {
      const isTransient =
        err instanceof Prisma.PrismaClientInitializationError ||
        (err instanceof Prisma.PrismaClientKnownRequestError &&
          ['P1001', 'P1002', 'P1008', 'P1017'].includes(err.code))
      if (!isTransient || i === attempts - 1) throw err
      lastErr = err
      await new Promise((r) => setTimeout(r, delayMs * (i + 1)))
    }
  }
  throw lastErr
}

// 5 attempts per 60 seconds per IP
const loginLimiter = rateLimit({
  windowMs:        60 * 1000,
  max:             5,
  standardHeaders: true,
  legacyHeaders:   false,
  message:         { error: 'Too many login attempts. Please wait a minute and try again.' },
})

const router = Router()

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
})

const JWT_SECRET  = process.env.JWT_SECRET ?? 'vami-dev-secret-change-in-production'
const JWT_EXPIRES = '7d'

// POST /api/auth/login
router.post('/login', loginLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = loginSchema.safeParse(req.body)
    if (!parsed.success) {
      throw new AppError(400, 'Email and password are required')
    }

    const { email, password } = parsed.data

    const admin = await withDbRetry(() =>
      prisma.adminUser.findUnique({ where: { email } })
    )
    if (!admin || !admin.isActive) {
      throw new ForbiddenError('Invalid credentials')
    }

    const valid = await bcrypt.compare(password, admin.passwordHash)
    if (!valid) {
      throw new ForbiddenError('Invalid credentials')
    }

    const token = jwt.sign(
      { sub: admin.id, email: admin.email, role: admin.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    )

    // Update last login — also retried because the second DB call is just as
    // exposed to a Neon wake-up failure as the first.
    await withDbRetry(() =>
      prisma.adminUser.update({
        where: { id: admin.id },
        data:  { lastLoginAt: new Date() },
      })
    )

    // F4b: set the httpOnly cookie *and* keep the token in the response body
    // during rollout — any old client still reading token from JSON keeps
    // working, and any new client just relies on the cookie the browser
    // now stores. Once every deployed frontend is on the cookie path the
    // token field can be dropped.
    res.cookie(ADMIN_COOKIE, token, cookieOpts(ADMIN_COOKIE_MAX_AGE))

    res.json({
      token,
      user: {
        id:    admin.id,
        name:  admin.name,
        email: admin.email,
        role:  admin.role,
      },
    })
  } catch (err) {
    next(err)
  }
})

// GET /api/auth/me — verify token + return normalised user shape
router.get('/me', requireAuth, (req: Request, res: Response) => {
  const payload = req.adminUser!
  res.json({
    user: {
      id:    payload.sub,
      email: payload.email,
      role:  payload.role,
    },
  })
})

// PATCH /api/auth/change-password — authenticated user changes own password
router.patch('/change-password', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      currentPassword: z.string().min(1),
      newPassword:     z.string().min(8, 'New password must be at least 8 characters'),
    })
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) {
      throw new AppError(400, parsed.error.errors[0].message)
    }

    const { currentPassword, newPassword } = parsed.data
    const admin = await prisma.adminUser.findUnique({ where: { id: req.adminUser!.sub } })
    if (!admin) throw new AppError(404, 'User not found')

    const valid = await bcrypt.compare(currentPassword, admin.passwordHash)
    if (!valid) throw new AppError(400, 'Current password is incorrect')

    const hash = await bcrypt.hash(newPassword, 12)
    await prisma.adminUser.update({ where: { id: admin.id }, data: { passwordHash: hash } })

    res.json({ ok: true, message: 'Password updated successfully' })
  } catch (err) {
    next(err)
  }
})

// POST /api/auth/logout — clear the httpOnly cookie. Also a no-op for
// stateless JWTs, but the cookie clear is what actually ends the session
// for cookie-based clients.
router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie(ADMIN_COOKIE, { path: '/' })
  res.json({ ok: true })
})

export default router
