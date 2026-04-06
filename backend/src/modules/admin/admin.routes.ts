import { Router, Request, Response, NextFunction } from 'express'
import { requireAuth, requireAdmin } from '../../middleware/auth'
import { prisma } from '../../lib/prisma'

const router = Router()

// GET /api/admin/users — list admin users (ADMIN only)
router.get('/users', requireAuth, requireAdmin, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await prisma.adminUser.findMany({
      select: {
        id:          true,
        name:        true,
        email:       true,
        role:        true,
        isActive:    true,
        lastLoginAt: true,
        createdAt:   true,
      },
      orderBy: { createdAt: 'asc' },
    })
    res.json(users)
  } catch (err) {
    next(err)
  }
})

export default router
