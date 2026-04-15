import { Router, Request, Response, NextFunction } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { requireAuth, requireAdmin } from '../../middleware/auth'
import { prisma } from '../../lib/prisma'
import { Resend } from 'resend'
import { sendAdminInvite } from '../../lib/email'

const router = Router()

// ── GET /api/admin/test-email — smoke-test Resend config ─────────────────────
router.get('/test-email', async (_req: Request, res: Response) => {
  const key = process.env.RESEND_API_KEY
  if (!key) {
    res.status(500).json({ ok: false, error: 'RESEND_API_KEY not set in environment' })
    return
  }
  try {
    const resend = new Resend(key)
    const from   = process.env.RESEND_FROM ?? 'Vami Clubwear <orders@vamiclubwear.in>'
    const to     = process.env.STORE_EMAIL ?? 'vamiclubwear@gmail.com'
    await resend.emails.send({
      from,
      to,
      subject: 'Vami Clubwear — Email test ✓',
      text:    'Resend is working. Order, shipment and delivery emails are live.',
    })
    res.json({ ok: true, message: `Test email sent to ${to}` })
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message ?? String(err) })
  }
})

// ── GET /api/admin/users — list admin users (ADMIN only) ─────────────────────
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

// ── POST /api/admin/users — create a new admin user (ADMIN only) ─────────────
const createUserSchema = z.object({
  name:  z.string().min(2).max(100),
  email: z.string().email(),
  role:  z.enum(['ADMIN', 'MANAGER']).default('MANAGER'),
})

router.post('/users', requireAuth, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createUserSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0]?.message ?? 'Invalid input' })
      return
    }
    const { name, email, role } = parsed.data

    const exists = await prisma.adminUser.findUnique({ where: { email } })
    if (exists) {
      res.status(409).json({ error: 'A user with this email already exists' })
      return
    }

    // Generate a random 12-char temporary password
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
    const tempPass = Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')

    const hash = await bcrypt.hash(tempPass, 12)
    const user = await prisma.adminUser.create({
      data: { name, email, passwordHash: hash, role, isActive: true },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    })

    // Send invite email (fire-and-forget)
    const loginUrl = `${process.env.FRONTEND_URL ?? 'https://vamiclubwear.in'}/admin/login`
    sendAdminInvite({ to: email, name, role, tempPass, loginUrl })
      .catch((err) => console.error('[email] Failed to send invite:', err))

    res.status(201).json({ user, tempPass })
  } catch (err) {
    next(err)
  }
})

// ── PATCH /api/admin/users/:id — update role or active status (ADMIN only) ───
const updateUserSchema = z.object({
  role:     z.enum(['ADMIN', 'MANAGER']).optional(),
  isActive: z.boolean().optional(),
  name:     z.string().min(2).max(100).optional(),
})

router.patch('/users/:id', requireAuth, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = updateUserSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0]?.message ?? 'Invalid input' })
      return
    }

    const user = await prisma.adminUser.update({
      where: { id: req.params.id },
      data:  parsed.data,
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    })
    res.json(user)
  } catch (err) {
    next(err)
  }
})

// ── DELETE /api/admin/users/:id — deactivate (soft-delete) user (ADMIN only) ─
router.delete('/users/:id', requireAuth, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Prevent self-deletion
    const currentUser = (req as any).adminUser
    if (currentUser?.sub === req.params.id) {
      res.status(400).json({ error: 'Cannot deactivate your own account' })
      return
    }
    await prisma.adminUser.update({
      where: { id: req.params.id },
      data:  { isActive: false },
    })
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

export default router
