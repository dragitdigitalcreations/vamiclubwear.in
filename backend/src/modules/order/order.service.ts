import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma'
import { CreateOrderInput, UpdateOrderStatusInput, ListOrdersQuery } from './order.schema'
import { NotFoundError, InsufficientStockError, ConflictError } from '../../utils/errors'
import { generateOrderNumber } from '../../utils/orderNumber'
import { sendOrderConfirmationToCustomer, sendOrderNotificationToStore, sendPickupReadyEmail } from '../../lib/email'
import { createDelhiveryShipment, mapDelhiveryStatus } from '../shipping/delhivery.service'
import { sendShipmentCreatedEmail } from '../../lib/email'
import { couponService } from '../coupon/coupon.service'
import { calcShippingFee } from '../../utils/shipping'

const MAX_LOCK_RETRIES = 3

export const orderService = {

  async createOrder(input: CreateOrderInput) {
    const createdOrder = await prisma.$transaction(async (tx) => {

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

      // ── 3a. Apply coupon (if provided) ─────────────────────────────────────
      // We validate inside the same outer flow so a fraudulent client can't
      // submit a discount; redemption count is bumped after order create.
      let discount = 0
      let couponNote: string | undefined
      if (input.couponCode) {
        const validation = await couponService.validate({
          code:          input.couponCode,
          subtotal,
          customerEmail: input.customerEmail,
        })
        discount = validation.discount
        couponNote = `coupon:${validation.coupon.code}`
      }
      // Pickup orders are collected from the store, so no shipping fee.
      const fulfillmentType = input.fulfillmentType ?? 'DELIVERY'
      const afterDiscount   = Math.max(0, subtotal - discount)
      const shippingFee     = fulfillmentType === 'PICKUP' ? 0 : calcShippingFee(afterDiscount)
      const total           = afterDiscount + shippingFee

      // ── 4. Create the order record ─────────────────────────────────────────
      const order = await tx.order.create({
        data: {
          orderNumber:     generateOrderNumber(),
          customerName:    input.customerName,
          customerEmail:   input.customerEmail,
          customerPhone:   input.customerPhone,
          locationId,
          fulfillmentType,
          shippingAddress: input.shippingAddress,
          shippingCity:    input.shippingCity,
          shippingState:   input.shippingState,
          shippingPincode: input.shippingPincode,
          notes:           [input.notes, couponNote].filter(Boolean).join(' | ') || undefined,
          subtotal:      new Prisma.Decimal(subtotal),
          discount:      new Prisma.Decimal(discount),
          shippingFee:   new Prisma.Decimal(shippingFee),
          total:         new Prisma.Decimal(total),
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
              variant: {
                select: {
                  sku: true, size: true, color: true,
                  product: { select: { name: true } },
                },
              },
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

    // ── 5b. Redeem coupon after the order transaction commits ───────────────
    // Done outside the order tx so a coupon-step failure doesn't unwind the
    // already-deducted inventory. The validate() inside the tx is the gate;
    // this call atomically increments usageCount.
    if (input.couponCode) {
      try {
        await couponService.redeem({
          code:          input.couponCode,
          subtotal:      Number(createdOrder.subtotal),
          customerEmail: input.customerEmail,
          orderNumber:   createdOrder.orderNumber,
        })
      } catch (err) {
        console.error('[coupon] redemption recorded failure for', createdOrder.orderNumber, err)
      }
    }

    // ── 6. Send transactional emails ─────────────────────────────────────────
    // Awaited (not fire-and-forget) so we can stamp confirmationEmailSentAt /
    // storeEmailSentAt on success and confirmationEmailLastError on failure.
    // The persisted timestamps are what powers the admin "Resend confirmation"
    // button and the background retry sweep — without them a Resend rejection
    // would silently strand the customer (which is the exact bug we just hit).
    //
    // Worst case: Resend takes ~3-4s to time out — acceptable since the order
    // and inventory are already committed; the customer is on the success page.
    const emailItems = createdOrder.items.map((item) => ({
      name:  item.variant?.product?.name ?? 'Item',
      sku:   item.variant?.sku ?? '',
      size:  item.variant?.size ?? null,
      color: item.variant?.color ?? null,
      qty:   item.quantity,
      price: Number(item.unitPrice),
    }))
    const emailData = {
      orderNumber:     createdOrder.orderNumber,
      customerName:    createdOrder.customerName,
      customerEmail:   createdOrder.customerEmail,
      items:           emailItems,
      total:           Number(createdOrder.total),
      fulfillmentType: createdOrder.fulfillmentType,
    }
    try {
      const [custResult, storeResult] = await Promise.all([
        sendOrderConfirmationToCustomer(emailData),
        sendOrderNotificationToStore(emailData),
      ])
      await prisma.order.update({
        where: { id: createdOrder.id },
        data: {
          confirmationEmailSentAt:    custResult.ok  ? new Date() : null,
          storeEmailSentAt:           storeResult.ok ? new Date() : null,
          confirmationEmailLastError: custResult.ok ? null : custResult.error,
        },
      })
      if (!custResult.ok) {
        console.error(`[email] Order ${createdOrder.orderNumber}: customer confirmation FAILED — ${custResult.error}`)
      }
      if (!storeResult.ok) {
        console.error(`[email] Order ${createdOrder.orderNumber}: store notification FAILED — ${storeResult.error}`)
      }
    } catch (err: any) {
      // Defensive — send() itself shouldn't throw any more, but if it does we
      // still want the order to succeed and the failure recorded for retry.
      const msg = err?.message ?? String(err)
      console.error(`[email] Unexpected error sending emails for ${createdOrder.orderNumber}:`, err)
      await prisma.order.update({
        where: { id: createdOrder.id },
        data:  { confirmationEmailLastError: msg },
      }).catch(() => {})
    }

    return createdOrder
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Resend the customer order-confirmation email for an existing order. Used
  // by the admin "Resend confirmation" button when the original send failed
  // (Resend down, key not loaded, unverified domain, etc.) and by the boot
  // retry sweep that backfills any orders whose initial send didn't make it.
  // Returns the SendResult so callers can surface the exact error.
  // ─────────────────────────────────────────────────────────────────────────
  async resendOrderConfirmation(id: string) {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            variant: {
              select: {
                sku: true, size: true, color: true,
                product: { select: { name: true } },
              },
            },
          },
        },
      },
    })
    if (!order) throw new NotFoundError(`Order ${id}`)
    if (!order.customerEmail) {
      throw new ConflictError('Order has no customer email on file')
    }

    const emailItems = order.items.map((item) => ({
      name:  item.variant?.product?.name ?? 'Item',
      sku:   item.variant?.sku ?? '',
      size:  item.variant?.size ?? null,
      color: item.variant?.color ?? null,
      qty:   item.quantity,
      price: Number(item.unitPrice),
    }))
    const result = await sendOrderConfirmationToCustomer({
      orderNumber:     order.orderNumber,
      customerName:    order.customerName,
      customerEmail:   order.customerEmail,
      items:           emailItems,
      total:           Number(order.total),
      fulfillmentType: order.fulfillmentType,
    })

    await prisma.order.update({
      where: { id: order.id },
      data: {
        confirmationEmailSentAt:    result.ok ? new Date() : order.confirmationEmailSentAt,
        confirmationEmailLastError: result.ok ? null : result.error,
      },
    })

    return { result, sentTo: order.customerEmail }
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
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            variant: {
              select: {
                sku:   true,
                size:  true,
                color: true,
                product: {
                  select: {
                    name:            true,
                    barcode:         true,
                    perColorBarcode: true,
                    colorBarcodes:   { select: { color: true, barcode: true } },
                  },
                },
              },
            },
          },
        },
      },
    })
    if (!order) throw new NotFoundError(`Order ${id}`)

    const updated = await prisma.order.update({
      where: { id },
      data: { status: input.status },
    })

    // Auto-create Delhivery shipment whenever the order advances to a
    // post-payment state (CONFIRMED or PROCESSING). Admins sometimes skip
    // CONFIRMED and jump straight to PROCESSING — we still want the AWB
    // generated automatically. Idempotent because we gate on shippingStatus.
    const SHIPMENT_TRIGGER_STATES = new Set(['CONFIRMED', 'PROCESSING'])
    if (
      order.fulfillmentType === 'DELIVERY' &&
      SHIPMENT_TRIGGER_STATES.has(input.status) &&
      order.shippingStatus === 'NOT_CREATED' &&
      order.customerPhone &&
      order.shippingAddress &&
      order.shippingPincode &&
      process.env.DELHIVERY_TOKEN
    ) {
      // fire-and-forget — don't block the status update response
      ;(async () => {
        try {
          const productDesc = order.items
            .map((i) => `${i.variant.product.name} (${i.variant.sku}) ×${i.quantity}`)
            .join(', ')

          const result = await createDelhiveryShipment({
            orderNumber:  order.orderNumber,
            customerName: order.customerName ?? 'Customer',
            phone:        order.customerPhone!,
            address:      order.shippingAddress!,
            city:         order.shippingCity ?? '',
            state:        order.shippingState ?? '',
            pincode:      order.shippingPincode!,
            totalAmount:  Number(order.total),
            paymentMode:  'Prepaid',
            productDesc,
          })

          await prisma.order.update({
            where: { id: order.id },
            data: {
              shippingStatus:      'CREATED',
              awbNumber:           result.awbNumber,
              trackingUrl:         result.trackingUrl,
              delhiveryShipmentId: result.shipmentId,
            },
          })

          const emailItems = order.items.map((i) => {
            const p = i.variant.product
            const colorBarcode = p.perColorBarcode
              ? p.colorBarcodes.find((c) => c.color === i.variant.color)?.barcode ?? null
              : null
            return {
              name:    p.name,
              sku:     i.variant.sku,
              size:    i.variant.size,
              color:   i.variant.color,
              qty:     i.quantity,
              price:   Number(i.unitPrice),
              barcode: p.perColorBarcode ? colorBarcode : (p.barcode ?? null),
            }
          })

          const redemption = (order.discount && Number(order.discount) > 0)
            ? await prisma.couponRedemption.findFirst({
                where:   { orderNumber: order.orderNumber },
                select:  { coupon: { select: { code: true } } },
                orderBy: { createdAt: 'desc' },
              })
            : null

          sendShipmentCreatedEmail({
            orderNumber:     order.orderNumber,
            invoiceNumber:   order.invoiceNumber,
            invoiceDate:     new Date(),
            customerName:    order.customerName,
            customerEmail:   order.customerEmail,
            customerPhone:   order.customerPhone,
            shippingAddress: order.shippingAddress,
            shippingCity:    order.shippingCity,
            shippingState:   order.shippingState,
            shippingPincode: order.shippingPincode,
            awbNumber:       result.awbNumber,
            trackingUrl:     result.trackingUrl,
            items:           emailItems,
            subtotal:        Number(order.subtotal),
            discount:        Number(order.discount),
            couponCode:      redemption?.coupon?.code ?? null,
            shippingFee:     Number(order.shippingFee),
            total:           Number(order.total),
          }).catch(() => {})

        } catch (err) {
          console.error('[shipping] Auto-create Delhivery shipment failed:', err)
        }
      })()
    }

    return updated
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Pickup workflow — for orders where the customer chose to collect from
  // the store. Stage transitions:
  //   READY     → marks pickupReadyAt + bumps status to PROCESSING
  //   PICKED_UP → marks pickedUpAt + bumps status to DELIVERED
  // Only valid on orders with fulfillmentType = PICKUP.
  // ─────────────────────────────────────────────────────────────────────────
  async updatePickupStage(id: string, stage: 'READY' | 'PICKED_UP') {
    const order = await prisma.order.findUnique({ where: { id } })
    if (!order) throw new NotFoundError(`Order ${id}`)
    if (order.fulfillmentType !== 'PICKUP') {
      throw new ConflictError('Pickup actions are only available on store-pickup orders')
    }

    const data: Prisma.OrderUpdateInput = {}
    if (stage === 'READY') {
      data.pickupReadyAt = new Date()
      // Bump status forward to surface "ready for pickup" in the standard flow.
      if (order.status === 'PENDING' || order.status === 'CONFIRMED') {
        data.status = 'PROCESSING'
      }
    } else {
      data.pickedUpAt = new Date()
      data.status     = 'DELIVERED'
      if (!order.pickupReadyAt) data.pickupReadyAt = new Date()
    }

    const updated = await prisma.order.update({ where: { id }, data })

    // Fire-and-forget pickup-ready email — only on the READY transition and
    // only the first time (pickupReadyAt was null beforehand).
    if (stage === 'READY' && !order.pickupReadyAt && updated.customerEmail) {
      sendPickupReadyEmail({
        orderNumber:   updated.orderNumber,
        customerName:  updated.customerName,
        customerEmail: updated.customerEmail,
      }).catch((e) => console.error('[email] pickup-ready email failed:', e))
    }

    return updated
  },
}
