import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma'
import {
  CreateProductInput,
  CreateCategoryInput,
  ListProductsQuery,
  UpdateProductInput,
} from './product.schema'
import { NotFoundError, ConflictError } from '../../utils/errors'
import { cache } from '../../lib/cache'

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

// Lightweight include for listing cards
// Includes minimal inventory (quantity + reserved only) so the frontend
// can cap cart quantity correctly, and 2 images for the hover-swap effect.
const productListInclude = {
  category: { select: { id: true, name: true, slug: true } },
  variants: {
    where: { isActive: true },
    select: {
      id: true, sku: true, size: true, color: true, colorHex: true,
      fabric: true, style: true, price: true, isActive: true,
      inventory: {
        select: { quantity: true, reserved: true },
      },
    },
  },
  media: {
    where: { type: 'IMAGE' as const },
    take: 2,
    orderBy: { sortOrder: 'asc' as const },
  },
} satisfies Prisma.ProductInclude

// ─── Uniqueness helpers ─────────────────────────────────────────────────────
// Append `-2`, `-3`... until an unused slug/SKU is found. Prevents cross-product
// collisions without surfacing raw DB errors to the admin.

async function uniqueSlug(base: string, excludeId?: string): Promise<string> {
  let candidate = base
  let i = 2
  while (true) {
    const hit = await prisma.product.findUnique({ where: { slug: candidate }, select: { id: true } })
    if (!hit || hit.id === excludeId) return candidate
    candidate = `${base}-${i++}`
    if (i > 500) throw new ConflictError('Could not resolve unique slug after 500 attempts')
  }
}

async function uniqueSku(base: string, ownerVariantId?: string): Promise<string> {
  let candidate = base
  let i = 2
  while (true) {
    const hit = await prisma.productVariant.findUnique({ where: { sku: candidate }, select: { id: true } })
    if (!hit || hit.id === ownerVariantId) return candidate
    candidate = `${base}-${i++}`
    if (i > 500) throw new ConflictError('Could not resolve unique SKU after 500 attempts')
  }
}

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
    // De-duplicate SKUs within the payload by appending -2, -3… to any repeats
    // (prevents in-request clashes; cross-product clashes are resolved below).
    const seen = new Map<string, number>()
    const dedupedVariants = data.variants.map((v) => {
      const n = (seen.get(v.sku) ?? 0) + 1
      seen.set(v.sku, n)
      return { ...v, sku: n === 1 ? v.sku : `${v.sku}-${n}` }
    })

    // Resolve slug + SKU uniqueness BEFORE opening the transaction so P2002 can't
    // bubble up as a confusing "record with this slug already exists" message.
    const uniqueProductSlug = await uniqueSlug(data.slug)
    const resolvedVariants = await Promise.all(
      dedupedVariants.map(async (v) => ({ ...v, sku: await uniqueSku(v.sku) })),
    )

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
          slug:        uniqueProductSlug,
          barcode:     data.barcode || null,
          description: data.description,
          basePrice:   new Prisma.Decimal(data.basePrice),
          categoryId:  data.categoryId,
          isFeatured:  data.isFeatured ?? false,
          variants: {
            create: resolvedVariants.map((v) => ({
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
      const stockBySku = new Map(resolvedVariants.map((v) => [v.sku, v.stock ?? 0]))

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

    // Virtual "big-size" category: any product with an active variant sized XXXL or larger.
    // This is a filter, not a stored category — so products auto-appear on the Big Size
    // page as soon as such a variant is created.
    const BIG_SIZE_TOKENS = ['XXXL', '3XL', '4XL', '5XL', '6XL', '7XL', '8XL', '9XL', '10XL']
    const isBigSize = category === 'big-size'

    // Resolve category slug → ID if provided (skip for big-size virtual filter).
    // IMPORTANT: if the caller passed a category slug that doesn't match any row,
    // return an empty result set — DO NOT silently fall through to "all products".
    let resolvedCategoryId = categoryId
    let categorySlugUnmatched = false
    if (!resolvedCategoryId && category && !isBigSize) {
      const cat = await prisma.category.findUnique({
        where: { slug: category },
        select: { id: true },
      })
      if (cat) {
        resolvedCategoryId = cat.id
      } else {
        categorySlugUnmatched = true
      }
    }

    if (categorySlugUnmatched) {
      return { data: [], total: 0, page, limit, totalPages: 0 }
    }

    // Full-text search via raw Prisma query for PostgreSQL GIN index performance
    // Falls back to ILIKE for short/single-word queries
    let productIdsFromSearch: string[] | undefined
    if (search && search.trim().length >= 2) {
      try {
        const tsQuery = search.trim().split(/\s+/).map(w => `${w}:*`).join(' & ')
        const rows = await prisma.$queryRaw<{ id: string }[]>`
          SELECT id FROM "Product"
          WHERE to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, ''))
            @@ to_tsquery('english', ${tsQuery})
          LIMIT 200
        `
        productIdsFromSearch = rows.map(r => r.id)
      } catch {
        // GIN index not yet available — fall through to ILIKE
      }
    }

    const where: Prisma.ProductWhereInput = {
      deletedAt: null,
      ...(resolvedCategoryId !== undefined && { categoryId: resolvedCategoryId }),
      ...(isActive           !== undefined && { isActive }),
      ...(isFeatured         !== undefined && { isFeatured }),
      ...(isBigSize && {
        variants: {
          some: {
            isActive: true,
            OR: BIG_SIZE_TOKENS.map((s) => ({
              size: { equals: s, mode: 'insensitive' as const },
            })),
          },
        },
      }),
      ...(search             !== undefined && (
        productIdsFromSearch !== undefined
          ? { id: { in: productIdsFromSearch } }
          : {
              OR: [
                { name:        { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
              ],
            }
      )),
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
    const product = await prisma.product.findFirst({
      where: { id, deletedAt: null },
      include: productFullInclude,
    })
    if (!product) throw new NotFoundError(`Product ${id}`)
    return product
  },

  async getProductBySlug(slug: string) {
    return cache.wrap(
      `product:slug:${slug}`,
      async () => {
        const product = await prisma.product.findFirst({
          where: { slug, deletedAt: null },
          include: productFullInclude,
        })
        if (!product) throw new NotFoundError(`Product "${slug}"`)
        return product
      },
      60, // 60s — invalidated on update/delete, short floor for price edits
    )
  },

  async updateProduct(id: string, data: UpdateProductInput) {
    const existing = await prisma.product.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, slug: true, variants: { select: { id: true, sku: true } } },
    })
    if (!existing) throw new NotFoundError(`Product ${id}`)

    // Resolve slug uniqueness (allow same slug to stay unchanged)
    const resolvedSlug =
      data.slug !== undefined && data.slug !== existing.slug
        ? await uniqueSlug(data.slug, id)
        : undefined

    // Pre-resolve SKU uniqueness for each payload variant — allow a variant to
    // keep its own SKU (owner check) but auto-bump if it clashes with another.
    const resolvedVariants = data.variants
      ? await Promise.all(
          data.variants.map(async (v) => ({ ...v, sku: await uniqueSku(v.sku, v.id) })),
        )
      : undefined

    return prisma.$transaction(async (tx) => {
      // 1. Update product-level fields
      await tx.product.update({
        where: { id },
        data: {
          ...(data.name        !== undefined && { name: data.name }),
          ...(resolvedSlug     !== undefined && { slug: resolvedSlug }),
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

      // 2. Sync variants — authoritative replace: update by id, create new,
      //    drop omitted. Identifying by `id` means regenerated SKUs (from
      //    dimension edits) no longer create phantom duplicates.
      if (resolvedVariants && resolvedVariants.length > 0) {
        const location = await tx.location.findFirst({ orderBy: { createdAt: 'asc' } })
        const payloadIds = new Set(resolvedVariants.map((v) => v.id).filter((x): x is string => !!x))

        // Drop variants not in payload. Soft-delete if referenced by orders
        // (FK Restrict); hard-delete otherwise so they're gone from every
        // storefront filter and the total count reflects reality.
        const toRemove = existing.variants.filter((v) => !payloadIds.has(v.id))
        for (const v of toRemove) {
          const orderedCount = await tx.orderItem.count({ where: { variantId: v.id } })
          if (orderedCount > 0) {
            await tx.productVariant.update({
              where: { id: v.id },
              data:  { isActive: false },
            })
            await tx.inventory.updateMany({
              where: { variantId: v.id },
              data:  { quantity: 0, reserved: 0 },
            })
          } else {
            await tx.inventory.deleteMany({ where: { variantId: v.id } })
            await tx.productVariant.delete({ where: { id: v.id } })
          }
        }

        for (const v of resolvedVariants) {
          let variantId: string

          if (v.id && existing.variants.some((ev) => ev.id === v.id)) {
            // Update existing
            await tx.productVariant.update({
              where: { id: v.id },
              data: {
                sku:      v.sku,
                size:     v.size,
                color:    v.color,
                colorHex: v.colorHex,
                fabric:   v.fabric,
                style:    v.style,
                price:    new Prisma.Decimal(v.price),
                isActive: true,
              },
            })
            variantId = v.id
          } else {
            // Create new
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
            variantId = created.id
          }

          // Upsert inventory for the default location so new variants are
          // immediately purchasable when admin sets stock > 0, and existing
          // variants that somehow missed a row get one.
          if (location && v.stock !== undefined) {
            const inv = await tx.inventory.findUnique({
              where: { variantId_locationId: { variantId, locationId: location.id } },
            })
            if (inv) {
              await tx.inventory.update({
                where: { id: inv.id },
                data:  { quantity: v.stock },
              })
            } else {
              await tx.inventory.create({
                data: {
                  variantId,
                  locationId: location.id,
                  quantity:   v.stock,
                  reserved:   0,
                  version:    0,
                },
              })
            }
          }
        }
      }

      // 3. Return updated product
      const updated = await tx.product.findUniqueOrThrow({
        where: { id },
        include: productFullInclude,
      })

      // Invalidate caches for this product (old + new slug in case it changed)
      cache.del(`product:slug:${existing.slug}`).catch(() => {})
      cache.del(`product:slug:${updated.slug}`).catch(() => {})
      cache.delPattern('products:list:*').catch(() => {})

      return updated
    })
  },

  // ── Showcase Videos ────────────────────────────────────────────────────────
  // Returns active products that have at least one VIDEO media entry.
  // Used by the homepage video-showcase strip.

  async getShowcaseVideos(limit = 12) {
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        deletedAt: null,
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
        variants: {
          where:   { isActive: true },
          orderBy: { price: 'asc' },
          take:    1,
          select:  { price: true },
        },
      },
    })
    // Return lowest active-variant price (or basePrice as fallback)
    return products.map((p) => ({
      id:          p.id,
      name:        p.name,
      slug:        p.slug,
      basePrice:   Number(p.basePrice),
      lowestPrice: p.variants.length > 0 ? Number(p.variants[0].price) : Number(p.basePrice),
      media:       p.media,
    }))
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
    const product = await prisma.product.findFirst({
      where: { barcode, deletedAt: null },
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
    const toDelete = await prisma.product.findUnique({ where: { id } })
    if (!toDelete) throw new NotFoundError(`Product ${id}`)

    // If any variant is referenced by an order, hard-delete would violate the
    // OrderItem.variantId FK (Restrict). Soft-delete instead to preserve order history.
    const orderedCount = await prisma.orderItem.count({
      where: { variant: { productId: id } },
    })

    if (orderedCount > 0) {
      await prisma.$transaction(async (tx) => {
        // Free up the unique slug/barcode so a new product can reuse them
        const suffix = `:deleted:${Date.now()}`
        await tx.product.update({
          where: { id },
          data: {
            deletedAt: new Date(),
            isActive:  false,
            slug:      `${toDelete.slug}${suffix}`,
            barcode:   toDelete.barcode ? `${toDelete.barcode}${suffix}` : null,
          },
        })
        await tx.productVariant.updateMany({
          where: { productId: id },
          data:  { isActive: false },
        })
        // Zero out inventory so listings/POS sync don't see phantom stock
        await tx.inventory.updateMany({
          where: { variant: { productId: id } },
          data:  { quantity: 0, reserved: 0 },
        })
      })
    } else {
      // No order history — safe to hard-delete
      await prisma.$transaction(async (tx) => {
        const variants = await tx.productVariant.findMany({ where: { productId: id }, select: { id: true } })
        const variantIds = variants.map((v) => v.id)
        await tx.inventory.deleteMany({ where: { variantId: { in: variantIds } } })
        await tx.productMedia.deleteMany({ where: { productId: id } })
        await tx.productVariant.deleteMany({ where: { productId: id } })
        await tx.product.delete({ where: { id } })
      })
    }

    cache.del(`product:slug:${toDelete.slug}`).catch(() => {})
    cache.delPattern('products:list:*').catch(() => {})
    return { ok: true, soft: orderedCount > 0 }
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
