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

// ─── Delhivery SCANPUSH webhook (default payload format v2) ────────────────
//
// Actual default payload from the requirement doc (VERSION 2.0):
//   {
//     "Shipment": {
//       "Status": {                    ← nested object, NOT a string
//         "Status":         "Manifested",
//         "StatusDateTime": "2019-01-09T17:10:42.767",
//         "StatusType":     "UD",
//         "StatusLocation": "Chandigarh_Raiprkln_C (Chandigarh)",
//         "Instructions":   "Manifest uploaded"
//       },
//       "PickUpDate":  "2019-01-09 17:10:42.543",
//       "NSLCode":     "X-UCI",
//       "Sortcode":    "IXC/MDP",
//       "ReferenceNo": "28",       ← our order number if echoed back
//       "AWB":         "XXXXXXXXXXXX"
//     }
//   }
//
// We act on:  Shipment.AWB  +  Shipment.Status.Status

export const delhiveryStatusSchema = z.object({
  Status:         z.string().min(1),
  StatusDateTime: z.string().optional(),
  StatusType:     z.string().optional(),
  StatusLocation: z.string().optional(),
  Instructions:   z.string().optional(),
})

export const delhiveryShipmentSchema = z.object({
  AWB:         z.string().min(1),
  Status:      delhiveryStatusSchema,
  PickUpDate:  z.string().optional(),
  NSLCode:     z.string().optional(),
  Sortcode:    z.string().optional(),
  ReferenceNo: z.string().optional(),  // our order number if echoed back
})

export const delhiveryWebhookSchema = z.object({
  Shipment: delhiveryShipmentSchema,
})

export type DelhiveryWebhookInput = z.infer<typeof delhiveryWebhookSchema>
