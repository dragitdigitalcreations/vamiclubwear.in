import { Router, Request, Response, NextFunction } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import rateLimit from 'express-rate-limit'
import { z } from 'zod'
import { prisma } from '../../lib/prisma'
import { AppError, ForbiddenError } from '../../utils/errors'
import { requireAuth } from '../../middleware/auth'

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

    const admin = await prisma.adminUser.findUnique({ where: { email } })
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

    // Update last login
    await prisma.adminUser.update({
      where: { id: admin.id },
      data:  { lastLoginAt: new Date() },
    })

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

// POST /api/auth/logout — client drops token; this is a no-op on the server
// (stateless JWT — add a deny-list here if needed)
router.post('/logout', (_req: Request, res: Response) => {
  res.json({ ok: true })
})

export default router
