import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma'

export interface UpsertCouponInput {
  code:              string
  description?:      string
  type?:             'PERCENT' | 'FIXED'
  value:             number
  minOrderAmount?:   number
  maxDiscount?:      number | null
  usageLimit?:       number
  perCustomerLimit?: number
  startsAt?:         string | Date | null
  expiresAt?:        string | Date | null
  isActive?:         boolean
}

function normaliseDate(v?: string | Date | null): Date | null | undefined {
  if (v === null || v === '') return null
  if (v === undefined) return undefined
  return new Date(v)
}

export const couponService = {
  list() {
    return prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } })
  },

  getById(id: string) {
    return prisma.coupon.findUniqueOrThrow({ where: { id } })
  },

  async create(input: UpsertCouponInput) {
    return prisma.coupon.create({
      data: {
        code:             input.code.trim().toUpperCase(),
        description:      input.description ?? null,
        type:             input.type ?? 'PERCENT',
        value:            new Prisma.Decimal(input.value),
        minOrderAmount:   new Prisma.Decimal(input.minOrderAmount ?? 0),
        maxDiscount:      input.maxDiscount != null ? new Prisma.Decimal(input.maxDiscount) : null,
        usageLimit:       input.usageLimit ?? 1,
        perCustomerLimit: input.perCustomerLimit ?? 1,
        startsAt:         normaliseDate(input.startsAt) ?? null,
        expiresAt:        normaliseDate(input.expiresAt) ?? null,
        isActive:         input.isActive ?? true,
      },
    })
  },

  update(id: string, input: Partial<UpsertCouponInput>) {
    const data: Prisma.CouponUpdateInput = {}
    if (input.code             !== undefined) data.code             = input.code.trim().toUpperCase()
    if (input.description      !== undefined) data.description      = input.description ?? null
    if (input.type             !== undefined) data.type             = input.type
    if (input.value            !== undefined) data.value            = new Prisma.Decimal(input.value)
    if (input.minOrderAmount   !== undefined) data.minOrderAmount   = new Prisma.Decimal(input.minOrderAmount)
    if (input.maxDiscount      !== undefined) data.maxDiscount      = input.maxDiscount != null ? new Prisma.Decimal(input.maxDiscount) : null
    if (input.usageLimit       !== undefined) data.usageLimit       = input.usageLimit
    if (input.perCustomerLimit !== undefined) data.perCustomerLimit = input.perCustomerLimit
    if (input.startsAt         !== undefined) data.startsAt         = normaliseDate(input.startsAt)
    if (input.expiresAt        !== undefined) data.expiresAt        = normaliseDate(input.expiresAt)
    if (input.isActive         !== undefined) data.isActive         = input.isActive
    return prisma.coupon.update({ where: { id }, data })
  },

  delete(id: string) {
    return prisma.coupon.delete({ where: { id } })
  },

  /**
   * Validate a coupon for a given subtotal + customer (preview only — no write).
   * Returns the discount amount and the coupon record. Throws on any failure
   * with a stable `code` so the API can map it to a user-friendly message.
   */
  async validate(args: { code: string; subtotal: number; customerEmail?: string }) {
    const code = args.code.trim().toUpperCase()
    if (!code) throw Object.assign(new Error('Code is required'),  { code: 'INVALID' })

    const coupon = await prisma.coupon.findUnique({ where: { code } })
    if (!coupon || !coupon.isActive) throw Object.assign(new Error('Invalid code'), { code: 'NOT_FOUND' })

    const now = new Date()
    if (coupon.startsAt  && now < coupon.startsAt)  throw Object.assign(new Error('Code not yet active'), { code: 'NOT_STARTED' })
    if (coupon.expiresAt && now > coupon.expiresAt) throw Object.assign(new Error('Code has expired'),    { code: 'EXPIRED'     })

    if (coupon.usageCount >= coupon.usageLimit) {
      throw Object.assign(new Error('Code has been fully redeemed'), { code: 'EXHAUSTED' })
    }

    const subtotal = Number(args.subtotal)
    if (Number(coupon.minOrderAmount) > subtotal) {
      throw Object.assign(new Error(`Minimum order ₹${coupon.minOrderAmount} required`), { code: 'BELOW_MIN' })
    }

    if (args.customerEmail && coupon.perCustomerLimit > 0) {
      const used = await prisma.couponRedemption.count({
        where: { couponId: coupon.id, customerEmail: args.customerEmail.toLowerCase() },
      })
      if (used >= coupon.perCustomerLimit) {
        throw Object.assign(new Error('You have already used this code'), { code: 'CUSTOMER_LIMIT' })
      }
    }

    let discount = 0
    if (coupon.type === 'PERCENT') {
      discount = (subtotal * Number(coupon.value)) / 100
      if (coupon.maxDiscount != null) discount = Math.min(discount, Number(coupon.maxDiscount))
    } else {
      discount = Number(coupon.value)
    }
    discount = Math.min(discount, subtotal)
    discount = Math.round(discount * 100) / 100

    return { coupon, discount }
  },

  /**
   * Atomically reserve a redemption — increments usageCount under
   * optimistic-locking-style guard so concurrent checkouts can't oversell.
   * Returns the created redemption + final discount applied.
   */
  async redeem(args: {
    code: string
    subtotal: number
    customerEmail?: string
    orderNumber?: string
  }) {
    const { coupon, discount } = await this.validate(args)

    return prisma.$transaction(async (tx) => {
      const updated = await tx.coupon.updateMany({
        where: {
          id:         coupon.id,
          usageCount: { lt: coupon.usageLimit },
          isActive:   true,
        },
        data: { usageCount: { increment: 1 } },
      })
      if (updated.count === 0) {
        throw Object.assign(new Error('Code has been fully redeemed'), { code: 'EXHAUSTED' })
      }
      const redemption = await tx.couponRedemption.create({
        data: {
          couponId:      coupon.id,
          customerEmail: args.customerEmail?.toLowerCase() ?? null,
          orderNumber:   args.orderNumber ?? null,
          amount:        new Prisma.Decimal(discount),
        },
      })
      return { coupon, discount, redemption }
    })
  },
}
