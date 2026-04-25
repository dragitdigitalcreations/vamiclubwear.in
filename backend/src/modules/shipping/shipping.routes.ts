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
import { sendShipmentCreatedEmail, sendDeliveryConfirmationEmail } from '../../lib/email'

const router = Router()

// ── POST /api/shipping/:orderId/create ────────────────────────────────────────

router.post('/:orderId/create', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.orderId },
      include: { items: { include: { variant: { select: { sku: true, product: { select: { name: true } } } } } } },
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

    // Fire-and-forget shipment email
    const emailItems = order.items.map((i) => ({
      name:  i.variant.product.name,
      sku:   i.variant.sku,
      qty:   i.quantity,
      price: Number(i.unitPrice),
    }))
    sendShipmentCreatedEmail({
      orderNumber:   order.orderNumber,
      customerName:  order.customerName,
      customerEmail: order.customerEmail,
      awbNumber:     result.awbNumber,
      trackingUrl:   result.trackingUrl,
      items:         emailItems,
      total:         Number(order.total),
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
        items: { include: { variant: { select: { sku: true, product: { select: { name: true } } } } } },
      },
    })
    if (!order) { res.status(404).json({ error: 'Order not found' }); return }
    if (!order.awbNumber || !order.trackingUrl) {
      res.status(400).json({ error: 'No AWB / tracking URL on this order — create the shipment first' }); return
    }
    if (!order.customerEmail) {
      res.status(400).json({ error: 'Order has no customer email on file' }); return
    }

    const emailItems = order.items.map((i) => ({
      name:  i.variant.product.name,
      sku:   i.variant.sku,
      qty:   i.quantity,
      price: Number(i.unitPrice),
    }))

    await sendShipmentCreatedEmail({
      orderNumber:   order.orderNumber,
      customerName:  order.customerName,
      customerEmail: order.customerEmail,
      awbNumber:     order.awbNumber,
      trackingUrl:   order.trackingUrl,
      items:         emailItems,
      total:         Number(order.total),
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

      // Map shipping status → order status
      if (newShippingStatus === 'SHIPPED' && order.status === 'CONFIRMED') {
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

// ── GET /api/shipping/order-track/:orderNumber ────────────────────────────────
// PUBLIC endpoint — customer tracking by order number

router.get('/order-track/:orderNumber', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const order = await prisma.order.findUnique({
      where: { orderNumber: req.params.orderNumber },
      select: {
        orderNumber:    true,
        status:         true,
        shippingStatus: true,
        awbNumber:      true,
        trackingUrl:    true,
        customerName:   true,
        total:          true,
        createdAt:      true,
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
