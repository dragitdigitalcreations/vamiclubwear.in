/**
 * Public order routes — no authentication required.
 * Used by the storefront checkout and customer order history.
 */
import { Router, Request, Response, NextFunction } from 'express'
import { prisma } from '../../lib/prisma'
import { orderService } from './order.service'
import { validate } from '../../middleware/validateRequest'
import { createOrderSchema } from './order.schema'

const router = Router()

// POST /api/public/orders — customer checkout (no JWT required)
router.post(
  '/orders',
  validate(createOrderSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const order = await orderService.createOrder(req.body)
      res.status(201).json({
        orderNumber:  order.orderNumber,
        total:        order.total,
        status:       order.status,
        itemCount:    order.items.length,
      })
    } catch (err) { next(err) }
  }
)

// GET /api/public/orders/lookup?phone=xxx  — customer order history by phone
// GET /api/public/orders/lookup?email=xxx  — customer order history by email
router.get('/orders/lookup', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phone, email } = req.query as { phone?: string; email?: string }

    if (!phone && !email) {
      res.status(400).json({ error: 'Provide phone or email to look up orders' })
      return
    }

    // Minimum length to prevent fishing for orders by single digits
    const lookup = phone ?? email ?? ''
    if (lookup.replace(/\D/g, '').length < 6 && !lookup.includes('@')) {
      res.status(400).json({ error: 'Provide a valid phone or email' })
      return
    }

    const orders = await prisma.order.findMany({
      where: {
        OR: [
          phone ? { customerPhone: { contains: phone.replace(/\D/g, ''), } } : {},
          email ? { customerEmail: { equals: email.toLowerCase(), mode: 'insensitive' as const } } : {},
        ].filter(o => Object.keys(o).length > 0),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        orderNumber:    true,
        status:         true,
        shippingStatus: true,
        awbNumber:      true,
        trackingUrl:    true,
        total:          true,
        createdAt:      true,
        customerName:   true,
        items: {
          select: {
            quantity: true,
            unitPrice: true,
            variant: {
              select: {
                sku: true,
                size: true,
                color: true,
                product: { select: { name: true, slug: true } },
              },
            },
          },
        },
      },
    })

    res.json({ orders, count: orders.length })
  } catch (err) { next(err) }
})

// GET /api/public/orders/:orderNumber — single order detail by order number
router.get('/orders/:orderNumber', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const order = await prisma.order.findUnique({
      where: { orderNumber: req.params.orderNumber },
      select: {
        orderNumber:     true,
        status:          true,
        paymentStatus:   true,
        shippingStatus:  true,
        awbNumber:       true,
        trackingUrl:     true,
        total:           true,
        createdAt:       true,
        customerName:    true,
        customerEmail:   true,
        customerPhone:   true,
        shippingAddress: true,
        shippingCity:    true,
        shippingState:   true,
        shippingPincode: true,
        notes:           true,
        items: {
          select: {
            quantity:  true,
            unitPrice: true,
            variant: {
              select: {
                sku:   true,
                size:  true,
                color: true,
                product: { select: { name: true, slug: true } },
              },
            },
          },
        },
      },
    })

    if (!order) { res.status(404).json({ error: 'Order not found' }); return }
    res.json(order)
  } catch (err) { next(err) }
})

export default router
