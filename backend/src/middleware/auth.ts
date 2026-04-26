import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { ForbiddenError } from '../utils/errors'

const JWT_SECRET = process.env.JWT_SECRET ?? 'vami-dev-secret-change-in-production'

export interface AdminTokenPayload {
  sub:   string
  email: string
  role:  'ADMIN' | 'MANAGER' | 'STAFF'
}

// Extends Express Request with decoded admin user
declare global {
  namespace Express {
    interface Request {
      adminUser?: AdminTokenPayload
    }
  }
}

/**
 * Verifies the Authorization: Bearer <token> header.
 * Falls back to X-Api-Key for backwards compatibility.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  // 1. Try JWT Bearer token
  const authHeader = req.headers.authorization
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    try {
      const payload = jwt.verify(token, JWT_SECRET) as AdminTokenPayload
      req.adminUser = payload
      next()
      return
    } catch {
      next(new ForbiddenError('Invalid or expired token'))
      return
    }
  }

  // 2. Fallback: X-Api-Key (kept for backwards compat with existing API client)
  const apiKey = req.headers['x-api-key']
  const adminKey = process.env.ADMIN_API_KEY
  const managerKey = process.env.MANAGER_API_KEY

  if (apiKey && adminKey && apiKey === adminKey) {
    req.adminUser = { sub: 'api-key-admin', email: 'api@vami.in', role: 'ADMIN' }
    next()
    return
  }
  if (apiKey && managerKey && apiKey === managerKey) {
    req.adminUser = { sub: 'api-key-manager', email: 'manager@vami.in', role: 'MANAGER' }
    next()
    return
  }

  next(new ForbiddenError('Authentication required'))
}

/**
 * Requires ADMIN role. Must be used after requireAuth.
 */
export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (req.adminUser?.role !== 'ADMIN') {
    next(new ForbiddenError('Admin access required'))
    return
  }
  next()
}
