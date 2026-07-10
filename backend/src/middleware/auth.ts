import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { ForbiddenError } from '../utils/errors'

const JWT_SECRET = process.env.JWT_SECRET ?? 'vami-dev-secret-change-in-production'

// F4b (audit fix): admin session cookie. The token now lives in this
// httpOnly + Secure + SameSite=Lax cookie instead of localStorage, so XSS
// cannot exfiltrate it. Bearer header is still accepted for CI / API-key
// callers and for the transition window while stale clients drop off.
export const ADMIN_COOKIE = 'vami_admin'

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

// Small inline cookie parser — avoids adding cookie-parser as a runtime dep.
export function readCookie(req: Request, name: string): string | null {
  const raw = req.headers.cookie
  if (!raw) return null
  for (const part of raw.split(';')) {
    const eq = part.indexOf('=')
    if (eq < 0) continue
    const k = part.slice(0, eq).trim()
    if (k === name) {
      try { return decodeURIComponent(part.slice(eq + 1).trim()) }
      catch { return part.slice(eq + 1).trim() }
    }
  }
  return null
}

/**
 * Verifies the admin session. Order of precedence:
 *   1. httpOnly cookie (F4b — primary path)
 *   2. Authorization: Bearer <token> (server-to-server, CLI, curl)
 *   3. X-Api-Key (legacy admin/manager API keys)
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  // 1. Cookie
  const cookieToken = readCookie(req, ADMIN_COOKIE)
  if (cookieToken) {
    try {
      req.adminUser = jwt.verify(cookieToken, JWT_SECRET) as AdminTokenPayload
      next()
      return
    } catch {
      // Fall through to Bearer — a stale cookie shouldn't block an API-key call.
    }
  }

  // 2. Bearer header
  const authHeader = req.headers.authorization
  if (authHeader?.startsWith('Bearer ')) {
    try {
      req.adminUser = jwt.verify(authHeader.slice(7), JWT_SECRET) as AdminTokenPayload
      next()
      return
    } catch {
      next(new ForbiddenError('Invalid or expired token'))
      return
    }
  }

  // 3. Fallback: X-Api-Key (kept for backwards compat with existing API client)
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
