import { z } from 'zod'

export const createOrderSchema = z.object({
  customerName:  z.string().max(150).optional(),
  customerEmail: z.string().email('Invalid email').max(200).optional(),
  customerPhone: z.string().max(20).optional(),
  locationId:    z.string().cuid('Invalid locationId').optional(),
  notes:         z.string().max(1000).optional(),
  items:         z
    .array(
      z.object({
        variantId: z.string().cuid('Invalid variantId'),
        quantity:  z.number().int().positive('Quantity must be ≥ 1'),
      })
    )
    .min(1, 'Order must have at least one item'),
})

export type CreateOrderInput = z.infer<typeof createOrderSchema>

export const updateOrderStatusSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']),
})

export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>

export const listOrdersSchema = z.object({
  page:   z.coerce.number().int().min(1).default(1),
  limit:  z.coerce.number().int().min(1).max(100).default(20),
  status: z
    .enum(['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'])
    .optional(),
})

export type ListOrdersQuery = z.infer<typeof listOrdersSchema>
