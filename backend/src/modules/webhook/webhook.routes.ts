import { Router, Request, Response, NextFunction } from 'express'
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
router.post('/delhivery', async (req: Request, res: Response, next: NextFunction) => {
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
  try {
    await webhookService.processDelhiveryWebhook(parse.data, req.body)
  } catch (err) {
    // Can't send HTTP error after res.json() — log via Express error handler
    next(err)
  }
})

export default router
