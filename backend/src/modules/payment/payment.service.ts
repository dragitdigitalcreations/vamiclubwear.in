import type { Order } from '@prisma/client'
import { prisma } from '../../lib/prisma'
import { orderService } from '../order/order.service'

type IntentItem = { variantId: string; quantity: number }

export type ConsumeIntentResult =
  | { status: 'created';  order: Order }
  | { status: 'already';  order: Order }
  | { status: 'missing' }
  | { status: 'race' }

// Materialize a PaymentIntent into an Order. Called by both the browser
// /api/payment/verify path and the server-side /api/webhooks/razorpay
// fallback. The first to atomically claim `consumedAt` creates the order;
// the other returns the already-created one. Roll back the claim on failure
// so a webhook redelivery (or admin retry) can take a second shot.
export const paymentService = {
  async consumeIntent(rzpOrderId: string): Promise<ConsumeIntentResult> {
    const intent = await prisma.paymentIntent.findUnique({ where: { rzpOrderId } })
    if (!intent) return { status: 'missing' }

    if (intent.consumedAt && intent.orderId) {
      const existing = await prisma.order.findUnique({ where: { id: intent.orderId } })
      if (existing) return { status: 'already', order: existing }
    }

    const claimed = await prisma.paymentIntent.updateMany({
      where: { id: intent.id, consumedAt: null },
      data:  { consumedAt: new Date() },
    })

    if (claimed.count !== 1) {
      // Another worker (the other path) is creating the order right now. Poll
      // briefly for it to finish — the window is one createOrder call (≈1–2s),
      // and waiting here keeps the API surface clean (verify either returns
      // the order or 404, never an in-between "pending").
      for (let attempt = 0; attempt < 6; attempt++) {
        await new Promise((r) => setTimeout(r, 500))
        const refreshed = await prisma.paymentIntent.findUnique({ where: { id: intent.id } })
        if (refreshed?.orderId) {
          const existing = await prisma.order.findUnique({ where: { id: refreshed.orderId } })
          if (existing) return { status: 'already', order: existing }
        }
      }
      return { status: 'race' }
    }

    const items = intent.items as unknown as IntentItem[]

    try {
      const created = await orderService.createOrder({
        customerName:    intent.customerName ?? undefined,
        customerEmail:   intent.customerEmail ?? undefined,
        customerPhone:   intent.customerPhone ?? undefined,
        shippingAddress: intent.fulfillmentType === 'PICKUP' ? undefined : (intent.shippingAddress ?? undefined),
        shippingCity:    intent.fulfillmentType === 'PICKUP' ? undefined : (intent.shippingCity ?? undefined),
        shippingState:   intent.fulfillmentType === 'PICKUP' ? undefined : (intent.shippingState ?? undefined),
        shippingPincode: intent.fulfillmentType === 'PICKUP' ? undefined : (intent.shippingPincode ?? undefined),
        fulfillmentType: intent.fulfillmentType,
        notes:           intent.notes ?? undefined,
        couponCode:      intent.couponCode ?? undefined,
        items,
      })

      const order = await prisma.order.update({
        where: { id: created.id },
        data:  { paymentStatus: 'PAID' },
      })

      await prisma.paymentIntent.update({
        where: { id: intent.id },
        data:  { orderId: order.id },
      })

      return { status: 'created', order }
    } catch (err) {
      await prisma.paymentIntent.update({
        where: { id: intent.id },
        data:  { consumedAt: null },
      }).catch(() => {})
      throw err
    }
  },
}
