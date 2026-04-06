import { Router } from 'express'
import { productController } from './product.controller'
import { validate } from '../../middleware/validateRequest'
import { requireAuth } from '../../middleware/auth'
import {
  createProductSchema,
  createCategorySchema,
  createVariantSchema,
  listProductsSchema,
  updateProductSchema,
} from './product.schema'

const router = Router()

// ── Categories ────────────────────────────────────────────────────────────────
// GET  /api/products/categories
// POST /api/products/categories           [admin]

router.get('/categories', productController.listCategories)
router.post(
  '/categories',
  requireAuth,
  validate(createCategorySchema),
  productController.createCategory
)

// ── Products ──────────────────────────────────────────────────────────────────
// GET  /api/products               — list with pagination + filters
// POST /api/products               [admin] — create product + variants atomically
// GET  /api/products/slug/:slug    — public product detail by slug
// GET  /api/products/:id           — product detail by ID
// PATCH /api/products/:id          [admin] — update product metadata

router.get(
  '/',
  validate(listProductsSchema, 'query'),
  productController.listProducts as any
)

router.post(
  '/',
  requireAuth,
  validate(createProductSchema),
  productController.createProduct
)

router.get('/slug/:slug', productController.getProductBySlug)
router.get('/:id',       productController.getProduct)

router.patch(
  '/:id',
  requireAuth,
  validate(updateProductSchema),
  productController.updateProduct
)

router.delete(
  '/:id',
  requireAuth,
  productController.deleteProduct
)

// ── Variants ──────────────────────────────────────────────────────────────────
// POST /api/products/:productId/variants  [admin] — add variant to existing product
// GET  /api/products/variants/sku/:sku    — fetch variant by SKU

router.post(
  '/:productId/variants',
  requireAuth,
  validate(createVariantSchema),
  productController.addVariant
)

router.get('/variants/sku/:sku', productController.getVariantBySku)

export default router
