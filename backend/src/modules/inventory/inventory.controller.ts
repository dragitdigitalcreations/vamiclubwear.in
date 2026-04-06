import { Request, Response, NextFunction } from 'express'
import { inventoryService } from './inventory.service'
import { SetInventoryInput, AdjustInventoryInput, CreateLocationInput } from './inventory.schema'

export const inventoryController = {

  createLocation: async (
    req: Request<{}, {}, CreateLocationInput>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const location = await inventoryService.createLocation(req.body)
      res.status(201).json(location)
    } catch (err) { next(err) }
  },

  listLocations: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const locations = await inventoryService.listLocations()
      res.json(locations)
    } catch (err) { next(err) }
  },

  listAll: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page  = Math.max(1, Number(req.query.page  ?? 1))
      const limit = Math.min(100, Number(req.query.limit ?? 50))
      const result = await inventoryService.listAll(page, limit)
      res.json(result)
    } catch (err) { next(err) }
  },

  search: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const q     = String(req.query.q ?? '').trim()
      const limit = Math.min(50, Number(req.query.limit ?? 20))
      const rows  = await inventoryService.search(q, limit)
      res.json(rows)
    } catch (err) { next(err) }
  },

  listHistory: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const variantId = req.query.variantId ? String(req.query.variantId) : undefined
      const page      = Math.max(1, Number(req.query.page ?? 1))
      const limit     = Math.min(100, Number(req.query.limit ?? 50))
      const result    = await inventoryService.listHistory(variantId, page, limit)
      res.json(result)
    } catch (err) { next(err) }
  },

  getByVariant: async (
    req: Request<{ variantId: string }>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const rows = await inventoryService.getByVariant(req.params.variantId)
      res.json(rows)
    } catch (err) { next(err) }
  },

  setQuantity: async (
    req: Request<{ variantId: string }, {}, SetInventoryInput>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const performedBy = req.adminUser?.email ?? 'admin'
      const row = await inventoryService.setQuantity(req.params.variantId, req.body, performedBy)
      res.json(row)
    } catch (err) { next(err) }
  },

  syncAll: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const count = await inventoryService.markAllSynced()
      res.json({ synced: count, syncedAt: new Date().toISOString() })
    } catch (err) { next(err) }
  },

  adjustQuantity: async (
    req: Request<{ variantId: string }, {}, AdjustInventoryInput>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const performedBy = req.adminUser?.email ?? 'admin'
      await inventoryService.adjustQuantity(req.params.variantId, req.body, 3, performedBy)
      res.json({ success: true })
    } catch (err) { next(err) }
  },
}
