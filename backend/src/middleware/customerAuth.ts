import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { ForbiddenError } from '../utils/errors'

const JWT_SECRET = process.env.JWT_SECRET ?? 'vami-dev-secret-change-in-production'

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
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    next(new ForbiddenError('Authentication required'))
    return
  }
  const token = authHeader.slice(7)
  try {
    const payload = jwt.verify(token, JWT_SECRET) as CustomerTokenPayload
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
