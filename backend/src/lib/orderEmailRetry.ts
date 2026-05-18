/**
 * Background sweep that retries any transactional order email whose initial
 * send didn't make it. Without this, a transient Resend outage at the moment
 * of checkout / shipment / delivery silently strands the customer.
 *
 * Covers four email types — each gated on its own *EmailSentAt column:
 *   1. Customer order confirmation  (sent in createOrder)
 *   2. Store new-order notification (sent in createOrder)
 *   3. Shipment / invoice email     (sent when an AWB is generated)
 *   4. Delivery confirmation        (sent on DELIVERED scan or PICKED_UP)
 *   5. Pickup-ready email           (sent when staff marks pickup READY)
 *
 * Runs on boot (after 30s, once Express is up) and every 15 minutes thereafter.
 * Only looks at orders from the last 24 hours so we don't endlessly retry old
 * orders whose customer email was permanently bad.
 */
import { prisma } from './prisma'
import {
  sendOrderConfirmationToCustomer,
  sendOrderNotificationToStore,
  sendShipmentCreatedEmail,
  sendDeliveryConfirmationEmail,
  sendPickupReadyEmail,
} from './email'

const LOOKBACK_HOURS    = 24
const DEFAULT_INTERVAL_MIN = 15
const MAX_PER_TYPE      = 25              // cap per email type so a backlog can't burn the rate-limit
const SEND_PACING_MS    = 250             // light pacing between sends (Resend per-second cap)

export interface SweepResult {
  scanned:        number
  confirmation:   { candidates: number; sent: number }
  store:          { candidates: number; sent: number }
  shipment:       { candidates: number; sent: number }
  delivery:       { candidates: number; sent: number }
  pickupReady:    { candidates: number; sent: number }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// ─── 1+2. Customer + Store order-confirmation retry ─────────────────────────
async function sweepConfirmationEmails(since: Date) {
  const candidates = await prisma.order.findMany({
    where: {
      createdAt:               { gte: since },
      confirmationEmailSentAt: null,
      customerEmail:           { not: null },
      status:                  { not: 'CANCELLED' },
    },
    orderBy: { createdAt: 'asc' },
    take:    MAX_PER_TYPE,
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

  let custSent = 0
  let storeSent = 0
  for (const order of candidates) {
    const emailItems = order.items.map((item) => ({
      name:  item.variant?.product?.name ?? 'Item',
      sku:   item.variant?.sku ?? '',
      size:  item.variant?.size ?? null,
      color: item.variant?.color ?? null,
      qty:   item.quantity,
      price: Number(item.unitPrice),
    }))
    const emailData = {
      orderNumber:     order.orderNumber,
      customerName:    order.customerName,
      customerEmail:   order.customerEmail!,
      items:           emailItems,
      total:           Number(order.total),
      fulfillmentType: order.fulfillmentType,
    }

    try {
      const custResult = await sendOrderConfirmationToCustomer(emailData)
      const storeResult = order.storeEmailSentAt
        ? { ok: true as const, id: null }
        : await sendOrderNotificationToStore(emailData)

      await prisma.order.update({
        where: { id: order.id },
        data: {
          confirmationEmailSentAt:    custResult.ok  ? new Date() : null,
          storeEmailSentAt:           storeResult.ok ? new Date() : order.storeEmailSentAt,
          confirmationEmailLastError: custResult.ok  ? null       : custResult.error,
        },
      })

      if (custResult.ok) {
        custSent++
        console.log(`[email-retry] ✓ Confirmation recovered ${order.orderNumber} → ${order.customerEmail}`)
      } else {
        console.error(`[email-retry] ✗ Confirmation still failing for ${order.orderNumber}: ${custResult.error}`)
      }
      if (storeResult.ok && !order.storeEmailSentAt) storeSent++
    } catch (err: any) {
      console.error(`[email-retry] Unexpected error on confirmation for ${order.orderNumber}:`, err)
    }
    await sleep(SEND_PACING_MS)
  }

  return { candidates: candidates.length, custSent, storeSent }
}

// ─── 3. Shipment / invoice email retry ──────────────────────────────────────
async function sweepShipmentEmails(since: Date) {
  // Anyone who has an AWB but never got the shipped+invoice email. Gated on
  // updatedAt rather than createdAt so a delayed dispatch (AWB generated days
  // after the order was placed) still gets a recovery shot in the lookback.
  const since2 = since
  const candidates = await prisma.order.findMany({
    where: {
      updatedAt:           { gte: since2 },
      awbNumber:           { not: null },
      trackingUrl:         { not: null },
      shipmentEmailSentAt: null,
      customerEmail:       { not: null },
      status:              { not: 'CANCELLED' },
    },
    orderBy: { updatedAt: 'asc' },
    take:    MAX_PER_TYPE,
    include: {
      items: {
        include: {
          variant: {
            select: {
              sku: true, size: true, color: true,
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

  let sent = 0
  for (const order of candidates) {
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

    try {
      const r = await sendShipmentCreatedEmail({
        orderNumber:     order.orderNumber,
        invoiceNumber:   order.invoiceNumber,
        invoiceDate:     new Date(),
        customerName:    order.customerName,
        customerEmail:   order.customerEmail!,
        customerPhone:   order.customerPhone,
        shippingAddress: order.shippingAddress,
        shippingCity:    order.shippingCity,
        shippingState:   order.shippingState,
        shippingPincode: order.shippingPincode,
        awbNumber:       order.awbNumber!,
        trackingUrl:     order.trackingUrl!,
        items:           emailItems,
        subtotal:        Number(order.subtotal),
        discount:        Number(order.discount),
        couponCode:      redemption?.coupon?.code ?? null,
        shippingFee:     Number(order.shippingFee),
        total:           Number(order.total),
      })
      await prisma.order.update({
        where: { id: order.id },
        data: {
          shipmentEmailSentAt:    r.ok ? new Date() : null,
          shipmentEmailLastError: r.ok ? null : r.error,
        },
      })
      if (r.ok) {
        sent++
        console.log(`[email-retry] ✓ Shipment recovered ${order.orderNumber} → ${order.customerEmail}`)
      } else {
        console.error(`[email-retry] ✗ Shipment still failing for ${order.orderNumber}: ${r.error}`)
      }
    } catch (err: any) {
      console.error(`[email-retry] Unexpected error on shipment for ${order.orderNumber}:`, err)
    }
    await sleep(SEND_PACING_MS)
  }

  return { candidates: candidates.length, sent }
}

// ─── 4. Delivery confirmation retry ─────────────────────────────────────────
async function sweepDeliveryEmails(since: Date) {
  // Anyone whose order is in a "delivered" terminal state (either
  // shippingStatus DELIVERED for couriered orders, OR pickedUpAt is set for
  // pickup orders) but the delivery email never went out.
  const candidates = await prisma.order.findMany({
    where: {
      updatedAt:           { gte: since },
      deliveryEmailSentAt: null,
      customerEmail:       { not: null },
      status:              { not: 'CANCELLED' },
      OR: [
        { shippingStatus: 'DELIVERED' },
        { pickedUpAt:    { not: null } },
      ],
    },
    orderBy: { updatedAt: 'asc' },
    take:    MAX_PER_TYPE,
    select: {
      id:            true,
      orderNumber:   true,
      customerName:  true,
      customerEmail: true,
      total:         true,
    },
  })

  let sent = 0
  for (const order of candidates) {
    try {
      const r = await sendDeliveryConfirmationEmail({
        orderNumber:   order.orderNumber,
        customerName:  order.customerName,
        customerEmail: order.customerEmail!,
        total:         Number(order.total),
      })
      await prisma.order.update({
        where: { id: order.id },
        data: {
          deliveryEmailSentAt:    r.ok ? new Date() : null,
          deliveryEmailLastError: r.ok ? null : r.error,
        },
      })
      if (r.ok) {
        sent++
        console.log(`[email-retry] ✓ Delivery recovered ${order.orderNumber} → ${order.customerEmail}`)
      } else {
        console.error(`[email-retry] ✗ Delivery still failing for ${order.orderNumber}: ${r.error}`)
      }
    } catch (err: any) {
      console.error(`[email-retry] Unexpected error on delivery for ${order.orderNumber}:`, err)
    }
    await sleep(SEND_PACING_MS)
  }

  return { candidates: candidates.length, sent }
}

// ─── 5. Pickup-ready retry ──────────────────────────────────────────────────
async function sweepPickupReadyEmails(since: Date) {
  const candidates = await prisma.order.findMany({
    where: {
      updatedAt:              { gte: since },
      fulfillmentType:        'PICKUP',
      pickupReadyAt:          { not: null },
      pickupReadyEmailSentAt: null,
      customerEmail:          { not: null },
      status:                 { not: 'CANCELLED' },
    },
    orderBy: { updatedAt: 'asc' },
    take:    MAX_PER_TYPE,
    select: {
      id:            true,
      orderNumber:   true,
      customerName:  true,
      customerEmail: true,
    },
  })

  let sent = 0
  for (const order of candidates) {
    try {
      const r = await sendPickupReadyEmail({
        orderNumber:   order.orderNumber,
        customerName:  order.customerName,
        customerEmail: order.customerEmail!,
      })
      await prisma.order.update({
        where: { id: order.id },
        data: {
          pickupReadyEmailSentAt:    r.ok ? new Date() : null,
          pickupReadyEmailLastError: r.ok ? null : r.error,
        },
      })
      if (r.ok) {
        sent++
        console.log(`[email-retry] ✓ Pickup-ready recovered ${order.orderNumber} → ${order.customerEmail}`)
      } else {
        console.error(`[email-retry] ✗ Pickup-ready still failing for ${order.orderNumber}: ${r.error}`)
      }
    } catch (err: any) {
      console.error(`[email-retry] Unexpected error on pickup-ready for ${order.orderNumber}:`, err)
    }
    await sleep(SEND_PACING_MS)
  }

  return { candidates: candidates.length, sent }
}

// ─── Public entry point ─────────────────────────────────────────────────────
export async function retryFailedOrderEmails(): Promise<SweepResult> {
  const since = new Date(Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000)

  const [conf, ship, deliv, ready] = await Promise.all([
    sweepConfirmationEmails(since),
    sweepShipmentEmails(since),
    sweepDeliveryEmails(since),
    sweepPickupReadyEmails(since),
  ])

  const result: SweepResult = {
    scanned:      conf.candidates + ship.candidates + deliv.candidates + ready.candidates,
    confirmation: { candidates: conf.candidates,  sent: conf.custSent  },
    store:        { candidates: conf.candidates,  sent: conf.storeSent },
    shipment:     { candidates: ship.candidates,  sent: ship.sent      },
    delivery:     { candidates: deliv.candidates, sent: deliv.sent     },
    pickupReady:  { candidates: ready.candidates, sent: ready.sent     },
  }

  if (result.scanned > 0) {
    console.log(
      `[email-retry] sweep done — ` +
      `confirm ${result.confirmation.sent}/${result.confirmation.candidates}, ` +
      `store ${result.store.sent}/${result.store.candidates}, ` +
      `shipment ${result.shipment.sent}/${result.shipment.candidates}, ` +
      `delivery ${result.delivery.sent}/${result.delivery.candidates}, ` +
      `pickup-ready ${result.pickupReady.sent}/${result.pickupReady.candidates}`
    )
  }

  return result
}

let _started = false
export function startOrderEmailRetrySweep(): void {
  if (_started) return
  _started = true

  // Interval is env-tunable so we can throttle/disable during pre-launch when
  // Neon CU-hour budget is the binding constraint. EMAIL_RETRY_MINUTES=0
  // disables the sweep entirely; the primary send at each event still fires.
  const minutes = Number(process.env.EMAIL_RETRY_MINUTES ?? DEFAULT_INTERVAL_MIN)
  if (!Number.isFinite(minutes) || minutes <= 0) {
    console.log('[email-retry] disabled (EMAIL_RETRY_MINUTES=0)')
    return
  }

  const intervalMs = minutes * 60 * 1000

  // First pass shortly after boot — picks up any orders that came in while
  // the previous instance was down.
  setTimeout(() => {
    retryFailedOrderEmails().catch((err) =>
      console.error('[email-retry] Initial sweep failed:', err)
    )
  }, 30 * 1000)

  setInterval(() => {
    retryFailedOrderEmails().catch((err) =>
      console.error('[email-retry] Periodic sweep failed:', err)
    )
  }, intervalMs)
  console.log(`[email-retry] started — sweeping every ${minutes} min`)
}
