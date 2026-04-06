import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma'
import { CreateOrderInput, UpdateOrderStatusInput, ListOrdersQuery } from './order.schema'
import { NotFoundError, InsufficientStockError, ConflictError } from '../../utils/errors'
import { generateOrderNumber } from '../../utils/orderNumber'

const MAX_LOCK_RETRIES = 3

export const orderService = {

  async createOrder(input: CreateOrderInput) {
    return prisma.$transaction(async (tx) => {

      // ── 0. Resolve locationId — use provided or fall back to first active location
      let locationId = input.locationId
      if (!locationId) {
        const defaultLocation = await tx.location.findFirst({
          where: { isActive: true },
          orderBy: { createdAt: 'asc' },
        })
        locationId = defaultLocation?.id
      }

      // ── 1. Load all requested variants with their inventory at the given location
      const variantIds = input.items.map((i) => i.variantId)
      const variants = await tx.productVariant.findMany({
        where: { id: { in: variantIds }, isActive: true },
        include: {
          inventory: {
            where: locationId ? { locationId } : {},
          },
        },
      })

      // ── 2. Validate each item ──────────────────────────────────────────────
      for (const item of input.items) {
        const variant = variants.find((v) => v.id === item.variantId)
        if (!variant) throw new NotFoundError(`Variant ${item.variantId}`)

        const inv = variant.inventory[0]
        const available = (inv?.quantity ?? 0) - (inv?.reserved ?? 0)
        if (available < item.quantity) {
          throw new InsufficientStockError(variant.sku, available, item.quantity)
        }
      }

      // ── 3. Compute order totals ────────────────────────────────────────────
      const subtotal = input.items.reduce((sum, item) => {
        const variant = variants.find((v) => v.id === item.variantId)!
        return sum + Number(variant.price) * item.quantity
      }, 0)

      // ── 4. Create the order record ─────────────────────────────────────────
      const order = await tx.order.create({
        data: {
          orderNumber:   generateOrderNumber(),
          customerName:  input.customerName,
          customerEmail: input.customerEmail,
          customerPhone: input.customerPhone,
          locationId,
          notes:         input.notes,
          subtotal:      new Prisma.Decimal(subtotal),
          total:         new Prisma.Decimal(subtotal),
          items: {
            create: input.items.map((item) => {
              const variant = variants.find((v) => v.id === item.variantId)!
              return {
                variantId: item.variantId,
                quantity:  item.quantity,
                unitPrice: variant.price,
              }
            }),
          },
        },
        include: {
          items: {
            include: {
              variant: { select: { sku: true, size: true, color: true } },
            },
          },
        },
      })

      // ── 5. Deduct inventory with optimistic locking ────────────────────────
      for (const item of input.items) {
        const variant = variants.find((v) => v.id === item.variantId)!
        const inv = variant.inventory[0]
        if (!inv) continue  // no inventory row = no deduction (edge case)

        let deducted = false
        for (let attempt = 1; attempt <= MAX_LOCK_RETRIES; attempt++) {
          // Re-read current row inside the transaction for fresh version
          const current = await tx.inventory.findUnique({ where: { id: inv.id } })
          if (!current) break

          const updated = await tx.$executeRaw`
            UPDATE "Inventory"
            SET quantity    = quantity - ${item.quantity},
                version     = version + 1,
                "updatedAt" = NOW()
            WHERE id      = ${current.id}
              AND version  = ${current.version}
              AND quantity - ${item.quantity} >= 0
          `

          if (updated === 1) { deducted = true; break }

          if (attempt === MAX_LOCK_RETRIES) {
            throw new ConflictError(
              `Stock conflict for SKU ${variant.sku}. Please retry the order.`
            )
          }
        }

        if (!deducted) {
          throw new InsufficientStockError(variant.sku, 0, item.quantity)
        }
      }

      return order
    })
  },

  // ─────────────────────────────────────────────────────────────────────────

  async listOrders(query: ListOrdersQuery) {
    const { page, limit, status } = query
    const skip = (page - 1) * limit

    const where: Prisma.OrderWhereInput = {
      ...(status && { status }),
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { items: { include: { variant: { select: { sku: true } } } } },
      }),
      prisma.order.count({ where }),
    ])

    return { data: orders, total, page, limit }
  },

  async getOrderById(id: string) {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            variant: {
              include: { product: { select: { name: true, slug: true } } },
            },
          },
        },
      },
    })
    if (!order) throw new NotFoundError(`Order ${id}`)
    return order
  },

  async updateStatus(id: string, input: UpdateOrderStatusInput) {
    const order = await prisma.order.findUnique({ where: { id } })
    if (!order) throw new NotFoundError(`Order ${id}`)

    return prisma.order.update({
      where: { id },
      data: { status: input.status },
    })
  },
}
