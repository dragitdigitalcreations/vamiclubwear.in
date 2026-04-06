import { Router, Request, Response, NextFunction } from 'express'
import { webhookService } from './webhook.service'
import { posWebhookSchema } from './webhook.schema'

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

export default router
