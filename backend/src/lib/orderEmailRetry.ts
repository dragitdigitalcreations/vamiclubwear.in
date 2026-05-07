/**
 * Background sweep that retries the customer order-confirmation email for any
 * recent order whose initial send didn't make it (confirmationEmailSentAt is
 * null). Without this, a transient Resend outage at the moment of checkout
 * silently strands the customer with no email.
 *
 * Runs on boot (after 30s, once Express is up) and every 15 minutes thereafter.
 * Only looks at orders from the last 24 hours so we don't endlessly retry old
 * orders whose customer email was permanently bad.
 */
import { prisma } from './prisma'
import { sendOrderConfirmationToCustomer, sendOrderNotificationToStore } from './email'

const LOOKBACK_HOURS = 24
const SWEEP_INTERVAL_MS = 15 * 60 * 1000  // 15 minutes
const MAX_PER_SWEEP = 25                  // cap so a backlog can't burn the rate-limit

export async function retryFailedOrderEmails(): Promise<{ scanned: number; retried: number; sent: number }> {
  const since = new Date(Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000)

  // Pickup and delivery orders both qualify — anything where the customer
  // never received their confirmation. Skip orders without an email at all
  // (nothing to send) and skip orders cancelled before payment.
  const candidates = await prisma.order.findMany({
    where: {
      createdAt:               { gte: since },
      confirmationEmailSentAt: null,
      customerEmail:           { not: null },
      status:                  { not: 'CANCELLED' },
    },
    orderBy: { createdAt: 'asc' },
    take:    MAX_PER_SWEEP,
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

  if (candidates.length === 0) {
    return { scanned: 0, retried: 0, sent: 0 }
  }

  console.log(`[email-retry] Found ${candidates.length} order(s) with missing confirmation email — retrying`)

  let sent = 0
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
      // Also retry the store notification if it never sent — same data so we
      // don't waste a separate sweep on it.
      const storeResult = order.storeEmailSentAt
        ? { ok: true as const, id: null }
        : await sendOrderNotificationToStore(emailData)

      await prisma.order.update({
        where: { id: order.id },
        data: {
          confirmationEmailSentAt:    custResult.ok  ? new Date() : null,
          storeEmailSentAt:           storeResult.ok ? new Date() : order.storeEmailSentAt,
          confirmationEmailLastError: custResult.ok ? null : custResult.error,
        },
      })

      if (custResult.ok) {
        sent++
        console.log(`[email-retry] ✓ Recovered ${order.orderNumber} → ${order.customerEmail}`)
      } else {
        console.error(`[email-retry] ✗ Still failing for ${order.orderNumber}: ${custResult.error}`)
      }
    } catch (err: any) {
      console.error(`[email-retry] Unexpected error on ${order.orderNumber}:`, err)
    }

    // Light pacing between sends to stay under Resend's per-second cap on bursts.
    await new Promise((r) => setTimeout(r, 250))
  }

  return { scanned: candidates.length, retried: candidates.length, sent }
}

let _started = false
export function startOrderEmailRetrySweep(): void {
  if (_started) return
  _started = true

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
  }, SWEEP_INTERVAL_MS)
}
