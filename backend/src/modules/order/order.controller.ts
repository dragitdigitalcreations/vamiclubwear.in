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
}
