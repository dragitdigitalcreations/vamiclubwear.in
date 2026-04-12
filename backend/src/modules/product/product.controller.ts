import { Request, Response, NextFunction } from 'express'
import { productService } from './product.service'
import {
  CreateProductInput,
  CreateCategoryInput,
  CreateVariantInput,
  ListProductsQuery,
  UpdateProductInput,
} from './product.schema'

export const productController = {

  // ── Categories ─────────────────────────────────────────────────────────────

  createCategory: async (
    req: Request<{}, {}, CreateCategoryInput>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const category = await productService.createCategory(req.body)
      res.status(201).json(category)
    } catch (err) {
      next(err)
    }
  },

  listCategories: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const categories = await productService.listCategories()
      res.json(categories)
    } catch (err) {
      next(err)
    }
  },

  // ── Products ───────────────────────────────────────────────────────────────

  createProduct: async (
    req: Request<{}, {}, CreateProductInput>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const product = await productService.createProduct(req.body)
      res.status(201).json(product)
    } catch (err) {
      next(err)
    }
  },

  listProducts: async (
    req: Request<{}, {}, {}, ListProductsQuery>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const result = await productService.listProducts(req.query)
      res.json(result)
    } catch (err) {
      next(err)
    }
  },

  getProduct: async (
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const product = await productService.getProductById(req.params.id)
      res.json(product)
    } catch (err) {
      next(err)
    }
  },

  getProductBySlug: async (
    req: Request<{ slug: string }>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const product = await productService.getProductBySlug(req.params.slug)
      res.json(product)
    } catch (err) {
      next(err)
    }
  },

  updateProduct: async (
    req: Request<{ id: string }, {}, UpdateProductInput>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const product = await productService.updateProduct(req.params.id, req.body)
      res.json(product)
    } catch (err) {
      next(err)
    }
  },

  deleteProduct: async (
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      await productService.deleteProduct(req.params.id)
      res.json({ ok: true })
    } catch (err) {
      next(err)
    }
  },

  // ── Showcase Videos ────────────────────────────────────────────────────────

  getShowcaseVideos: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const videos = await productService.getShowcaseVideos()
      res.json(videos)
    } catch (err) {
      next(err)
    }
  },

  // ── Variants ───────────────────────────────────────────────────────────────

  addVariant: async (
    req: Request<{ productId: string }, {}, CreateVariantInput>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const variant = await productService.addVariant(req.params.productId, req.body)
      res.status(201).json(variant)
    } catch (err) {
      next(err)
    }
  },

  getVariantBySku: async (
    req: Request<{ sku: string }>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const variant = await productService.getVariantBySku(req.params.sku)
      res.json(variant)
    } catch (err) {
      next(err)
    }
  },

  getVariantByBarcode: async (
    req: Request<{ barcode: string }>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const variant = await productService.getVariantByBarcode(
        decodeURIComponent(req.params.barcode)
      )
      res.json(variant)
    } catch (err) {
      next(err)
    }
  },
}
