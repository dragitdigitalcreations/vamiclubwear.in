import { prisma } from '../../lib/prisma'
import { SyncStatus } from '@prisma/client'
import { SetInventoryInput, AdjustInventoryInput, CreateLocationInput } from './inventory.schema'
import { NotFoundError, ConflictError } from '../../utils/errors'
import { cache } from '../../lib/cache'

// Clears the cached storefront payloads that embed inventory quantities, so
// quantity changes are reflected on the website immediately.
async function invalidateProductCacheByVariant(variantId: string) {
  try {
    const v = await prisma.productVariant.findUnique({
      where:  { id: variantId },
      select: { product: { select: { slug: true } } },
    })
    if (v?.product?.slug) await cache.del(`product:slug:${v.product.slug}`)
    await cache.delPattern('products:list:*')
  } catch { /* cache failures must never break a write */ }
}

const MAX_RETRIES = 3

export const inventoryService = {

  // ── Locations ──────────────────────────────────────────────────────────────

  async createLocation(data: CreateLocationInput) {
    return prisma.location.create({ data })
  },

  async listLocations() {
    return prisma.location.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    })
  },

  // ── Inventory reads ────────────────────────────────────────────────────────

  async getByVariant(variantId: string) {
    return prisma.inventory.findMany({
      where: { variantId },
      include: { location: { select: { id: true, name: true } } },
    })
  },

  async getByVariantAndLocation(variantId: string, locationId: string) {
    return prisma.inventory.findUnique({
      where: { variantId_locationId: { variantId, locationId } },
      include: { location: { select: { id: true, name: true } } },
    })
  },

  async listAll(page = 1, limit = 50) {
    const skip = (page - 1) * limit
    const [rows, total] = await Promise.all([
      prisma.inventory.findMany({
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          variant: {
            select: {
              sku: true, size: true, color: true, fabric: true, style: true,
              product: { select: { name: true } },
            },
          },
          location: { select: { id: true, name: true } },
        },
      }),
      prisma.inventory.count(),
    ])

    // Flatten to the InventoryRow shape expected by the frontend
    const data = rows.map((r) => ({
      id:          r.id,
      sku:         r.variant.sku,
      productName: r.variant.product.name,
      size:        r.variant.size,
      color:       r.variant.color,
      quantity:    r.quantity,
      reserved:    r.reserved,
      available:   Math.max(0, r.quantity - r.reserved),
      posItemCode: r.posItemCode ?? null,
      lastSyncAt:  r.lastSyncAt?.toISOString() ?? null,
    }))

    return { data, total, page, limit }
  },

  // ── Mark all PENDING rows as SYNCED (simulated POS push) ─────────────────

  async markAllSynced() {
    const result = await prisma.inventory.updateMany({
      where: { syncStatus: SyncStatus.PENDING },
      data:  { syncStatus: SyncStatus.SYNCED, lastSyncAt: new Date() },
    })
    return result.count
  },

  // ── Search by SKU or product name ─────────────────────────────────────────

  async search(q: string, limit = 20) {
    const term = q.trim()
    if (!term) return []
    return prisma.inventory.findMany({
      take: limit,
      where: {
        OR: [
          { variant: { sku: { contains: term, mode: 'insensitive' } } },
          { variant: { product: { name: { contains: term, mode: 'insensitive' } } } },
        ],
      },
      include: {
        variant: {
          select: {
            id: true, sku: true, size: true, color: true, fabric: true,
            product: { select: { name: true } },
          },
        },
        location: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: 'desc' },
    })
  },

  // ── Inventory history ──────────────────────────────────────────────────────

  async listHistory(variantId?: string, page = 1, limit = 50) {
    const skip  = (page - 1) * limit
    const where = variantId ? { variantId } : {}
    const [data, total] = await Promise.all([
      prisma.inventoryHistory.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          variant: {
            select: {
              sku: true,
              product: { select: { name: true } },
            },
          },
        },
      }),
      prisma.inventoryHistory.count({ where }),
    ])
    return { data, total }
  },

  // ── Set absolute quantity (admin stock-count) ──────────────────────────────

  async setQuantity(variantId: string, input: SetInventoryInput, performedBy?: string) {
    const existing = await prisma.inventory.findUnique({
      where: { variantId_locationId: { variantId, locationId: input.locationId } },
    })
    const oldQty = existing?.quantity ?? 0

    const row = await prisma.inventory.upsert({
      where: { variantId_locationId: { variantId, locationId: input.locationId } },
      create: {
        variantId,
        locationId:  input.locationId,
        quantity:    input.quantity,
        reserved:    0,
        version:     0,
        syncStatus:  SyncStatus.PENDING,
      },
      update: {
        quantity:   input.quantity,
        version:    { increment: 1 },
        syncStatus: SyncStatus.PENDING,
      },
    })

    await prisma.inventoryHistory.create({
      data: {
        variantId,
        locationId:  input.locationId,
        oldQuantity: oldQty,
        newQuantity: input.quantity,
        delta:       input.quantity - oldQty,
        action:      'MANUAL',
        performedBy: performedBy ?? 'system',
      },
    })

    await invalidateProductCacheByVariant(variantId)
    return row
  },

  // ── Adjust quantity by delta (positive = restock, negative = manual deduction)
  // Uses optimistic locking per CLAUDE.md requirement.

  async adjustQuantity(
    variantId: string,
    input: AdjustInventoryInput,
    retries = MAX_RETRIES,
    performedBy?: string
  ): Promise<void> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      const row = await prisma.inventory.findUnique({
        where: { variantId_locationId: { variantId, locationId: input.locationId } },
      })

      if (!row) throw new NotFoundError(`Inventory for variant ${variantId} at location ${input.locationId}`)

      const newQty = row.quantity + input.delta
      if (newQty < 0) {
        throw new ConflictError(
          `Cannot reduce below zero. Current: ${row.quantity}, delta: ${input.delta}`
        )
      }

      // Optimistic lock: WHERE version = currentVersion
      const updated = await prisma.$executeRaw`
        UPDATE "Inventory"
        SET quantity   = ${newQty},
            version    = version + 1,
            "updatedAt" = NOW()
        WHERE id = ${row.id}
          AND version = ${row.version}
      `

      if (updated === 1) {
        await prisma.inventoryHistory.create({
          data: {
            variantId,
            locationId:  input.locationId,
            oldQuantity: row.quantity,
            newQuantity: newQty,
            delta:       input.delta,
            action:      input.delta >= 0 ? 'RESTOCK' : 'ADJUSTMENT',
            performedBy: performedBy ?? 'system',
          },
        })
        await invalidateProductCacheByVariant(variantId)
        return
      }

      // Version mismatch — retry after brief backoff
      if (attempt < retries) await new Promise((r) => setTimeout(r, 30 * attempt))
    }

    throw new ConflictError(
      `Inventory update conflict for variant ${variantId} after ${retries} retries`
    )
  },
}
