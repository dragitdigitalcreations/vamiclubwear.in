import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma'
import {
  CreateProductInput,
  CreateCategoryInput,
  ListProductsQuery,
  UpdateProductInput,
} from './product.schema'
import { NotFoundError, ConflictError } from '../../utils/errors'

// Reusable include for full product (storefront + admin edit)
const productFullInclude = {
  category: { select: { id: true, name: true, slug: true } },
  variants: {
    where: { isActive: true },
    select: {
      id:       true,
      sku:      true,
      size:     true,
      color:    true,
      colorHex: true,
      fabric:   true,
      style:    true,
      price:    true,
      isActive: true,
      inventory: {
        select: {
          id:         true,
          quantity:   true,
          reserved:   true,
          location:   { select: { id: true, name: true } },
        },
      },
    },
  },
  media: {
    orderBy: { sortOrder: 'asc' as const },
  },
} satisfies Prisma.ProductInclude

// Lightweight include for listing cards (skip heavy inventory join)
const productListInclude = {
  category: { select: { id: true, name: true, slug: true } },
  variants: {
    where: { isActive: true },
    select: {
      id: true, sku: true, size: true, color: true, colorHex: true,
      fabric: true, style: true, price: true, isActive: true,
    },
  },
  media: {
    where: { isPrimary: true },
    take: 1,
    orderBy: { sortOrder: 'asc' as const },
  },
} satisfies Prisma.ProductInclude

export const productService = {

  // ── Categories ─────────────────────────────────────────────────────────────

  async createCategory(data: CreateCategoryInput) {
    return prisma.category.create({ data })
  },

  async listCategories() {
    return prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: true } } },
    })
  },

  // ── Products ───────────────────────────────────────────────────────────────

  async createProduct(data: CreateProductInput) {
    // Validate no duplicate SKUs within the payload
    const skus = data.variants.map((v) => v.sku)
    if (new Set(skus).size !== skus.length) {
      throw new ConflictError('Duplicate SKUs in request — each variant must have a unique SKU')
    }

    return prisma.$transaction(async (tx) => {
      // Get or create default location so inventory can always be seeded
      let location = await tx.location.findFirst({ orderBy: { createdAt: 'asc' } })
      if (!location) {
        location = await tx.location.create({
          data: { name: 'Main Store', address: 'Manjeri, Kerala' },
        })
      }

      const product = await tx.product.create({
        data: {
          name:        data.name,
          slug:        data.slug,
          barcode:     data.barcode || null,
          description: data.description,
          basePrice:   new Prisma.Decimal(data.basePrice),
          categoryId:  data.categoryId,
          isFeatured:  data.isFeatured ?? false,
          variants: {
            create: data.variants.map((v) => ({
              sku:      v.sku,
              size:     v.size,
              color:    v.color,
              colorHex: v.colorHex,
              fabric:   v.fabric,
              style:    v.style,
              price:    new Prisma.Decimal(v.price),
            })),
          },
          // Persist media URLs returned from Cloudinary
          media: data.media && data.media.length > 0 ? {
            create: data.media.map((m, idx) => ({
              url:       m.url,
              type:      m.type,
              altText:   m.altText,
              isPrimary: m.isPrimary,
              sortOrder: m.sortOrder ?? idx,
            })),
          } : undefined,
        },
        include: productFullInclude,
      })

      // Build a SKU → stock map from input so order doesn't matter
      const stockBySku = new Map(data.variants.map((v) => [v.sku, v.stock ?? 0]))

      // Auto-create inventory entries for each variant
      for (const variant of product.variants) {
        await tx.inventory.create({
          data: {
            variantId:  variant.id,
            locationId: location.id,
            quantity:   stockBySku.get(variant.sku) ?? 0,
            reserved:   0,
            version:    0,
          },
        })
      }

      // Re-fetch with inventory included
      return tx.product.findUniqueOrThrow({
        where: { id: product.id },
        include: productFullInclude,
      })
    })
  },

  async listProducts(query: ListProductsQuery) {
    const { page, limit, categoryId, category, isActive, isFeatured, search } = query
    const skip = (page - 1) * limit

    // Resolve category slug → ID if provided
    let resolvedCategoryId = categoryId
    if (!resolvedCategoryId && category) {
      const cat = await prisma.category.findUnique({
        where: { slug: category },
        select: { id: true },
      })
      resolvedCategoryId = cat?.id
    }

    const where: Prisma.ProductWhereInput = {
      ...(resolvedCategoryId !== undefined && { categoryId: resolvedCategoryId }),
      ...(isActive           !== undefined && { isActive }),
      ...(isFeatured         !== undefined && { isFeatured }),
      ...(search             !== undefined && {
        OR: [
          { name:        { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: productListInclude,
      }),
      prisma.product.count({ where }),
    ])

    return {
      data:       products,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  },

  async getProductById(id: string) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: productFullInclude,
    })
    if (!product) throw new NotFoundError(`Product ${id}`)
    return product
  },

  async getProductBySlug(slug: string) {
    const product = await prisma.product.findUnique({
      where: { slug },
      include: productFullInclude,
    })
    if (!product) throw new NotFoundError(`Product "${slug}"`)
    return product
  },

  async updateProduct(id: string, data: UpdateProductInput) {
    await prisma.product.findUniqueOrThrow({ where: { id } }).catch(() => {
      throw new NotFoundError(`Product ${id}`)
    })

    return prisma.$transaction(async (tx) => {
      // 1. Update product-level fields
      await tx.product.update({
        where: { id },
        data: {
          ...(data.name        !== undefined && { name: data.name }),
          ...(data.slug        !== undefined && { slug: data.slug }),
          ...(data.barcode !== undefined && { barcode: data.barcode || null }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.basePrice   !== undefined && { basePrice: new Prisma.Decimal(data.basePrice) }),
          ...(data.categoryId  !== undefined && { categoryId: data.categoryId }),
          ...(data.isFeatured  !== undefined && { isFeatured: data.isFeatured }),
          ...(data.isActive    !== undefined && { isActive:   data.isActive }),
          // Replace media if provided
          ...(data.media && data.media.length > 0 && {
            media: {
              deleteMany: {},
              create: data.media.map((m, idx) => ({
                url:       m.url,
                type:      m.type,
                altText:   m.altText,
                isPrimary: m.isPrimary,
                sortOrder: m.sortOrder ?? idx,
              })),
            },
          }),
        },
      })

      // 2. Sync variants if provided
      if (data.variants && data.variants.length > 0) {
        // Get default location for inventory
        const location = await tx.location.findFirst({ orderBy: { createdAt: 'asc' } })

        for (const v of data.variants) {
          const existing = await tx.productVariant.findUnique({ where: { sku: v.sku } })

          if (existing && existing.productId === id) {
            // Update existing variant
            await tx.productVariant.update({
              where: { sku: v.sku },
              data: {
                size:     v.size,
                color:    v.color,
                colorHex: v.colorHex,
                fabric:   v.fabric,
                style:    v.style,
                price:    new Prisma.Decimal(v.price),
              },
            })
            // Update stock if location available
            if (location && v.stock !== undefined) {
              await tx.inventory.updateMany({
                where: { variantId: existing.id, locationId: location.id },
                data:  { quantity: v.stock },
              })
            }
          } else if (!existing) {
            // Create new variant
            const created = await tx.productVariant.create({
              data: {
                productId: id,
                sku:      v.sku,
                size:     v.size,
                color:    v.color,
                colorHex: v.colorHex,
                fabric:   v.fabric,
                style:    v.style,
                price:    new Prisma.Decimal(v.price),
              },
            })
            if (location) {
              await tx.inventory.create({
                data: {
                  variantId:  created.id,
                  locationId: location.id,
                  quantity:   v.stock ?? 0,
                  reserved:   0,
                  version:    0,
                },
              })
            }
          }
        }
      }

      // 3. Return updated product
      return tx.product.findUniqueOrThrow({
        where: { id },
        include: productFullInclude,
      })
    })
  },

  // ── Showcase Videos ────────────────────────────────────────────────────────
  // Returns active products that have at least one VIDEO media entry.
  // Used by the homepage video-showcase strip.

  async getShowcaseVideos(limit = 12) {
    return prisma.product.findMany({
      where: {
        isActive: true,
        media: { some: { type: 'VIDEO' } },
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id:        true,
        name:      true,
        slug:      true,
        basePrice: true,
        media: {
          where:   { type: 'VIDEO' },
          take:    1,
          orderBy: { sortOrder: 'asc' },
          select:  { url: true },
        },
      },
    })
  },

  // ── Variants ───────────────────────────────────────────────────────────────

  async addVariant(productId: string, variant: import('./product.schema').CreateVariantInput) {
    const exists = await prisma.product.count({ where: { id: productId } })
    if (!exists) throw new NotFoundError(`Product ${productId}`)

    return prisma.productVariant.create({
      data: {
        productId,
        sku:      variant.sku,
        size:     variant.size,
        color:    variant.color,
        colorHex: variant.colorHex,
        fabric:   variant.fabric,
        style:    variant.style,
        price:    new Prisma.Decimal(variant.price),
      },
    })
  },

  async getProductByBarcode(barcode: string) {
    const product = await prisma.product.findUnique({
      where: { barcode },
      select: {
        id: true, name: true, slug: true,
        variants: {
          where: { isActive: true },
          select: {
            id: true, sku: true, size: true, color: true,
            colorHex: true, fabric: true, style: true, price: true,
            inventory: {
              select: { quantity: true, reserved: true },
              take: 1, orderBy: { createdAt: 'asc' },
            },
          },
          orderBy: { sku: 'asc' },
        },
      },
    })
    if (!product) throw new NotFoundError(`No product found for barcode "${barcode}"`)
    return product
  },

  async deleteProduct(id: string) {
    await prisma.product.findUniqueOrThrow({ where: { id } }).catch(() => {
      throw new NotFoundError(`Product ${id}`)
    })
    // Cascade: delete inventory → orderItems ref variants (keep orders, just delete product+variants+media)
    await prisma.$transaction(async (tx) => {
      const variants = await tx.productVariant.findMany({ where: { productId: id }, select: { id: true } })
      const variantIds = variants.map((v) => v.id)
      await tx.inventory.deleteMany({ where: { variantId: { in: variantIds } } })
      await tx.productMedia.deleteMany({ where: { productId: id } })
      await tx.productVariant.deleteMany({ where: { productId: id } })
      await tx.product.delete({ where: { id } })
    })
    return { ok: true }
  },

  async getVariantBySku(sku: string) {
    const variant = await prisma.productVariant.findUnique({
      where: { sku },
      include: {
        product: { select: { id: true, name: true, slug: true } },
        inventory: { include: { location: { select: { id: true, name: true } } } },
      },
    })
    if (!variant) throw new NotFoundError(`Variant SKU "${sku}"`)
    return variant
  },
}
