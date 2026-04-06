import { Router, Request, Response, NextFunction } from 'express'
import { inventoryController } from './inventory.controller'
import { validate } from '../../middleware/validateRequest'
import { requireAuth } from '../../middleware/auth'
import { prisma } from '../../lib/prisma'
import {
  setInventorySchema,
  adjustInventorySchema,
  createLocationSchema,
} from './inventory.schema'

const router = Router()

// ── Locations ──────────────────────────────────────────────────────────────
// GET  /api/inventory/locations
// POST /api/inventory/locations   [admin]

router.get('/locations', inventoryController.listLocations)
router.post(
  '/locations',
  requireAuth,
  validate(createLocationSchema),
  inventoryController.createLocation
)

// ── Inventory ──────────────────────────────────────────────────────────────
// GET  /api/inventory                          — all rows, paginated
// GET  /api/inventory/search?q=               — search by SKU or product name
// GET  /api/inventory/history                  — full change log
// GET  /api/inventory/:variantId               — by variant (all locations)
// PUT  /api/inventory/:variantId/set    [mgr]  — set absolute quantity
// POST /api/inventory/:variantId/adjust [mgr]  — +/- delta with optimistic lock

router.get('/',           inventoryController.listAll)
router.get('/search',     inventoryController.search)
router.get('/history',    requireAuth, inventoryController.listHistory)
router.post('/sync-all',  requireAuth, inventoryController.syncAll)

// POST /api/inventory/backfill — create inventory rows for variants that have none
// Safe to run multiple times (skips variants that already have a row)
router.post('/backfill', requireAuth, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    // Get or create default location
    let location = await prisma.location.findFirst({ orderBy: { createdAt: 'asc' } })
    if (!location) {
      location = await prisma.location.create({
        data: { name: 'Main Store', address: 'Manjeri, Kerala' },
      })
    }

    // All variants without an inventory row at this location
    const orphans = await prisma.productVariant.findMany({
      where: { inventory: { none: { locationId: location.id } } },
      select: { id: true, sku: true },
    })

    for (const variant of orphans) {
      await prisma.inventory.create({
        data: { variantId: variant.id, locationId: location.id, quantity: 0, reserved: 0, version: 0 },
      })
    }

    res.json({ created: orphans.length, locationName: location.name })
  } catch (err) { next(err) }
})
router.get('/:variantId', inventoryController.getByVariant)

router.put(
  '/:variantId/set',
  requireAuth,
  validate(setInventorySchema),
  inventoryController.setQuantity
)

router.post(
  '/:variantId/adjust',
  requireAuth,
  validate(adjustInventorySchema),
  inventoryController.adjustQuantity
)

export default router
