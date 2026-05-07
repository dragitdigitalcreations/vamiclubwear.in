import { Router, Request, Response, NextFunction } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { requireAuth, requireAdmin } from '../../middleware/auth'
import { prisma } from '../../lib/prisma'
import { Resend } from 'resend'
import { sendAdminInvite } from '../../lib/email'
import { probeResendHealth } from '../../lib/email'
import { retryFailedOrderEmails } from '../../lib/orderEmailRetry'

const router = Router()

// ── GET /api/admin/test-email — smoke-test Resend config ─────────────────────
// Reports the read-only health probe (does the key work? is the from-domain
// verified?) and then attempts an actual send to STORE_EMAIL. Both results are
// returned so the admin sees *exactly* where the pipeline breaks.
router.get('/test-email', async (_req: Request, res: Response) => {
  const key = process.env.RESEND_API_KEY
  if (!key) {
    res.status(500).json({ ok: false, error: 'RESEND_API_KEY not set in environment' })
    return
  }
  const fromAddr = process.env.RESEND_FROM ?? 'Vami Clubwear <orders@vamiclubwear.in>'
  const to       = process.env.STORE_EMAIL ?? 'vamiclubwear@gmail.com'

  const health = await probeResendHealth()

  try {
    const resend = new Resend(key)
    const result = await resend.emails.send({
      from:    fromAddr,
      to,
      subject: 'Vami Clubwear — Email test ✓',
      text:    'Resend is working. Order, shipment and delivery emails are live.',
    })
    if ((result as any)?.error) {
      const e = (result as any).error
      res.status(502).json({
        ok: false,
        health,
        from: fromAddr,
        to,
        error: e?.message ?? JSON.stringify(e),
        hint:  'Most common cause: the from-domain is not verified in Resend. Verify vamiclubwear.in (or change RESEND_FROM to a verified address).',
      })
      return
    }
    res.json({ ok: true, health, from: fromAddr, to, message: `Test email sent to ${to}`, id: (result as any)?.data?.id ?? null })
  } catch (err: any) {
    res.status(500).json({ ok: false, health, from: fromAddr, to, error: err.message ?? String(err) })
  }
})

// ── POST /api/admin/email-retry-sweep — manual trigger for the retry sweep ───
// One-click "resend any orders whose confirmation didn't go out." Used after
// fixing a Resend config issue (verifying the domain, swapping the key) so the
// admin doesn't have to wait up to 15 min for the next scheduled sweep.
router.post('/email-retry-sweep', requireAuth, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await retryFailedOrderEmails()
    res.json(result)
  } catch (err) { next(err) }
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
  role:  z.enum(['ADMIN', 'MANAGER', 'STAFF']).default('MANAGER'),
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
  role:     z.enum(['ADMIN', 'MANAGER', 'STAFF']).optional(),
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

// ── DELETE /api/admin/users/:id — permanently remove an admin user (ADMIN only)
// AdminUser has no inbound FKs (audit trails store performedBy as a free-text
// email string), so a hard delete is safe. Self-delete is blocked so the last
// active admin can't accidentally lock everyone out of the panel.
router.delete('/users/:id', requireAuth, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = (req as any).adminUser
    if (currentUser?.sub === req.params.id) {
      res.status(400).json({ error: 'You cannot delete your own account' })
      return
    }

    const target = await prisma.adminUser.findUnique({
      where:  { id: req.params.id },
      select: { id: true, role: true },
    })
    if (!target) {
      res.status(404).json({ error: 'User not found' })
      return
    }

    // Refuse to delete the last remaining active ADMIN — locking everyone out
    // of /admin/users would require manual DB intervention to recover.
    if (target.role === 'ADMIN') {
      const remainingAdmins = await prisma.adminUser.count({
        where: { role: 'ADMIN', isActive: true, id: { not: target.id } },
      })
      if (remainingAdmins === 0) {
        res.status(400).json({ error: 'Cannot delete the last active admin account' })
        return
      }
    }

    await prisma.adminUser.delete({ where: { id: target.id } })
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

export default router
