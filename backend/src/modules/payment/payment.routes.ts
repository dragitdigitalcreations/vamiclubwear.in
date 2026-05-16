/**
 * Payment routes — Razorpay integration
 *
 * Required env vars:
 *   RAZORPAY_KEY_ID         — from Razorpay Dashboard → API Keys
 *   RAZORPAY_KEY_SECRET     — from Razorpay Dashboard → API Keys
 *   RAZORPAY_WEBHOOK_SECRET — from Razorpay Dashboard → Webhooks (used by /api/webhooks/razorpay)
 *
 * Flow (online prepaid only — Vami Clubwear does not offer COD):
 *   1. POST /api/payment/create-order  — creates Razorpay order + persists PaymentIntent,
 *                                        returns {rzpOrderId, amount, currency, keyId}
 *   2. Frontend opens Razorpay checkout popup, customer pays
 *   3. POST /api/payment/verify        — verifies signature, claims the intent + creates the Order
 *
 * If the browser never reaches /verify (tab closed, network drop), the Razorpay
 * `payment.captured` webhook lands at /api/webhooks/razorpay and creates the
 * order from the same PaymentIntent. The first path to atomically claim
 * `consumedAt` wins; the loser short-circuits to the already-created order.
 */
import { Router, Request, Response, NextFunction } from 'express'
import crypto from 'crypto'
import { z } from 'zod'
import { couponService } from '../coupon/coupon.service'
import { prisma } from '../../lib/prisma'
import { calcShippingFee } from '../../utils/shipping'
import { paymentService } from './payment.service'

const router = Router()

function getRazorpay() {
  const keyId     = process.env.RAZORPAY_KEY_ID
  const keySecret = process.env.RAZORPAY_KEY_SECRET
  if (!keyId || !keySecret) return null
  // Dynamic require so the server still boots without Razorpay env vars
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Razorpay = require('razorpay')
  return new Razorpay({ key_id: keyId, key_secret: keySecret })
}

// ── Schema ────────────────────────────────────────────────────────────────────

const orderItemSchema = z.object({
  variantId: z.string().cuid(),
  quantity:  z.number().int().positive(),
})

const customerSchema = z.object({
  customerName:    z.string().max(150).optional(),
  customerEmail:   z.string().email().max(200).optional(),
  customerPhone:   z.string().max(20).optional(),
  address:         z.string().max(500).optional(),
  city:            z.string().max(100).optional(),
  state:           z.string().max(100).optional(),
  pincode:         z.string().max(10).optional(),
  fulfillmentType: z.enum(['DELIVERY', 'PICKUP']).optional().default('DELIVERY'),
  notes:           z.string().max(1000).optional(),
  couponCode:      z.string().max(60).optional(),
  items:           z.array(orderItemSchema).min(1),
})

// ── POST /api/payment/create-order ───────────────────────────────────────────

router.post('/create-order', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = customerSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0]?.message ?? 'Invalid input' })
      return
    }

    const { items, couponCode, customerEmail, fulfillmentType } = parsed.data

    // Compute amount from DB prices
    const variants = await prisma.productVariant.findMany({
      where: { id: { in: items.map(i => i.variantId) } },
      select: { id: true, price: true },
    })
    const subtotal = items.reduce((sum, item) => {
      const v = variants.find(v => v.id === item.variantId)
      return sum + Number(v?.price ?? 0) * item.quantity
    }, 0)

    // Apply coupon to amount before charging Razorpay
    let discount = 0
    if (couponCode) {
      try {
        const v = await couponService.validate({ code: couponCode, subtotal, customerEmail })
        discount = v.discount
      } catch {
        // ignore — invalid code at the gateway step shouldn't block payment;
        // the customer-facing /coupons/validate already informed them.
      }
    }
    // Pickup orders are collected from the store — no shipping fee charged.
    const afterDiscount = Math.max(0, subtotal - discount)
    const shippingFee   = fulfillmentType === 'PICKUP' ? 0 : calcShippingFee(afterDiscount)
    const amount        = afterDiscount + shippingFee
    const amountPaise   = Math.round(amount * 100) // Razorpay uses paise

    const razorpay = getRazorpay()
    if (!razorpay) {
      // Razorpay not configured — return amount info only (storefront surfaces a friendly error)
      res.json({ configured: false, amount })
      return
    }

    const rzpOrder = await razorpay.orders.create({
      amount:   amountPaise,
      currency: 'INR',
      receipt:  `rcpt_${Date.now()}`,
    })

    // Persist the intent so the webhook can rebuild the order if the browser
    // never lands /verify. Stored before we tell the client to open Razorpay
    // so a webhook race never finds a missing intent.
    await prisma.paymentIntent.create({
      data: {
        rzpOrderId:      rzpOrder.id,
        customerName:    parsed.data.customerName,
        customerEmail:   parsed.data.customerEmail,
        customerPhone:   parsed.data.customerPhone,
        fulfillmentType,
        shippingAddress: parsed.data.address,
        shippingCity:    parsed.data.city,
        shippingState:   parsed.data.state,
        shippingPincode: parsed.data.pincode,
        notes:           parsed.data.notes,
        couponCode,
        items,
        amount,
      },
    })

    res.json({
      configured: true,
      rzpOrderId: rzpOrder.id,
      amount,
      amountPaise,
      currency:   'INR',
      keyId:      process.env.RAZORPAY_KEY_ID,
    })
  } catch (err) { next(err) }
})

// ── POST /api/payment/verify ─────────────────────────────────────────────────
// Called after successful Razorpay payment to verify signature + materialize
// the order from the previously-stored PaymentIntent. Idempotent: if the
// /webhooks/razorpay fallback already claimed the intent, returns that order.

const verifySchema = z.object({
  rzpOrderId:   z.string(),
  rzpPaymentId: z.string(),
  rzpSignature: z.string(),
})

router.post('/verify', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = verifySchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0]?.message ?? 'Invalid input' })
      return
    }

    const { rzpOrderId, rzpPaymentId, rzpSignature } = parsed.data

    // Verify Razorpay signature. If the secret is missing we MUST refuse —
    // silently passing would let a forged callback create a paid order.
    const keySecret = process.env.RAZORPAY_KEY_SECRET
    if (!keySecret) {
      res.status(503).json({ error: 'Payment verification is not configured. Please contact support.' })
      return
    }
    const body      = `${rzpOrderId}|${rzpPaymentId}`
    const expected  = crypto.createHmac('sha256', keySecret).update(body).digest('hex')
    if (expected !== rzpSignature) {
      res.status(400).json({ error: 'Payment verification failed. Please contact support.' })
      return
    }

    const result = await paymentService.consumeIntent(rzpOrderId)

    if (result.status === 'missing') {
      // No intent for this rzpOrderId — either /create-order was never called
      // for this id, or the row was wiped manually. Don't 500; surface clearly.
      res.status(404).json({ error: 'Order intent not found. Please contact support with your payment id.' })
      return
    }

    if (result.status === 'race') {
      // Webhook claimed in the same instant — its createOrder is in flight.
      // Tell the client to retry verify once; the second call will hit `already`.
      res.status(202).json({ pending: true })
      return
    }

    const order = result.order
    res.status(201).json({
      orderNumber: order.orderNumber,
      total:       order.total,
      status:      order.status,
    })
  } catch (err) { next(err) }
})

// ── POST /api/payment/cod ─────────────────────────────────────────────────────
// COD is not offered by Vami Clubwear. Endpoint kept as a hard 410 to make
// the policy explicit if any older client still attempts to call it.

router.post('/cod', (_req: Request, res: Response) => {
  res.status(410).json({
    error: 'Cash on Delivery is not supported. Please complete payment online via Razorpay.',
  })
})

export default router
