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
import { readCookie, ADMIN_COOKIE } from '../../middleware/auth'

const JWT_SECRET = process.env.JWT_SECRET ?? 'vami-dev-secret-change-in-production'

// Only reads request headers, so accept any Request variant. Typing the
// param as the full `Request` broke `listProducts`, whose req is narrowed to
// Request<{},{},{},ListProductsQuery> (query has numeric fields, not ParsedQs)
// and is therefore not assignable to the default Request — that mismatch was
// failing `tsc` and blocking every Cloud Run deploy since the F6 change.
//
// Must mirror requireAuth's precedence EXACTLY (cookie → Bearer → x-api-key).
// The F4b migration made the httpOnly `vami_admin` cookie the primary admin
// session, and getAdminToken() only sends a Bearer header when a token still
// happens to live in localStorage. A cookie-only admin (the default post-F4b,
// and the state after any 401 clears localStorage) was therefore treated as
// the public storefront here — so GET /products/:id stripped `barcode` from
// the edit form, and the next save silently wiped it to null. This helper must
// read the cookie or barcodes keep vanishing.
function isAdminRequest(req: Pick<Request, 'headers'>): boolean {
  const cookieToken = readCookie(req as Request, ADMIN_COOKIE)
  if (cookieToken) {
    try {
      jwt.verify(cookieToken, JWT_SECRET)
      return true
    } catch {}
  }
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
  delete copy.colorBarcodes

  if (copy.variants && Array.isArray(copy.variants)) {
    copy.variants = copy.variants.map((v: any) => {
      const vCopy = { ...v }
      delete vCopy.barcode
      
      if (vCopy.inventory && Array.isArray(vCopy.inventory)) {
        // Collapse per-location rows to a single number — the storefront needs
        // the available count (qty stepper cap, "Only N left") but must not see
        // location names or reserved breakdowns.
        const available = vCopy.inventory.reduce(
          (sum: number, i: any) => sum + Math.max(0, (i.quantity || 0) - (i.reserved || 0)),
          0
        )
        vCopy.availableStock = available
        vCopy.inStock = available > 0
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
