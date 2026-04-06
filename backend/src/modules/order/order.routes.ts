import { Router } from 'express'
import { orderController } from './order.controller'
import { validate } from '../../middleware/validateRequest'
import { requireAuth } from '../../middleware/auth'
import { createOrderSchema, updateOrderStatusSchema, listOrdersSchema } from './order.schema'

const router = Router()

// POST /api/orders            [manager] — create order + deduct inventory atomically
// GET  /api/orders            [manager] — paginated order list with status filter
// GET  /api/orders/:id        [manager] — full order detail
// PATCH /api/orders/:id/status [manager] — update order status

router.post(
  '/',
  requireAuth,
  validate(createOrderSchema),
  orderController.createOrder
)

router.get(
  '/',
  requireAuth,
  validate(listOrdersSchema, 'query'),
  orderController.listOrders as any
)

router.get('/:id', requireAuth, orderController.getOrder)

router.patch(
  '/:id/status',
  requireAuth,
  validate(updateOrderStatusSchema),
  orderController.updateStatus
)

export default router
