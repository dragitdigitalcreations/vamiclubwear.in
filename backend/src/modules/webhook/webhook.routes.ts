import { Router, Request, Response, NextFunction } from 'express'
import crypto from 'crypto'
import { webhookService } from './webhook.service'
import { posWebhookSchema, delhiveryWebhookSchema } from './webhook.schema'

const router = Router()

/**
 * POST /api/webhooks/pos
 *
 * Generic POS stock-update endpoint.
 * Accepts JSON or pre-parsed XML (caller normalises to JSON before POST).
 * Not coupled to any specific POS system.
 *
 * Body:
 *   { sku, quantity, locationId?, source? }
 */
router.post('/pos', async (req: Request, res: Response, next: NextFunction) => {
  const parse = posWebhookSchema.safeParse(req.body)

  if (!parse.success) {
    res.status(400).json({
      error: 'Invalid payload',
      details: parse.error.errors.map((e) => ({
        field:   e.path.join('.'),
        message: e.message,
      })),
    })
    return
  }

  try {
    const result = await webhookService.processPosUpdate(parse.data, req.body)
    res.json(result)
  } catch (err) {
    next(err)
  }
})

/**
 * POST /api/webhooks/delhivery
 *
 * Delhivery SCANPUSH webhook — real-time shipment status updates.
 *
 * Auth:   Header  X-Delhivery-Secret: <value>  must match env DELHIVERY_WEBHOOK_SECRET
 * Body:   Default Delhivery payload  { Shipment: {...}, ScanDetail: [...] }
 *
 * Always responds 200 quickly (Delhivery retries on non-200).
 * Heavy DB work happens after the response is sent, except on validation errors
 * where we return 400 immediately (so Delhivery knows the payload is bad).
 */
router.post('/delhivery', async (req: Request, res: Response, _next: NextFunction) => {
  // ── 1. Auth guard ────────────────────────────────────────────────────────
  const secret = process.env.DELHIVERY_WEBHOOK_SECRET
  if (secret) {
    const provided = req.headers['x-delhivery-secret']
    if (!provided || provided !== secret) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }
  }

  // ── 2. Schema validation ─────────────────────────────────────────────────
  const parse = delhiveryWebhookSchema.safeParse(req.body)
  if (!parse.success) {
    res.status(400).json({
      error: 'Invalid payload',
      details: parse.error.errors.map((e) => ({
        field:   e.path.join('.'),
        message: e.message,
      })),
    })
    return
  }

  // ── 3. Acknowledge immediately — Delhivery expects 200 within 500 ms ─────
  res.status(200).json({ received: true })

  // ── 4. Process asynchronously after response ──────────────────────────────
  // The 200 above is already flushed, so we CANNOT call next(err) here —
  // the global error handler would try to write a second response and throw
  // ERR_HTTP_HEADERS_SENT. Log directly instead; Delhivery already got its ack.
  try {
    await webhookService.processDelhiveryWebhook(parse.data, req.body)
  } catch (err) {
    console.error('[webhook:delhivery] post-ack processing failed:', err)
  }
})

/**
 * POST /api/webhooks/razorpay
 *
 * Razorpay webhook — server-side fallback that creates the order when the
 * browser never makes it to /api/payment/verify (closed tab, network drop).
 *
 * Auth:   Header  X-Razorpay-Signature: <hex>  =  HMAC-SHA256 of the raw
 *         request body using RAZORPAY_WEBHOOK_SECRET.
 *
 * Events handled: `payment.captured`, `order.paid`. Everything else is
 * logged as SKIPPED so Razorpay marks delivery successful and doesn't retry.
 *
 * Always responds 200 quickly. The actual order-creation work happens
 * synchronously before the response so the test webhook in the Razorpay
 * dashboard reflects the real outcome.
 */
router.post('/razorpay', async (req: Request, res: Response, next: NextFunction) => {
  // ── 1. Auth guard — refuse if the secret is missing OR the signature
  //      doesn't match. Razorpay computes HMAC over the *raw bytes* of the
  //      request body, so we use the rawBody buffer captured by the
  //      express.json verify hook in src/index.ts. Falling back to the
  //      stringified parsed body would change whitespace and break the HMAC.
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET
  if (!secret) {
    res.status(503).json({ error: 'Razorpay webhook not configured' })
    return
  }

  const raw = (req as any).rawBody as Buffer | undefined
  if (!raw) {
    res.status(400).json({ error: 'Missing raw body — cannot verify signature' })
    return
  }

  const provided = req.headers['x-razorpay-signature']
  if (typeof provided !== 'string') {
    res.status(401).json({ error: 'Missing signature header' })
    return
  }
  const expected = crypto.createHmac('sha256', secret).update(raw).digest('hex')
  // timingSafeEqual requires equal length; if not equal length, fail closed.
  const provBuf = Buffer.from(provided, 'utf8')
  const expBuf  = Buffer.from(expected, 'utf8')
  if (provBuf.length !== expBuf.length || !crypto.timingSafeEqual(provBuf, expBuf)) {
    res.status(401).json({ error: 'Invalid signature' })
    return
  }

  // ── 2. Process synchronously — work is small and Razorpay accepts 200
  //      well under the 5s budget.
  try {
    const result = await webhookService.processRazorpayWebhook(req.body, req.body)
    res.status(200).json({ received: true, ...result })
  } catch (err) {
    next(err)
  }
})

export default router
