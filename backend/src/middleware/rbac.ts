import { Request, Response, NextFunction } from 'express'
import { ForbiddenError } from '../utils/errors'

// Foundation RBAC — API key based.
// Replace with JWT verification in the auth module when auth is implemented.
//
// Roles:
//   admin   — full access (ADMIN_API_KEY)
//   manager — product + inventory + orders (MANAGER_API_KEY)
//
// Set these in backend/.env.local:
//   ADMIN_API_KEY=your-secret-admin-key
//   MANAGER_API_KEY=your-secret-manager-key

export type Role = 'admin' | 'manager'

const ROLE_KEYS: Record<Role, string | undefined> = {
  admin:   process.env.ADMIN_API_KEY,
  manager: process.env.MANAGER_API_KEY,
}

/**
 * Requires the caller to supply a valid X-Api-Key header for the given role.
 * Admin key satisfies any role requirement (super-set).
 */
export function requireRole(minRole: Role) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const provided = req.headers['x-api-key']

    if (!provided) {
      next(new ForbiddenError('X-Api-Key header is required'))
      return
    }

    const adminKey   = ROLE_KEYS.admin
    const managerKey = ROLE_KEYS.manager

    const isAdmin   = adminKey   && provided === adminKey
    const isManager = managerKey && provided === managerKey

    if (minRole === 'admin' && isAdmin) { next(); return }
    if (minRole === 'manager' && (isAdmin || isManager)) { next(); return }

    // Keys not configured — warn in dev, deny in prod
    if (process.env.NODE_ENV !== 'production' && !adminKey) {
      console.warn('[rbac] ADMIN_API_KEY not set — allowing request in development mode')
      next()
      return
    }

    next(new ForbiddenError('Insufficient permissions'))
  }
}
