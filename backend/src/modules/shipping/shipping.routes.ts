/**
 * Shipping routes
 *
 * POST /api/shipping/:orderId/create   [admin] — manually create Delhivery shipment
 * POST /api/shipping/webhook           [public] — Delhivery status webhook
 * PATCH /api/shipping/:orderId/invoice [admin] — update invoice number / status
 * GET  /api/shipping/:orderId/track    [admin] — live tracking data
 */
import { Router, Request, Response, NextFunction } from 'express'
import { prisma } from '../../lib/prisma'
import { requireAuth } from '../../middleware/auth'
import {
  createDelhiveryShipment,
  trackDelhiveryShipment,
  mapDelhiveryStatus,
  checkPincodeServiceability,
} from './delhivery.service'
import { syncShippingStatuses } from './shipping.poller'
import { sendShipmentCreatedEmail, sendDeliveryConfirmationEmail } from '../../lib/email'
import { cache } from '../../lib/cache'

const router = Router()

// ── GET /api/shipping/check-pincode ──────────────────────────────────────────
// Public endpoint — checkout calls this on blur / once 6 digits are entered to
// confirm Delhivery delivers to the customer's pincode. Cached for 7 days
// because pincode-level serviceability changes very rarely.
//
// Response is intentionally generous on the "unknown" case (Delhivery outage,
// missing token, timeout) — we return ok:true so the storefront falls back to
// permitting checkout instead of hard-blocking on a 3rd-party hiccup.

router.get('/check-pincode', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pin = String(req.query.pin ?? '').trim()

    // Format guard up front — never burns a Delhivery call on garbage input.
    if (!/^[1-9][0-9]{5}$/.test(pin)) {
      res.status(400).json({
        ok: false,
        serviceable: false,
        reason: 'invalid_format',
        message: 'Pincode must be exactly 6 digits and cannot start with 0',
      })
      return
    }

    const cacheKey = `pincode:serviceability:${pin}`
    const cached = await cache.get<{
      serviceable: boolean; prepaid: boolean; oda: boolean
      city: string | null; state: string | null
    }>(cacheKey)
    if (cached) {
      res.json({ ok: true, pin, cached: true, ...cached })
      return
    }

    try {
      const result = await checkPincodeServiceability(pin)
      // 7 days — pincode coverage changes rarely; long TTL keeps Delhivery API
      // calls minimal even under heavy checkout traffic.
      await cache.set(cacheKey, {
        serviceable: result.serviceable,
        prepaid:     result.prepaid,
        oda:         result.oda,
        city:        result.city,
        state:       result.state,
      }, 60 * 60 * 24 * 7)

      res.json({
        ok: true, pin, cached: false,
        serviceable: result.serviceable,
        prepaid:     result.prepaid,
        oda:         result.oda,
        city:        result.city,
        state:       result.state,
      })
    } catch (err: any) {
      // Upstream Delhivery problem (token missing, network, timeout, 5xx).
      // Don't fail the customer's checkout because of it — return a soft
      // "unknown" status that the frontend interprets as "let them try".
      console.error('[check-pincode] upstream error:', err?.message ?? err)
      res.status(200).json({
        ok: false,
        pin,
        serviceable: null,
        reason: 'upstream_unavailable',
        message: 'We could not verify delivery for this pincode right now. You can still proceed.',
      })
    }
  } catch (err) { next(err) }
})

// ── POST /api/shipping/:orderId/create ────────────────────────────────────────

router.post('/:orderId/create', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.orderId },
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
    if (!order) { res.status(404).json({ error: 'Order not found' }); return }
    if (order.shippingStatus !== 'NOT_CREATED') {
      res.status(400).json({ error: 'Shipment already created', awbNumber: order.awbNumber })
      return
    }
    if (!order.shippingAddress || !order.shippingPincode || !order.customerPhone) {
      res.status(400).json({ error: 'Shipping address and phone are required to create a shipment' })
      return
    }

    const productDesc = order.items
      .map((i) => `${i.variant.product.name} (${i.variant.sku}) ×${i.quantity}`)
      .join(', ')

    const result = await createDelhiveryShipment({
      orderNumber:  order.orderNumber,
      customerName: order.customerName ?? 'Customer',
      phone:        order.customerPhone,
      address:      order.shippingAddress,
      city:         order.shippingCity ?? '',
      state:        order.shippingState ?? '',
      pincode:      order.shippingPincode,
      totalAmount:  Number(order.total),
      paymentMode:  'Prepaid',
      productDesc,
    })

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        shippingStatus:      'CREATED',
        awbNumber:           result.awbNumber,
        trackingUrl:         result.trackingUrl,
        delhiveryShipmentId: result.shipmentId,
      },
    })

    // Build invoice line items — pick the right barcode for each item:
    // per-colour mode → look up the colour-specific barcode, else fall back
    // to the product-level barcode. Lets staff scan the email PDF.
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

    // Look up coupon code (if any) so the invoice can label the discount.
    const redemption = (order.discount && Number(order.discount) > 0)
      ? await prisma.couponRedemption.findFirst({
          where:   { orderNumber: order.orderNumber },
          select:  { coupon: { select: { code: true } } },
          orderBy: { createdAt: 'desc' },
        })
      : null

    // Awaited so the response carries an accurate emailSent flag and the
    // shipmentEmailSentAt column reflects reality. Worst case: ~3-4s extra
    // on the admin's "Create Shipment" click — acceptable since the AWB is
    // already saved and the customer is waiting on email anyway.
    const emailResult = await sendShipmentCreatedEmail({
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
    })
    await prisma.order.update({
      where: { id: order.id },
      data: {
        shipmentEmailSentAt:    emailResult.ok ? new Date() : null,
        shipmentEmailLastError: emailResult.ok ? null : emailResult.error,
      },
    })
    if (!emailResult.ok) {
      console.error(`[email] Shipment email FAILED for ${order.orderNumber}: ${emailResult.error}`)
    }

    res.json({
      awbNumber:   result.awbNumber,
      trackingUrl: result.trackingUrl,
      status:      updated.shippingStatus,
      emailSent:   emailResult.ok,
    })
  } catch (err) { next(err) }
})

// ── POST /api/shipping/:orderId/resend-email ────────────────────────────────
// Re-send the "Your order has been shipped" email for an order that already
// has an AWB. Used when the original auto-send failed (e.g. RESEND_API_KEY
// wasn't loaded at the moment the AWB was created), or when the customer
// reports they didn't receive the tracking link.

router.post('/:orderId/resend-email', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.orderId },
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
    if (!order) { res.status(404).json({ error: 'Order not found' }); return }
    if (!order.awbNumber || !order.trackingUrl) {
      res.status(400).json({ error: 'No AWB / tracking URL on this order — create the shipment first' }); return
    }
    if (!order.customerEmail) {
      res.status(400).json({ error: 'Order has no customer email on file' }); return
    }

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

    const r = await sendShipmentCreatedEmail({
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
      awbNumber:       order.awbNumber,
      trackingUrl:     order.trackingUrl,
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
        shipmentEmailSentAt:    r.ok ? new Date() : order.shipmentEmailSentAt,
        shipmentEmailLastError: r.ok ? null : r.error,
      },
    })

    if (!r.ok) {
      res.status(502).json({ ok: false, error: r.error, sentTo: order.customerEmail })
      return
    }
    res.json({ ok: true, sentTo: order.customerEmail })
  } catch (err) { next(err) }
})

// ── GET /api/shipping/:orderId/track ─────────────────────────────────────────

router.get('/:orderId/track', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const order = await prisma.order.findUnique({ where: { id: req.params.orderId } })
    if (!order) { res.status(404).json({ error: 'Order not found' }); return }
    if (!order.awbNumber) { res.status(400).json({ error: 'No AWB number for this order' }); return }

    const data = await trackDelhiveryShipment(order.awbNumber)
    res.json({ awbNumber: order.awbNumber, trackingUrl: order.trackingUrl, liveData: data })
  } catch (err) { next(err) }
})

// ── PATCH /api/shipping/:orderId/invoice ─────────────────────────────────────

router.patch('/:orderId/invoice', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { invoiceNumber, invoicePdfUrl, invoiceStatus } = req.body as {
      invoiceNumber?: string
      invoicePdfUrl?: string
      invoiceStatus?: 'PENDING' | 'CREATED'
    }

    const order = await prisma.order.findUnique({ where: { id: req.params.orderId } })
    if (!order) { res.status(404).json({ error: 'Order not found' }); return }

    const updated = await prisma.order.update({
      where: { id: req.params.orderId },
      data: {
        ...(invoiceNumber !== undefined && { invoiceNumber }),
        ...(invoicePdfUrl !== undefined && { invoicePdfUrl }),
        ...(invoiceStatus !== undefined && { invoiceStatus }),
      },
    })

    res.json({
      invoiceStatus:  updated.invoiceStatus,
      invoiceNumber:  updated.invoiceNumber,
      invoicePdfUrl:  updated.invoicePdfUrl,
    })
  } catch (err) { next(err) }
})

// ── POST /api/shipping/webhook ────────────────────────────────────────────────
// Delhivery sends status updates here. No auth (Delhivery calls this publicly).
// Optionally verify with DELHIVERY_WEBHOOK_SECRET env var.

router.post('/webhook', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Delhivery sends JSON body with structure:
    // { packages: [{ waybill, status, status_datetime, ... }] }
    const packages: Array<{ waybill: string; status: string; [key: string]: any }> =
      req.body?.packages ?? []

    for (const pkg of packages) {
      if (!pkg.waybill) continue

      const newShippingStatus = mapDelhiveryStatus(pkg.status)
      if (!newShippingStatus) continue

      const order = await prisma.order.findFirst({ where: { awbNumber: pkg.waybill } })
      if (!order) continue

      const updates: Record<string, any> = { shippingStatus: newShippingStatus }

      // Cascade order.status to match courier reality. ANY in-flight shipping
      // status bumps a pre-shipment order to SHIPPED (previously this only
      // fired for CONFIRMED → SHIPPED, which missed couriers that jumped
      // straight to IN_TRANSIT and left the order stuck at PROCESSING).
      const PRE_SHIPMENT = ['PENDING', 'CONFIRMED', 'PROCESSING']
      const IN_FLIGHT    = ['SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY']
      if (IN_FLIGHT.includes(newShippingStatus) && PRE_SHIPMENT.includes(order.status)) {
        updates.status = 'SHIPPED'
      } else if (newShippingStatus === 'DELIVERED' && order.status !== 'DELIVERED') {
        updates.status = 'DELIVERED'
      }

      await prisma.order.update({ where: { id: order.id }, data: updates })

      // Delivery confirmation email — awaited + idempotency-gated on
      // deliveryEmailSentAt so the webhook AND the poller can't both fire it
      // when Delhivery flips to delivered and we double-mail the customer.
      // First one to arrive wins; the other becomes a no-op.
      if (
        newShippingStatus === 'DELIVERED' &&
        order.customerEmail &&
        !order.deliveryEmailSentAt
      ) {
        try {
          const r = await sendDeliveryConfirmationEmail({
            orderNumber:   order.orderNumber,
            customerName:  order.customerName,
            customerEmail: order.customerEmail,
            total:         Number(order.total),
          })
          await prisma.order.update({
            where: { id: order.id },
            data: {
              deliveryEmailSentAt:    r.ok ? new Date() : null,
              deliveryEmailLastError: r.ok ? null : r.error,
            },
          })
          if (!r.ok) console.error(`[email] Webhook delivery email FAILED for ${order.orderNumber}: ${r.error}`)
        } catch (e: any) {
          console.error('[email] webhook delivery email threw:', e)
          await prisma.order.update({
            where: { id: order.id },
            data:  { deliveryEmailLastError: e?.message ?? String(e) },
          }).catch(() => {})
        }
      }
    }

    res.json({ received: packages.length })
  } catch (err) { next(err) }
})

// ── POST /api/shipping/sync-statuses ──────────────────────────────────────────
// Force a Delhivery sync for every active shipment and report changes. The
// auto-poller already runs on a schedule; this is the manual "do it now"
// button on the Orders page.

router.post('/sync-statuses', requireAuth, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await syncShippingStatuses()
    if (result.skipped === -1) {
      res.status(400).json({ error: 'DELHIVERY_TOKEN is not configured on the server' })
      return
    }
    res.json(result)
  } catch (err) { next(err) }
})

// ── GET /api/shipping/order-track/:orderNumber ────────────────────────────────
// PUBLIC endpoint — customer tracking by order number

router.get('/order-track/:orderNumber', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, phoneLast4 } = req.query as { email?: string; phoneLast4?: string }

    if (!email && !phoneLast4) {
      res.status(400).json({ error: 'Verification required: provide email or phoneLast4' })
      return
    }

    const order = await prisma.order.findUnique({
      where: { orderNumber: req.params.orderNumber },
      select: {
        orderNumber:     true,
        status:          true,
        shippingStatus:  true,
        fulfillmentType: true,
        pickupReadyAt:   true,
        pickedUpAt:      true,
        awbNumber:       true,
        trackingUrl:     true,
        customerName:    true,
        customerEmail:   true,
        customerPhone:   true,
        total:           true,
        createdAt:       true,
        items: {
          include: {
            variant: { select: { sku: true, product: { select: { name: true } } } },
          },
        },
      },
    })
    if (!order) { res.status(404).json({ error: 'Order not found' }); return }

    const isValidEmail = email && order.customerEmail?.toLowerCase() === email.toLowerCase()
    const isValidPhone = phoneLast4 && order.customerPhone?.slice(-4) === phoneLast4
    
    if (!isValidEmail && !isValidPhone) {
      // Return 404 to avoid distinguishing between "wrong order" and "wrong verifier"
      res.status(404).json({ error: 'Order not found' })
      return
    }

    res.json(order)
  } catch (err) { next(err) }
})

export default router
