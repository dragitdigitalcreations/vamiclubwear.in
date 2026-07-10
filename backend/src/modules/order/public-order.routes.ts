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



// GET /api/public/orders/:orderNumber — single order detail by order number
// Requires email or phoneLast4 as a second factor for security
router.get('/orders/:orderNumber', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, phoneLast4 } = req.query as { email?: string; phoneLast4?: string }

    if (!email && !phoneLast4) {
      res.status(400).json({ error: 'Verification required: provide email or phoneLast4' })
      return
    }

    const order = await prisma.order.findUnique({
      where: { orderNumber: req.params.orderNumber },
      select: {
        orderNumber:     true,
        status:          true,
        paymentStatus:   true,
        shippingStatus:  true,
        fulfillmentType: true,
        pickupReadyAt:   true,
        pickedUpAt:      true,
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

    if (!order) {
      res.status(404).json({ error: 'Order not found' })
      return
    }

    const isValidEmail = email && order.customerEmail?.toLowerCase() === email.toLowerCase()
    const isValidPhone = phoneLast4 && order.customerPhone?.slice(-4) === phoneLast4
    
    if (!isValidEmail && !isValidPhone) {
      // Return 404 to avoid distinguishing between "wrong order" and "wrong verifier"
      res.status(404).json({ error: 'Order not found' })
      return
    }

    res.json(order)
  } catch (err) { next(err) }
})

export default router
