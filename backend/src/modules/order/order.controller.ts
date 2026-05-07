import { Request, Response, NextFunction } from 'express'
import { orderService } from './order.service'
import { CreateOrderInput, UpdateOrderStatusInput, ListOrdersQuery } from './order.schema'

export const orderController = {

  createOrder: async (
    req: Request<{}, {}, CreateOrderInput>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const order = await orderService.createOrder(req.body)
      res.status(201).json(order)
    } catch (err) { next(err) }
  },

  listOrders: async (
    req: Request<{}, {}, {}, ListOrdersQuery>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const result = await orderService.listOrders(req.query)
      res.json(result)
    } catch (err) { next(err) }
  },

  getOrder: async (
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const order = await orderService.getOrderById(req.params.id)
      res.json(order)
    } catch (err) { next(err) }
  },

  updateStatus: async (
    req: Request<{ id: string }, {}, UpdateOrderStatusInput>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const order = await orderService.updateStatus(req.params.id, req.body)
      res.json(order)
    } catch (err) { next(err) }
  },

  updatePickup: async (
    req: Request<{ id: string }, {}, { stage: 'READY' | 'PICKED_UP' }>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const stage = req.body?.stage
      if (stage !== 'READY' && stage !== 'PICKED_UP') {
        res.status(400).json({ error: 'stage must be READY or PICKED_UP' })
        return
      }
      const order = await orderService.updatePickupStage(req.params.id, stage)
      res.json(order)
    } catch (err) { next(err) }
  },

  // POST /api/orders/:id/resend-confirmation — re-send the customer order
  // confirmation email. Surfaces the Resend error verbatim on failure so the
  // admin can see *why* (unverified domain, missing key, etc.) rather than
  // just "send failed."
  resendConfirmation: async (
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { result, sentTo } = await orderService.resendOrderConfirmation(req.params.id)
      if (!result.ok) {
        res.status(502).json({ ok: false, error: result.error, sentTo })
        return
      }
      res.json({ ok: true, sentTo })
    } catch (err) { next(err) }
  },

  // POST /api/orders/:id/resend-delivery — re-send the delivery confirmation.
  // Useful when the courier-driven email failed (Resend down at the moment
  // Delhivery flipped to DELIVERED) or the customer never received it.
  resendDelivery: async (
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { result, sentTo } = await orderService.resendDeliveryEmail(req.params.id)
      if (!result.ok) {
        res.status(502).json({ ok: false, error: result.error, sentTo })
        return
      }
      res.json({ ok: true, sentTo })
    } catch (err) { next(err) }
  },

  // POST /api/orders/:id/resend-pickup-ready — re-send "your order is ready
  // to collect" for store-pickup orders.
  resendPickupReady: async (
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { result, sentTo } = await orderService.resendPickupReadyEmail(req.params.id)
      if (!result.ok) {
        res.status(502).json({ ok: false, error: result.error, sentTo })
        return
      }
      res.json({ ok: true, sentTo })
    } catch (err) { next(err) }
  },
}
