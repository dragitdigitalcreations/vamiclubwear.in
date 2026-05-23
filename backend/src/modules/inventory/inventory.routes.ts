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
      select: { id: true },
    })

    if (orphans.length > 0) {
      await prisma.inventory.createMany({
        data: orphans.map((v) => ({
          variantId:  v.id,
          locationId: location.id,
          quantity:   0,
          reserved:   0,
          version:    0,
        })),
        skipDuplicates: true,
      })
    }

    res.json({ created: orphans.length, locationName: location.name })
  } catch (err) { next(err) }
})
// GET /api/inventory/by-barcode/:barcode — look up variants by barcode.
// Falls through from the product-level barcode to the per-colour barcode table
// so a colour-specific scan returns only that colour's size variants.
router.get('/by-barcode/:barcode', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const barcode = decodeURIComponent(req.params.barcode)

    const variantSelect = {
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
        orderBy: { createdAt: 'asc' as const },
      },
    }

    // 1. Try product-level barcode (SINGLE mode)
    let product = await prisma.product.findFirst({
      where:  { barcode, deletedAt: null },
      select: {
        id:   true,
        name: true,
        slug: true,
        variants: {
          where:   { isActive: true },
          select:  variantSelect,
          orderBy: { sku: 'asc' },
        },
      },
    })

    // 2. Fall back to per-colour barcode — narrows variants to the matching colour
    if (!product) {
      const colorRow = await prisma.productColorBarcode.findUnique({
        where:  { barcode },
        select: { color: true, productId: true },
      })
      if (colorRow) {
        product = await prisma.product.findFirst({
          where:  { id: colorRow.productId, deletedAt: null },
          select: {
            id:   true,
            name: true,
            slug: true,
            variants: {
              where:   { isActive: true, color: colorRow.color },
              select:  variantSelect,
              orderBy: { sku: 'asc' },
            },
          },
        })
      }
    }

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
            // Suffix per-colour barcodes too so the unique slot is freed for reuse
            const colorRows = await tx.productColorBarcode.findMany({
              where:  { productId: product.id },
              select: { id: true, barcode: true },
            })
            for (const row of colorRows) {
              await tx.productColorBarcode.update({
                where: { id: row.id },
                data:  { barcode: `${row.barcode}${suffix}` },
              })
            }
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

// ── POS Returns ────────────────────────────────────────────────────────────
// GET /api/inventory/pos-sales?days=30&page=1&limit=50
// Lists recent POS-scanner deductions (the same rows we write from PATCH
// /api/inventory/reduce). Used by the "POS Returns" admin page to restore
// stock when a customer returns an item that was already scanned out at the
// counter. The `reversedAt` field carries the timestamp of the matching
// RESTOCK reversal so the UI can disable the restore button.
router.get('/pos-sales', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const days       = Math.min(365, Math.max(1, Number(req.query.days  ?? 30)))
    const page       = Math.max(1, Number(req.query.page  ?? 1))
    const limit      = Math.min(100, Number(req.query.limit ?? 50))
    const barcode    = req.query.barcode ? String(req.query.barcode).trim() : null
    const unreversed = req.query.unreversed === 'true'
    const since      = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    // Optional barcode filter: resolve to a set of variant IDs. Matches both
    // active barcodes and archived ones (suffixed with :soldout:<ts> by the
    // POS reduce endpoint when stock hits zero), so a customer can return an
    // item even after the product has gone sold-out.
    let variantIdFilter: string[] | null = null
    if (barcode) {
      const soldoutPrefix = `${barcode}:soldout:`

      // 1. Product-level barcode
      let product = await prisma.product.findFirst({
        where:  { OR: [{ barcode }, { barcode: { startsWith: soldoutPrefix } }] },
        select: { id: true, variants: { select: { id: true } } },
      })

      // 2. Per-colour barcode — narrows to that colour's variants
      if (!product) {
        const colorRow = await prisma.productColorBarcode.findFirst({
          where:  { OR: [{ barcode }, { barcode: { startsWith: soldoutPrefix } }] },
          select: { productId: true, color: true },
        })
        if (colorRow) {
          product = await prisma.product.findFirst({
            where:  { id: colorRow.productId },
            select: {
              id: true,
              variants: { where: { color: colorRow.color }, select: { id: true } },
            },
          })
        }
      }

      if (!product) return res.status(404).json({ error: `No product found for barcode "${barcode}"` })
      variantIdFilter = product.variants.map((v) => v.id)
      if (variantIdFilter.length === 0) {
        // Product exists but has no variants — return an empty page instead of 404
        return res.json({ data: [], total: 0, page, limit, days })
      }
    }

    const where = {
      action:    'ADJUSTMENT' as const,
      note:      'POS sale deduction',
      createdAt: { gte: since },
      ...(variantIdFilter ? { variantId: { in: variantIdFilter } } : {}),
      ...(unreversed      ? { reversedBy: { none: {} } }            : {}),
    }

    const [rows, total] = await Promise.all([
      prisma.inventoryHistory.findMany({
        where,
        skip:  (page - 1) * limit,
        take:  limit,
        orderBy: { createdAt: 'desc' },
        include: {
          variant: {
            select: {
              id:    true,
              sku:   true,
              size:  true,
              color: true,
              product: { select: { id: true, name: true, slug: true, deletedAt: true } },
            },
          },
          reversedBy: {
            select: { id: true, createdAt: true, performedBy: true },
            take:   1,
          },
        },
      }),
      prisma.inventoryHistory.count({ where }),
    ])

    const data = rows.map((r) => {
      const rev = r.reversedBy[0]
      // Strip the auto-archive suffix so the UI shows the original product name
      // and lets the admin search/identify the item normally.
      const cleanName = r.variant.product.name.replace(/\s*:soldout:\d+$/, '')
      return {
        id:           r.id,
        createdAt:    r.createdAt.toISOString(),
        sku:          r.variant.sku,
        size:         r.variant.size,
        color:        r.variant.color,
        quantity:     Math.abs(r.delta),
        performedBy:  r.performedBy,
        productId:    r.variant.product.id,
        productName:  cleanName,
        archived:     r.variant.product.deletedAt !== null,
        reversedAt:   rev?.createdAt.toISOString() ?? null,
        reversedBy:   rev?.performedBy ?? null,
      }
    })

    res.json({ data, total, page, limit, days })
  } catch (err) { next(err) }
})

// POST /api/inventory/pos-reverse/:historyId
// Restore stock for a single POS sale: increments inventory by the original
// |delta|, writes a RESTOCK row pointing back to the sale, and (when the
// product was auto-archived by that sale) un-archives the product so it
// reappears on the storefront.
router.post('/pos-reverse/:historyId', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const historyId = req.params.historyId
    const performedBy = (req as any).adminUser?.email ?? 'admin'

    const sale = await prisma.inventoryHistory.findUnique({
      where:  { id: historyId },
      select: {
        id: true, variantId: true, locationId: true,
        delta: true, action: true, note: true, createdAt: true,
        reversedBy: { select: { id: true }, take: 1 },
      },
    })
    if (!sale)                                 return res.status(404).json({ error: 'POS sale not found' })
    if (sale.action !== 'ADJUSTMENT' ||
        sale.note   !== 'POS sale deduction')  return res.status(400).json({ error: 'Not a POS scanner deduction' })
    if (sale.reversedBy.length > 0)            return res.status(409).json({ error: 'Already restored' })
    if (!sale.locationId)                      return res.status(400).json({ error: 'Sale row is missing locationId' })

    const ageDays = (Date.now() - sale.createdAt.getTime()) / (24 * 60 * 60 * 1000)
    if (ageDays > 30) return res.status(400).json({ error: 'Sale is older than 30 days — cannot restore' })

    const restoreQty = Math.abs(sale.delta)

    // Optimistic-lock inventory bump. The variant might have been re-stocked
    // since the sale, so we don't assume a particular pre-state.
    const inv = await prisma.inventory.findUnique({
      where: { variantId_locationId: { variantId: sale.variantId, locationId: sale.locationId } },
      select: { id: true, quantity: true, version: true, locationId: true },
    })
    if (!inv) return res.status(404).json({ error: 'No inventory record for this variant at the sale location' })

    const updated = await prisma.inventory.updateMany({
      where: { id: inv.id, version: inv.version },
      data:  { quantity: inv.quantity + restoreQty, version: { increment: 1 } },
    })
    if (updated.count === 0) return res.status(409).json({ error: 'Concurrent update conflict — please retry' })

    // Audit trail — links back to the original sale via reversalOfId.
    await prisma.inventoryHistory.create({
      data: {
        variantId:    sale.variantId,
        locationId:   sale.locationId,
        oldQuantity:  inv.quantity,
        newQuantity:  inv.quantity + restoreQty,
        delta:        restoreQty,
        action:       'RESTOCK',
        note:         `POS return reversal of ${sale.id}`,
        performedBy,
        reversalOfId: sale.id,
      },
    })

    // Un-archive the product if the original sale took it to 0 stock and the
    // reduce endpoint auto-archived it (slug + barcode suffixed with
    // :soldout:<ts>). After the restore, available stock > 0, so the product
    // should reappear on the storefront.
    let unarchived = false
    const variant = await prisma.productVariant.findUnique({
      where:  { id: sale.variantId },
      select: { productId: true },
    })
    if (variant) {
      const product = await prisma.product.findUnique({
        where:  { id: variant.productId },
        select: { id: true, slug: true, barcode: true, deletedAt: true },
      })
      if (product?.deletedAt) {
        const stripSuffix = (s: string) => s.replace(/:soldout:\d+$/, '')
        const newSlug    = stripSuffix(product.slug)
        const newBarcode = product.barcode ? stripSuffix(product.barcode) : null

        // Guard against a name collision on slug/barcode: if the original
        // identifier is already taken (very unlikely — would mean another
        // product reused it after archive), keep the suffixed value so we
        // never violate the unique constraint, and surface the warning.
        const slugClash = newSlug !== product.slug
          ? await prisma.product.findFirst({ where: { slug: newSlug, id: { not: product.id } }, select: { id: true } })
          : null
        const barcodeClash = newBarcode && newBarcode !== product.barcode
          ? await prisma.product.findFirst({ where: { barcode: newBarcode, id: { not: product.id } }, select: { id: true } })
          : null

        await prisma.$transaction(async (tx) => {
          await tx.product.update({
            where: { id: product.id },
            data: {
              deletedAt: null,
              isActive:  true,
              slug:      slugClash    ? product.slug    : newSlug,
              barcode:   barcodeClash ? product.barcode : newBarcode,
            },
          })
          const colorRows = await tx.productColorBarcode.findMany({
            where:  { productId: product.id },
            select: { id: true, barcode: true },
          })
          for (const row of colorRows) {
            const cleaned = stripSuffix(row.barcode)
            if (cleaned === row.barcode) continue
            const clash = await tx.product.findFirst({ where: { barcode: cleaned }, select: { id: true } })
              || await tx.productColorBarcode.findFirst({ where: { barcode: cleaned, id: { not: row.id } }, select: { id: true } })
            if (clash) continue
            await tx.productColorBarcode.update({ where: { id: row.id }, data: { barcode: cleaned } })
          }
          await tx.productVariant.updateMany({
            where: { productId: product.id },
            data:  { isActive: true },
          })
        })
        unarchived = true
        cache.del(`product:slug:${product.slug}`).catch(() => {})
        cache.del(`product:slug:${newSlug}`).catch(() => {})
      }
    }

    cache.delPattern('products:list:*').catch(() => {})

    res.json({
      ok:           true,
      restored:     restoreQty,
      newQuantity:  inv.quantity + restoreQty,
      unarchived,
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
