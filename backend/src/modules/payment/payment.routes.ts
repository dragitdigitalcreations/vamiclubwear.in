/**
 * Payment routes — Razorpay integration
 *
 * Required env vars:
 *   RAZORPAY_KEY_ID     — from Razorpay Dashboard → API Keys
 *   RAZORPAY_KEY_SECRET — from Razorpay Dashboard → API Keys
 *
 * Flow:
 *   1. POST /api/payment/create-order  — creates Razorpay order, returns {orderId, amount, currency, keyId}
 *   2. Frontend opens Razorpay checkout popup, customer pays
 *   3. POST /api/payment/verify        — verifies signature, creates DB order, deducts inventory
 *   4. POST /api/payment/cod           — COD path: skips Razorpay, creates DB order directly
 */
import { Router, Request, Response, NextFunction } from 'express'
import crypto from 'crypto'
import { z } from 'zod'
import { orderService } from '../order/order.service'
import { prisma } from '../../lib/prisma'
import { sendOrderConfirmationToCustomer, sendOrderNotificationToStore } from '../../lib/email'

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
  customerName:  z.string().max(150).optional(),
  customerEmail: z.string().email().max(200).optional(),
  customerPhone: z.string().max(20).optional(),
  address:       z.string().max(500).optional(),
  city:          z.string().max(100).optional(),
  state:         z.string().max(100).optional(),
  pincode:       z.string().max(10).optional(),
  notes:         z.string().max(1000).optional(),
  items:         z.array(orderItemSchema).min(1),
})

// ── POST /api/payment/create-order ───────────────────────────────────────────

router.post('/create-order', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = customerSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0]?.message ?? 'Invalid input' })
      return
    }

    const { items } = parsed.data

    // Compute amount from DB prices
    const variants = await prisma.productVariant.findMany({
      where: { id: { in: items.map(i => i.variantId) } },
      select: { id: true, price: true },
    })
    const amount = items.reduce((sum, item) => {
      const v = variants.find(v => v.id === item.variantId)
      return sum + Number(v?.price ?? 0) * item.quantity
    }, 0)
    const amountPaise = Math.round(amount * 100) // Razorpay uses paise

    const razorpay = getRazorpay()
    if (!razorpay) {
      // Razorpay not configured — return amount info only (COD will be used)
      res.json({ configured: false, amount })
      return
    }

    const rzpOrder = await razorpay.orders.create({
      amount:   amountPaise,
      currency: 'INR',
      receipt:  `rcpt_${Date.now()}`,
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
// Called after successful Razorpay payment to verify signature + create order

const verifySchema = customerSchema.extend({
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

    const { rzpOrderId, rzpPaymentId, rzpSignature, items, ...customer } = parsed.data

    // Verify Razorpay signature
    const keySecret = process.env.RAZORPAY_KEY_SECRET
    if (keySecret) {
      const body      = `${rzpOrderId}|${rzpPaymentId}`
      const expected  = crypto.createHmac('sha256', keySecret).update(body).digest('hex')
      if (expected !== rzpSignature) {
        res.status(400).json({ error: 'Payment verification failed. Please contact support.' })
        return
      }
    }

    // Create DB order + deduct inventory
    const order = await orderService.createOrder({
      ...customer,
      items,
      notes: [
        customer.notes,
        customer.address ? `Address: ${customer.address}, ${customer.city ?? ''}, ${customer.state ?? ''} - ${customer.pincode ?? ''}` : '',
      ].filter(Boolean).join('\n'),
    })

    // Update payment status
    await prisma.order.update({
      where: { id: order.id },
      data:  { paymentStatus: 'PAID' },
    })

    res.status(201).json({
      orderNumber: order.orderNumber,
      total:       order.total,
      status:      order.status,
    })
  } catch (err) { next(err) }
})

// ── POST /api/payment/cod ─────────────────────────────────────────────────────
// Cash on Delivery — no Razorpay, creates order directly

router.post('/cod', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = customerSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0]?.message ?? 'Invalid input' })
      return
    }

    const { items, address, city, state, pincode, notes, ...customer } = parsed.data

    const order = await orderService.createOrder({
      ...customer,
      items,
      notes: [
        notes,
        address ? `Address: ${address}, ${city ?? ''}, ${state ?? ''} - ${pincode ?? ''}` : '',
      ].filter(Boolean).join('\n'),
    })

    res.status(201).json({
      orderNumber: order.orderNumber,
      total:       order.total,
      status:      order.status,
      itemCount:   order.items.length,
    })
  } catch (err) { next(err) }
})

export default router
