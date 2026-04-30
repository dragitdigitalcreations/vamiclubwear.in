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
import { createDelhiveryShipment, trackDelhiveryShipment, mapDelhiveryStatus } from './delhivery.service'
import { syncShippingStatuses } from './shipping.poller'
import { sendShipmentCreatedEmail, sendDeliveryConfirmationEmail } from '../../lib/email'

const router = Router()

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
    }).catch((e) => console.error('[email] shipment email failed:', e))

    res.json({
      awbNumber:   result.awbNumber,
      trackingUrl: result.trackingUrl,
      status:      updated.shippingStatus,
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

    await sendShipmentCreatedEmail({
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

      // Send delivery confirmation email
      if (newShippingStatus === 'DELIVERED' && order.customerEmail) {
        sendDeliveryConfirmationEmail({
          orderNumber:   order.orderNumber,
          customerName:  order.customerName,
          customerEmail: order.customerEmail,
          total:         Number(order.total),
        }).catch((e) => console.error('[email] delivery email failed:', e))
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

    res.json(order)
  } catch (err) { next(err) }
})

export default router
