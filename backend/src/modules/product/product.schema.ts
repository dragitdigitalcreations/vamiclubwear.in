import { z } from 'zod'

// ── Variant ──────────────────────────────────────────────────────────────────

export const createVariantSchema = z.object({
  sku:      z.string().min(1, 'SKU is required').max(64),
  size:     z.string().max(20).optional(),
  color:    z.string().max(50).optional(),
  colorHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex colour').optional(),
  fabric:   z.string().max(50).optional(),
  style:    z.string().max(50).optional(),
  price:    z.number({ invalid_type_error: 'price must be a number' }).positive('price must be > 0'),
  stock:    z.number().int().min(0).default(0),
})

export type CreateVariantInput = z.infer<typeof createVariantSchema>

// ── Media ─────────────────────────────────────────────────────────────────────

export const mediaItemSchema = z.object({
  url:       z.string().url('Media URL must be a valid URL'),
  type:      z.enum(['IMAGE', 'VIDEO']).default('IMAGE'),
  altText:   z.string().max(200).optional(),
  isPrimary: z.boolean().default(false),
  sortOrder: z.number().int().min(0).default(0),
})

export type MediaItemInput = z.infer<typeof mediaItemSchema>

// ── Product ──────────────────────────────────────────────────────────────────

export const createProductSchema = z.object({
  name:        z.string().min(2, 'Name must be at least 2 characters').max(200),
  slug:        z.string()
                 .min(2)
                 .max(200)
                 .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only'),
  description: z.string().max(5000).optional(),
  basePrice:   z.number().positive('basePrice must be > 0'),
  categoryId:  z.string().cuid('Invalid categoryId'),
  isFeatured:  z.boolean().optional().default(false),
  variants:    z.array(createVariantSchema).min(1, 'At least one variant is required'),
  media:       z.array(mediaItemSchema).optional().default([]),
})

export type CreateProductInput = z.infer<typeof createProductSchema>

export const updateProductSchema = createProductSchema
  .partial()
  .omit({ variants: true })
  .extend({ isActive: z.boolean().optional() })
export type UpdateProductInput = z.infer<typeof updateProductSchema>

// ── Category ─────────────────────────────────────────────────────────────────

export const createCategorySchema = z.object({
  name:        z.string().min(2).max(100),
  slug:        z.string().min(2).max(100).regex(/^[a-z0-9-]+$/),
  description: z.string().max(500).optional(),
  parentId:    z.string().cuid().optional(),
})

export type CreateCategoryInput = z.infer<typeof createCategorySchema>

// ── List query ───────────────────────────────────────────────────────────────

export const listProductsSchema = z.object({
  page:       z.coerce.number().int().min(1).default(1),
  limit:      z.coerce.number().int().min(1).max(100).default(20),
  // Accept either a DB ID or a category slug — resolved in service
  categoryId: z.string().optional(),
  category:   z.string().optional(),   // category slug shorthand
  isActive:   z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
  search:     z.string().max(100).optional(),
})

export type ListProductsQuery = z.infer<typeof listProductsSchema>
