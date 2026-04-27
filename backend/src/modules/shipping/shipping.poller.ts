/**
 * Shipping status poller
 *
 * Pulls live status from Delhivery's tracking API for every order with an
 * AWB that hasn't reached a terminal state yet. Lets us auto-update the
 * admin "Shipped / In Transit / Delivered" status without depending on
 * Delhivery to call our webhook (which often isn't reliably configured).
 *
 * Triggered:
 *   - At server startup (then on a recurring interval — see index.ts)
 *   - Manually via POST /api/shipping/sync-statuses
 */

import { prisma } from '../../lib/prisma'
import { trackDelhiveryShipment, mapDelhiveryStatus } from './delhivery.service'
import { sendDeliveryConfirmationEmail } from '../../lib/email'

// Statuses that are still "in progress" — terminal ones (DELIVERED / FAILED)
// are skipped so we don't waste API calls re-checking finished shipments.
const ACTIVE_STATUSES = ['CREATED', 'SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'] as const

export interface SyncResult {
  checked:  number
  updated:  number
  skipped:  number
  errors:   Array<{ orderNumber: string; error: string }>
  changes:  Array<{ orderNumber: string; from: string; to: string }>
}

// Pull the latest aggregate status string from Delhivery's tracking response.
// The v1/packages payload has shape:
//   { ShipmentData: [ { Shipment: { Status: { Status: "Manifested", ... }, Scans: [...] } } ] }
function extractStatus(payload: any): string | null {
  const shipment = payload?.ShipmentData?.[0]?.Shipment
  if (!shipment) return null

  // Prefer the aggregate status when present
  const agg = shipment?.Status?.Status
  if (typeof agg === 'string' && agg.trim()) return agg.trim()

  // Fall back to the most recent scan's status
  const scans = shipment?.Scans
  if (Array.isArray(scans) && scans.length > 0) {
    const last = scans[scans.length - 1]
    const s = last?.ScanDetail?.Scan ?? last?.Scan
    if (typeof s === 'string' && s.trim()) return s.trim()
  }
  return null
}

export async function syncShippingStatuses(): Promise<SyncResult> {
  const result: SyncResult = { checked: 0, updated: 0, skipped: 0, errors: [], changes: [] }

  if (!process.env.DELHIVERY_TOKEN) {
    return { ...result, skipped: -1 } // -1 signals "not configured"
  }

  const orders = await prisma.order.findMany({
    where: {
      awbNumber:      { not: null },
      shippingStatus: { in: ACTIVE_STATUSES as any },
    },
    select: {
      id:             true,
      orderNumber:    true,
      awbNumber:      true,
      status:         true,
      shippingStatus: true,
      customerName:   true,
      customerEmail:  true,
      total:          true,
    },
  })

  result.checked = orders.length

  for (const order of orders) {
    if (!order.awbNumber) continue
    try {
      const data       = await trackDelhiveryShipment(order.awbNumber)
      const rawStatus  = extractStatus(data)
      if (!rawStatus) { result.skipped++; continue }

      const mapped = mapDelhiveryStatus(rawStatus)
      if (!mapped || mapped === order.shippingStatus) { result.skipped++; continue }

      const updates: Record<string, any> = { shippingStatus: mapped }

      // Cascade order.status to match courier reality. ANY in-flight shipping
      // status (SHIPPED, IN_TRANSIT, OUT_FOR_DELIVERY) bumps a pre-shipment
      // order to SHIPPED — the previous narrow rule (only CONFIRMED → SHIPPED)
      // missed cases where the courier jumped straight to IN_TRANSIT and the
      // order was sitting at PROCESSING.
      const PRE_SHIPMENT = new Set(['PENDING', 'CONFIRMED', 'PROCESSING'])
      const IN_FLIGHT    = new Set(['SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'])
      if (IN_FLIGHT.has(mapped) && PRE_SHIPMENT.has(order.status)) {
        updates.status = 'SHIPPED'
      } else if (mapped === 'DELIVERED' && order.status !== 'DELIVERED') {
        updates.status = 'DELIVERED'
      }

      await prisma.order.update({ where: { id: order.id }, data: updates })

      // Email when the package actually lands
      if (mapped === 'DELIVERED' && order.customerEmail) {
        sendDeliveryConfirmationEmail({
          orderNumber:   order.orderNumber,
          customerName:  order.customerName,
          customerEmail: order.customerEmail,
          total:         Number(order.total),
        }).catch((e) => console.error('[shipping-poll] delivery email failed:', e))
      }

      result.updated++
      result.changes.push({
        orderNumber: order.orderNumber,
        from:        order.shippingStatus,
        to:          mapped,
      })
    } catch (err: any) {
      result.errors.push({
        orderNumber: order.orderNumber,
        error:       err?.message ?? String(err),
      })
    }
  }

  return result
}

let timer: ReturnType<typeof setInterval> | null = null

/**
 * Starts a recurring background sync. Default interval = 15 minutes; override
 * with DELHIVERY_POLL_MINUTES. Set DELHIVERY_POLL_MINUTES=0 to disable.
 */
export function startShippingPoller() {
  if (timer) return

  const minutes = Number(process.env.DELHIVERY_POLL_MINUTES ?? 15)
  if (!Number.isFinite(minutes) || minutes <= 0) {
    console.log('[shipping-poll] disabled (DELHIVERY_POLL_MINUTES=0)')
    return
  }
  if (!process.env.DELHIVERY_TOKEN) {
    console.log('[shipping-poll] skipped — DELHIVERY_TOKEN is not set')
    return
  }

  const intervalMs = minutes * 60 * 1000

  // Run once shortly after boot so a freshly-started server picks up overnight
  // status changes; then on the recurring interval.
  setTimeout(() => { runOnce() }, 30 * 1000)
  timer = setInterval(runOnce, intervalMs)
  console.log(`[shipping-poll] started — checking Delhivery every ${minutes} min`)
}

function runOnce() {
  syncShippingStatuses()
    .then((r) => {
      if (r.updated > 0 || r.errors.length > 0) {
        console.log(
          `[shipping-poll] checked=${r.checked} updated=${r.updated} ` +
          `skipped=${r.skipped} errors=${r.errors.length}`
        )
        for (const c of r.changes) console.log(`  · ${c.orderNumber}: ${c.from} → ${c.to}`)
        for (const e of r.errors)  console.log(`  ! ${e.orderNumber}: ${e.error}`)
      }
    })
    .catch((e) => console.error('[shipping-poll] sync failed:', e))
}
