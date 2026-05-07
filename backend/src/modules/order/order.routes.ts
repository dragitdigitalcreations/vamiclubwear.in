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

// PATCH /api/orders/:id/pickup [manager] — advance store-pickup workflow
//   body: { stage: 'READY' | 'PICKED_UP' }
router.patch('/:id/pickup', requireAuth, orderController.updatePickup)

// POST /api/orders/:id/resend-confirmation [manager] — recovery button:
// re-send the customer order confirmation if Resend dropped the original.
router.post('/:id/resend-confirmation', requireAuth, orderController.resendConfirmation)

// POST /api/orders/:id/resend-delivery [manager] — re-send the delivery
// confirmation. Works for both DELIVERY (post-courier) and PICKUP (post-pickup) orders.
router.post('/:id/resend-delivery', requireAuth, orderController.resendDelivery)

// POST /api/orders/:id/resend-pickup-ready [manager] — re-send the "ready to
// collect" email. Pickup-only.
router.post('/:id/resend-pickup-ready', requireAuth, orderController.resendPickupReady)

export default router
