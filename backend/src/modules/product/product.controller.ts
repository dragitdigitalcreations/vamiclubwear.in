import { Request, Response, NextFunction } from 'express'
import { productService } from './product.service'
import {
  CreateProductInput,
  CreateCategoryInput,
  CreateVariantInput,
  ListProductsQuery,
  UpdateProductInput,
} from './product.schema'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET ?? 'vami-dev-secret-change-in-production'

function isAdminRequest(req: Request): boolean {
  const authHeader = req.headers.authorization
  if (authHeader?.startsWith('Bearer ')) {
    try {
      jwt.verify(authHeader.slice(7), JWT_SECRET)
      return true
    } catch {}
  }
  const apiKey = req.headers['x-api-key']
  if (apiKey && (apiKey === process.env.ADMIN_API_KEY || apiKey === process.env.MANAGER_API_KEY)) {
    return true
  }
  return false
}

function stripInternalFields(product: any, isAdmin: boolean) {
  if (isAdmin || !product) return product
  
  const copy = { ...product }
  delete copy.deletedAt
  delete copy.barcode
  delete copy.perColorBarcode

  if (copy.variants && Array.isArray(copy.variants)) {
    copy.variants = copy.variants.map((v: any) => {
      const vCopy = { ...v }
      delete vCopy.barcode
      
      if (vCopy.inventory && Array.isArray(vCopy.inventory)) {
        const qty = vCopy.inventory.reduce((sum: number, i: any) => sum + (i.quantity || 0), 0)
        const res = vCopy.inventory.reduce((sum: number, i: any) => sum + (i.reserved || 0), 0)
        vCopy.inStock = (qty - res) > 0
        delete vCopy.inventory
      }
      return vCopy
    })
  }
  return copy
}

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
      const isAdmin = isAdminRequest(req)
      result.data = result.data.map(p => stripInternalFields(p, isAdmin))

      // Edge cache for 30s + serve stale for up to 5min while revalidating —
      // safe because admin product/inventory mutations bust the in-memory cache.
      res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=300')
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
      res.json(stripInternalFields(product, isAdminRequest(req)))
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
      res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=300')
      res.json(stripInternalFields(product, isAdminRequest(req)))
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

  // ── Facets ─────────────────────────────────────────────────────────────────

  getFacets: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const cat = typeof req.query.category === 'string' ? req.query.category : undefined
      const facets = await productService.getFacets(cat)
      res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
      res.json(facets)
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

  getProductByBarcode: async (
    req: Request<{ barcode: string }>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const product = await productService.getProductByBarcode(
        decodeURIComponent(req.params.barcode)
      )
      res.json(product)
    } catch (err) {
      next(err)
    }
  },
}
