import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../../lib/prisma'
import { requireAuth } from '../../middleware/auth'

const router = Router()

const submitSchema = z.object({
  customerName: z.string().min(1).max(120),
  email:        z.string().email().max(200),
  body:         z.string().min(4).max(600),
})

// ── GET /api/reviews — public, approved reviews for storefront carousel ──────
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const reviews = await prisma.customerReview.findMany({
      where: { isApproved: true },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: { id: true, customerName: true, body: true, createdAt: true },
    })
    res.json({ data: reviews })
  } catch (err) { next(err) }
})

// ── POST /api/reviews — public, one per email ────────────────────────────────
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = submitSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0]?.message ?? 'Invalid input' })
      return
    }
    const { customerName, email, body } = parsed.data
    const normalizedEmail = email.trim().toLowerCase()

    const existing = await prisma.customerReview.findUnique({ where: { email: normalizedEmail } })
    if (existing) {
      res.status(409).json({ error: 'A review from this email already exists.' })
      return
    }

    const review = await prisma.customerReview.create({
      data: {
        customerName: customerName.trim(),
        email: normalizedEmail,
        body: body.trim(),
      },
      select: { id: true, customerName: true, body: true, createdAt: true },
    })
    res.status(201).json(review)
  } catch (err) { next(err) }
})

// ── GET /api/reviews/admin — admin list (all, incl. unapproved) ──────────────
router.get('/admin', requireAuth, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const reviews = await prisma.customerReview.findMany({
      orderBy: { createdAt: 'desc' },
    })
    res.json({ data: reviews })
  } catch (err) { next(err) }
})

// ── PATCH /api/reviews/:id — admin toggle approval ───────────────────────────
router.patch('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const isApproved = Boolean(req.body?.isApproved)
    const updated = await prisma.customerReview.update({
      where: { id: req.params.id },
      data: { isApproved },
    })
    res.json(updated)
  } catch (err) { next(err) }
})

// ── DELETE /api/reviews/:id — admin ──────────────────────────────────────────
router.delete('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.customerReview.delete({ where: { id: req.params.id } })
    res.status(204).end()
  } catch (err) { next(err) }
})

export default router
