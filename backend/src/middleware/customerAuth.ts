import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { ForbiddenError } from '../utils/errors'
import { readCookie } from './auth'

const JWT_SECRET = process.env.JWT_SECRET ?? 'vami-dev-secret-change-in-production'

// F4b: customer session cookie (httpOnly, Secure, SameSite=Lax). Replaces
// the previous localStorage-based bearer token; Bearer is still accepted so
// server-to-server callers or old browser tabs don't hard-fail during rollout.
export const CUSTOMER_COOKIE = 'vami_customer'

export interface CustomerTokenPayload {
  sub:   string      // customer.id
  email: string
  kind:  'customer'
}

declare global {
  namespace Express {
    interface Request {
      customer?: CustomerTokenPayload
    }
  }
}

export function requireCustomer(req: Request, _res: Response, next: NextFunction): void {
  // 1. httpOnly cookie (F4b primary path)
  const cookieToken = readCookie(req, CUSTOMER_COOKIE)
  if (cookieToken) {
    try {
      const payload = jwt.verify(cookieToken, JWT_SECRET) as CustomerTokenPayload
      if (payload.kind === 'customer') {
        req.customer = payload
        next()
        return
      }
    } catch {
      // Stale cookie — fall through to Bearer so a server-to-server caller
      // with a fresh token still works.
    }
  }

  // 2. Bearer header — legacy path
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    next(new ForbiddenError('Authentication required'))
    return
  }
  try {
    const payload = jwt.verify(authHeader.slice(7), JWT_SECRET) as CustomerTokenPayload
    if (payload.kind !== 'customer') {
      next(new ForbiddenError('Invalid token'))
      return
    }
    req.customer = payload
    next()
  } catch {
    next(new ForbiddenError('Invalid or expired token'))
  }
}
