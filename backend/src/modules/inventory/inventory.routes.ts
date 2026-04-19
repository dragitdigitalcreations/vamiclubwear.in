import { Router, Request, Response, NextFunction } from 'express'
import { inventoryController } from './inventory.controller'
import { validate } from '../../middleware/validateRequest'
import { requireAuth } from '../../middleware/auth'
import { prisma } from '../../lib/prisma'
import { cache } from '../../lib/cache'
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
// GET /api/inventory/by-barcode/:barcode — look up all variants of a product by barcode
// Returns the full product variant list so POS staff can pick the exact one sold
router.get('/by-barcode/:barcode', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const barcode = decodeURIComponent(req.params.barcode)

    // Find the product by its barcode
    const product = await prisma.product.findFirst({
      where:  { barcode, deletedAt: null },
      select: {
        id:   true,
        name: true,
        slug: true,
        variants: {
          where:   { isActive: true },
          select: {
            id:      true,
            sku:     true,
            size:    true,
            color:   true,
            fabric:  true,
            style:   true,
            price:   true,
            inventory: {
              select: { quantity: true, reserved: true },
              take:   1,
              orderBy: { createdAt: 'asc' },
            },
          },
          orderBy: { sku: 'asc' },
        },
      },
    })
    if (!product) return res.status(404).json({ error: `No product found for barcode "${barcode}"` })

    const variants = product.variants.map((v) => ({
      id:           v.id,
      sku:          v.sku,
      size:         v.size,
      color:        v.color,
      fabric:       v.fabric,
      style:        v.style,
      price:        Number(v.price),
      availableQty: (v.inventory[0]?.quantity ?? 0) - (v.inventory[0]?.reserved ?? 0),
    }))

    res.json({
      productId:   product.id,
      productName: product.name,
      variants,
    })
  } catch (err) { next(err) }
})

// PATCH /api/inventory/reduce — deduct stock by variantId (called after staff picks variant)
// Used by POS scanner page. Requires auth. Prevents negative stock.
router.patch('/reduce', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { variantId, quantity = 1 } = req.body as { variantId: string; quantity?: number }
    if (!variantId || typeof variantId !== 'string') {
      return res.status(400).json({ error: 'variantId is required' })
    }
    const qty = Math.max(1, Math.floor(Number(quantity) || 1))

    // Resolve variant + inventory
    const variant = await prisma.productVariant.findUnique({
      where:   { id: variantId },
      select: {
        id:      true,
        sku:     true,
        size:    true,
        color:   true,
        product: { select: { name: true } },
        inventory: {
          select:  { id: true, quantity: true, reserved: true, version: true, locationId: true },
          take:    1,
          orderBy: { createdAt: 'asc' },
        },
      },
    })
    if (!variant) return res.status(404).json({ error: `Variant not found` })

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
      where: { id: inv.id, version: inv.version },
      data:  { quantity: inv.quantity - qty, version: { increment: 1 } },
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
        note:        `POS sale deduction`,
        performedBy: (req as any).adminUser?.email ?? 'pos-scanner',
      },
    })

    // Invalidate product caches immediately — storefront reads stock from the
    // cached product detail payload, so without this the website keeps showing
    // the pre-sale quantity (single-qty items looked unchanged after POS scan).
    const fullVariant = await prisma.productVariant.findUnique({
      where: { id: variant.id },
      select: { productId: true, product: { select: { slug: true } } },
    })
    if (fullVariant?.product?.slug) {
      cache.del(`product:slug:${fullVariant.product.slug}`).catch(() => {})
    }
    cache.delPattern('products:list:*').catch(() => {})

    let archived = false
    if (fullVariant) {
      const remaining = await prisma.inventory.aggregate({
        _sum: { quantity: true, reserved: true },
        where: { variant: { productId: fullVariant.productId } },
      })
      const totalQty      = remaining._sum.quantity ?? 0
      const totalReserved = remaining._sum.reserved ?? 0
      if (totalQty - totalReserved <= 0) {
        const product = await prisma.product.findUnique({
          where:  { id: fullVariant.productId },
          select: { id: true, slug: true, barcode: true, deletedAt: true },
        })
        if (product && !product.deletedAt) {
          const suffix = `:soldout:${Date.now()}`
          await prisma.$transaction(async (tx) => {
            await tx.product.update({
              where: { id: product.id },
              data: {
                deletedAt: new Date(),
                isActive:  false,
                slug:      `${product.slug}${suffix}`,
                barcode:   product.barcode ? `${product.barcode}${suffix}` : null,
              },
            })
            await tx.productVariant.updateMany({
              where: { productId: product.id },
              data:  { isActive: false },
            })
          })
          archived = true
          cache.del(`product:slug:${product.slug}`).catch(() => {})
          cache.delPattern('products:list:*').catch(() => {})
        }
      }
    }

    res.json({
      ok:          true,
      sku:         variant.sku,
      productName: variant.product.name,
      size:        variant.size,
      color:       variant.color,
      deducted:    qty,
      newQuantity: inv.quantity - qty,
      archived,
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
