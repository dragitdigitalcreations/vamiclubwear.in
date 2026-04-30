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
}
