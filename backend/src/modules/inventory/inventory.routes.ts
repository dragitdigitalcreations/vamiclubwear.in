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
// PATCH /api/inventory/reduce — scan a barcode and reduce stock by qty (default 1)
// Used by POS scanner page. Requires auth. Prevents negative stock.
router.patch('/reduce', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { barcode, quantity = 1 } = req.body as { barcode: string; quantity?: number }
    if (!barcode || typeof barcode !== 'string') {
      return res.status(400).json({ error: 'barcode is required' })
    }
    const qty = Math.max(1, Math.floor(Number(quantity) || 1))

    // Resolve variant by barcode
    const variant = await prisma.productVariant.findUnique({
      where: { barcode },
      include: {
        product:   { select: { id: true, name: true, slug: true } },
        inventory: { include: { location: { select: { id: true, name: true } } } },
      },
    })
    if (!variant) return res.status(404).json({ error: `No variant found for barcode "${barcode}"` })

    // Use first inventory location (Main Store)
    const inv = variant.inventory[0]
    if (!inv) return res.status(404).json({ error: 'No inventory record for this variant' })

    const available = inv.quantity - inv.reserved
    if (available < qty) {
      return res.status(409).json({
        error:     `Insufficient stock. Available: ${available}, requested: ${qty}`,
        available,
      })
    }

    // Optimistic-lock update
    const updated = await prisma.inventory.updateMany({
      where:  { id: inv.id, version: inv.version },
      data:   { quantity: inv.quantity - qty, version: { increment: 1 } },
    })
    if (updated.count === 0) {
      return res.status(409).json({ error: 'Concurrent update conflict — please retry' })
    }

    // Audit trail
    await prisma.inventoryHistory.create({
      data: {
        variantId:   variant.id,
        locationId:  inv.locationId,
        oldQuantity: inv.quantity,
        newQuantity: inv.quantity - qty,
        delta:       -qty,
        action:      'ADJUSTMENT',
        note:        `POS scan deduction (barcode: ${barcode})`,
        performedBy: (req as any).adminUser?.email ?? 'pos-scanner',
      },
    })

    res.json({
      ok:          true,
      barcode,
      sku:         variant.sku,
      productName: variant.product.name,
      size:        variant.size,
      color:       variant.color,
      deducted:    qty,
      newQuantity: inv.quantity - qty,
    })
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
