import { Router, Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { prisma } from '../../lib/prisma'
import { AppError, ForbiddenError } from '../../utils/errors'
import { requireCustomer, CUSTOMER_COOKIE } from '../../middleware/customerAuth'

const CUSTOMER_COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000  // matches JWT 30d expiry

function cookieOpts() {
  return {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path:     '/',
    maxAge:   CUSTOMER_COOKIE_MAX_AGE,
  }
}

const router = Router()

const JWT_SECRET  = process.env.JWT_SECRET ?? 'vami-dev-secret-change-in-production'
const JWT_EXPIRES = '30d'
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? ''

const googleSchema = z.object({
  credential: z.string().min(10),
})

interface GoogleTokenInfo {
  iss?:   string
  aud?:   string
  sub?:   string
  email?: string
  email_verified?: string | boolean
  name?:  string
  picture?: string
  exp?:   string
  error?: string
}

async function verifyGoogleToken(idToken: string): Promise<GoogleTokenInfo> {
  const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
  const res = await fetch(url)
  if (!res.ok) throw new AppError(401, 'Google token verification failed')
  const data = (await res.json()) as GoogleTokenInfo
  if (data.error) throw new AppError(401, 'Invalid Google token')
  const issuerOk = data.iss === 'accounts.google.com' || data.iss === 'https://accounts.google.com'
  if (!issuerOk) throw new AppError(401, 'Invalid token issuer')
  if (GOOGLE_CLIENT_ID && data.aud !== GOOGLE_CLIENT_ID) {
    throw new AppError(401, 'Token audience mismatch')
  }
  if (data.exp && Number(data.exp) * 1000 < Date.now()) {
    throw new AppError(401, 'Google token expired')
  }
  const verified = data.email_verified === true || data.email_verified === 'true'
  if (!verified) throw new AppError(401, 'Email not verified')
  if (!data.sub || !data.email) throw new AppError(401, 'Incomplete Google profile')
  return data
}

// POST /api/customer/google — sign in / sign up via Google credential
router.post('/google', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = googleSchema.safeParse(req.body)
    if (!parsed.success) throw new AppError(400, 'Credential required')

    const info  = await verifyGoogleToken(parsed.data.credential)
    const email = info.email!.toLowerCase().trim()

    const customer = await prisma.customer.upsert({
      where:  { googleId: info.sub! },
      update: {
        email,
        name: info.name ?? email.split('@')[0],
        picture: info.picture ?? null,
        lastLoginAt: new Date(),
      },
      create: {
        googleId: info.sub!,
        email,
        name: info.name ?? email.split('@')[0],
        picture: info.picture ?? null,
        lastLoginAt: new Date(),
      },
    })

    const token = jwt.sign(
      { sub: customer.id, email: customer.email, kind: 'customer' },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES },
    )

    // F4b: httpOnly session cookie. Token also returned in the JSON body
    // during rollout so any not-yet-updated frontend build still functions.
    res.cookie(CUSTOMER_COOKIE, token, cookieOpts())

    res.json({
      token,
      user: {
        id:      customer.id,
        email:   customer.email,
        name:    customer.name,
        picture: customer.picture,
      },
    })
  } catch (err) { next(err) }
})

// POST /api/customer/logout — clears the F4b session cookie.
router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie(CUSTOMER_COOKIE, { path: '/' })
  res.json({ ok: true })
})

// GET /api/customer/me
router.get('/me', requireCustomer, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const c = await prisma.customer.findUnique({ where: { id: req.customer!.sub } })
    if (!c) throw new ForbiddenError('Account not found')
    res.json({
      user: { id: c.id, email: c.email, name: c.name, picture: c.picture },
    })
  } catch (err) { next(err) }
})

// GET /api/customer/orders — orders placed under this customer's email
router.get('/orders', requireCustomer, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const email = req.customer!.email
    const orders = await prisma.order.findMany({
      where: { customerEmail: email },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        items: {
          include: {
            variant: {
              include: { product: { select: { name: true, slug: true } } },
            },
          },
        },
      },
    })
    res.json({ orders, count: orders.length })
  } catch (err) { next(err) }
})

export default router
