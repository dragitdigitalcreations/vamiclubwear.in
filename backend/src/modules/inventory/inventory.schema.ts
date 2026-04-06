import { z } from 'zod'

export const setInventorySchema = z.object({
  quantity:   z.number().int().min(0, 'Quantity cannot be negative'),
  locationId: z.string().cuid('Invalid locationId'),
})

export type SetInventoryInput = z.infer<typeof setInventorySchema>

export const adjustInventorySchema = z.object({
  delta:      z.number().int().refine((n) => n !== 0, 'Delta must be non-zero'),
  locationId: z.string().cuid('Invalid locationId'),
})

export type AdjustInventoryInput = z.infer<typeof adjustInventorySchema>

export const createLocationSchema = z.object({
  name:    z.string().min(2).max(100),
  address: z.string().max(300).optional(),
})

export type CreateLocationInput = z.infer<typeof createLocationSchema>
