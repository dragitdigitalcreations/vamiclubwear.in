import { z } from 'zod'

// Generic POS payload — accepts JSON or pre-parsed XML.
// The only required fields are sku and quantity; all else is optional.
// This keeps the endpoint decoupled from any specific POS format.

export const posWebhookSchema = z.object({
  sku:        z.string().min(1, 'sku is required'),
  quantity:   z.number().int().min(0, 'quantity must be ≥ 0'),
  locationId: z.string().cuid('Invalid locationId').optional(),
  source:     z.string().max(50).optional().default('POS'),
})

export type PosWebhookInput = z.infer<typeof posWebhookSchema>
