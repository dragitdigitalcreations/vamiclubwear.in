/**
 * Public order routes — no authentication required.
 * Used by the storefront checkout. Does NOT expose admin functionality.
 */
import { Router, Request, Response, NextFunction } from 'express'
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
      // Return minimal confirmation — don't expose internal IDs beyond what's needed
      res.status(201).json({
        orderNumber:  order.orderNumber,
        total:        order.total,
        status:       order.status,
        itemCount:    order.items.length,
      })
    } catch (err) { next(err) }
  }
)

export default router
