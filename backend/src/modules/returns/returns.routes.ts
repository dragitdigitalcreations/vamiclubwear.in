import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../../lib/prisma'
import { requireAuth } from '../../middleware/auth'

const router = Router()

const submitSchema = z.object({
  orderNumber:   z.string().min(1).max(50),
  customerName:  z.string().min(1).max(150),
  customerEmail: z.string().email().max(200),
  customerPhone: z.string().min(1).max(20),
  description:   z.string().min(10).max(2000),
})

const updateSchema = z.object({
  status:    z.enum(['PENDING','UNDER_REVIEW','APPROVED','REJECTED','RESOLVED']),
  adminNote: z.string().max(2000).optional(),
})

// ── POST /api/returns — public, customer submits ──────────────────────────────
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = submitSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0]?.message ?? 'Invalid input' })
      return
    }
    const data = parsed.data

    // Guard 1: order number must exist in the system.
    const order = await prisma.order.findUnique({
      where:  { orderNumber: data.orderNumber.trim() },
      select: { orderNumber: true, customerEmail: true, customerPhone: true, status: true },
    })
    if (!order) {
      res.status(404).json({ error: `Order number "${data.orderNumber}" not found. Please check your order confirmation email.` })
      return
    }

    // Guard 2: requester must match the buyer on file (email OR phone digits).
    const normalisedPhone = (p?: string | null) => (p ?? '').replace(/\D/g, '')
    const emailMatches = order.customerEmail && order.customerEmail.toLowerCase() === data.customerEmail.toLowerCase()
    const phoneMatches = order.customerPhone && normalisedPhone(order.customerPhone) === normalisedPhone(data.customerPhone)
    if (!emailMatches && !phoneMatches) {
      res.status(403).json({ error: 'The email or phone you entered does not match the contact details on this order.' })
      return
    }

    // Guard 3: one open request per order to prevent spam.
    const pending = await prisma.returnRequest.findFirst({
      where: {
        orderNumber: order.orderNumber,
        status:      { in: ['PENDING', 'UNDER_REVIEW'] },
      },
      select: { id: true },
    })
    if (pending) {
      res.status(409).json({ error: 'A return request for this order is already under review. Please wait for our team to reach out.' })
      return
    }

    const request = await prisma.returnRequest.create({
      data: { ...data, orderNumber: order.orderNumber, reason: 'damaged' },
    })
    res.status(201).json({ id: request.id, status: request.status })
  } catch (err) { next(err) }
})

// ── GET /api/returns — admin: list all ───────────────────────────────────────
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = req.query.status as string | undefined
    const page   = Math.max(1, parseInt(req.query.page as string) || 1)
    const limit  = Math.min(50, parseInt(req.query.limit as string) || 20)
    const skip   = (page - 1) * limit

    const where = status ? { status: status as any } : {}
    const [data, total] = await Promise.all([
      prisma.returnRequest.findMany({
        where, orderBy: { createdAt: 'desc' }, skip, take: limit,
      }),
      prisma.returnRequest.count({ where }),
    ])
    res.json({ data, total, page, pages: Math.ceil(total / limit) })
  } catch (err) { next(err) }
})

// ── GET /api/returns/:id — admin: single ─────────────────────────────────────
router.get('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const r = await prisma.returnRequest.findUnique({ where: { id: req.params.id } })
    if (!r) { res.status(404).json({ error: 'Not found' }); return }
    res.json(r)
  } catch (err) { next(err) }
})

// ── PATCH /api/returns/:id — admin: update status ────────────────────────────
router.patch('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = updateSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0]?.message ?? 'Invalid input' })
      return
    }
    const admin = (req as any).user?.email ?? 'admin'
    const r = await prisma.returnRequest.update({
      where: { id: req.params.id },
      data: { ...parsed.data, resolvedBy: admin },
    })
    res.json(r)
  } catch (err) { next(err) }
})

export default router
