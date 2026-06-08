// Stage 50 — Retaqo public ecommerce catalog client (server-only).
//
// Fetches from Retaqo's GET /api/public/ecommerce/products and adapts
// the response into Vami's existing `Product` shape so the storefront
// rendering layer doesn't have to change.
//
// IMPORTANT:
//   - This file imports nothing that pulls it into a client bundle, but
//     the `RETAQO_ECOMMERCE_API_KEY` env var is intentionally NOT
//     prefixed with NEXT_PUBLIC_, so Next.js will inline it into the
//     server bundle only. Never re-export the raw key or pass it to a
//     client component.
//   - Stage 49B requires limit ≤ 100 at the zod boundary. We clamp.
//   - When the env is incomplete or the request fails, the helpers
//     return null and the caller falls back to Vami's legacy backend
//     (server-api.ts orchestrates the fallback).
//
// Mapping notes (Retaqo → Vami):
//   - Retaqo's `products[]` envelope -> { data, total, totalPages, page, limit }
//     so the rest of the Vami code (which checks result.data and
//     result.total) keeps working.
//   - Retaqo prices live on variants in paise (string for BigInt safety);
//     Vami's Product.basePrice is a number in rupees. Derive basePrice
//     as the min variant price in rupees.
//   - Retaqo variants don't carry per-variant inventory in the public
//     listing; the storefront's existing "out of stock" UI degrades to
//     "available" — Stage 51 is the right place to add inventory.
//   - Retaqo's `media[].delivery` is the win — we pass it straight
//     through so the Stage 49A optimized URLs reach the rendering layer.

import type {
  Product,
  ProductMedia,
  ProductMediaDelivery,
  ProductVariant,
} from '@/types/product'

const RETAQO_API_URL = process.env.RETAQO_API_URL ?? ''
const RETAQO_ECOMMERCE_API_KEY = process.env.RETAQO_ECOMMERCE_API_KEY ?? ''

export interface RetaqoListParams {
  page?: number
  limit?: number
  displayCategorySlug?: string
  cursor?: string
  revalidate?: number | false
}

export interface RetaqoListResult {
  data: Product[]
  total: number
  page: number
  limit: number
  totalPages: number
  nextCursor: string | null
}

// Stage 49A response shape — narrow enough to type the bits we read.
interface RetaqoMediaDtoDelivery {
  thumb: string
  list: string
  detail: string
  original: string
}
interface RetaqoMediaDto {
  id: string
  variantId: string | null
  mediaType: string
  url: string
  provider: string
  altText: string | null
  sortOrder: number
  isPrimary: boolean
  color: string | null
  size: string | null
  delivery: RetaqoMediaDtoDelivery | null
}
interface RetaqoVariantDto {
  id: string
  sku: string
  barcode: string | null
  name: string | null
  unitPricePaise: string // BigInt-safe
  taxRateBps: number
}
interface RetaqoProductDto {
  id: string
  name: string
  description: string | null
  hsnCode: string | null
  slug: string | null
  shortDescription: string | null
  longDescription: string | null
  seoTitle: string | null
  seoDescription: string | null
  publishStatus: string
  tags: unknown
  featured: boolean
  displayCategory: { id: string; name: string; slug: string | null } | null
  media: RetaqoMediaDto[]
  variants: RetaqoVariantDto[]
}
interface RetaqoListResponse {
  products: RetaqoProductDto[]
  nextCursor: string | null
}

export function isRetaqoCatalogEnabled(): boolean {
  return (
    process.env.RETAQO_CATALOG_ENABLED === '1' &&
    RETAQO_API_URL.length > 0 &&
    RETAQO_ECOMMERCE_API_KEY.length > 0
  )
}

function paiseToRupees(paise: string | number | bigint): number {
  try {
    const n = typeof paise === 'bigint' ? paise : BigInt(String(paise))
    // 1 rupee = 100 paise. Convert through Number — Vami's UI uses 32-bit
    // money widths so the precision loss is fine for storefront display.
    return Number(n) / 100
  } catch {
    return 0
  }
}

function adaptMedia(m: RetaqoMediaDto): ProductMedia {
  const delivery: ProductMediaDelivery | null = m.delivery
    ? {
        thumb: m.delivery.thumb,
        list: m.delivery.list,
        detail: m.delivery.detail,
        original: m.delivery.original,
      }
    : null
  return {
    id: m.id,
    url: m.url,
    type: m.mediaType === 'VIDEO' ? 'VIDEO' : 'IMAGE',
    altText: m.altText,
    isPrimary: m.isPrimary,
    sortOrder: m.sortOrder,
    delivery,
  }
}

function adaptVariant(v: RetaqoVariantDto): ProductVariant {
  return {
    id: v.id,
    sku: v.sku,
    size: null,
    color: null,
    colorHex: null,
    fabric: null,
    style: null,
    price: paiseToRupees(v.unitPricePaise),
    isActive: true,
    // inventory left undefined — Retaqo's public listing doesn't expose
    // per-variant stock; Stage 51 (orders integration) will add this.
  }
}

export function adaptProduct(p: RetaqoProductDto): Product {
  const variants = p.variants.map(adaptVariant)
  const minPrice = variants.length > 0 ? Math.min(...variants.map((v) => v.price)) : 0
  // Retaqo separates the storefront "displayCategory" from the internal
  // POS "categoryId". The storefront only cares about displayCategory.
  const category = p.displayCategory
    ? {
        id: p.displayCategory.id,
        name: p.displayCategory.name,
        slug: p.displayCategory.slug ?? '',
      }
    : { id: '', name: '', slug: '' }
  return {
    id: p.id,
    name: p.name,
    slug: p.slug ?? p.id,
    description: p.shortDescription ?? p.description ?? null,
    basePrice: minPrice,
    category,
    variants,
    media: p.media.map(adaptMedia),
    isFeatured: !!p.featured,
    isActive: p.publishStatus === 'ACTIVE',
  }
}

export async function retaqoList(params: RetaqoListParams = {}): Promise<RetaqoListResult | null> {
  if (!isRetaqoCatalogEnabled()) return null

  // Stage 49B caps server-side at 100; honour it client-side too so
  // a misconfigured caller doesn't trip the zod 400.
  const limit = Math.max(1, Math.min(params.limit ?? 50, 100))
  const page = Math.max(1, params.page ?? 1)

  // The Retaqo public listing uses cursor pagination, not offset. For
  // Stage 50 we walk forward `page-1` times to map Vami's existing
  // ?page= contract onto cursors. Each walk is one network request;
  // listing pages typically hit page 1 or 2, so the overhead is small.
  // Filter responses are scoped (e.g. ~11 anarkali products) so
  // pagination beyond page 1 is rare.
  const url = new URL('/api/public/ecommerce/products', RETAQO_API_URL)
  url.searchParams.set('limit', String(limit))
  if (params.displayCategorySlug) {
    url.searchParams.set('displayCategorySlug', params.displayCategorySlug)
  }
  if (params.cursor) {
    url.searchParams.set('cursor', params.cursor)
  }

  let cursor: string | null = params.cursor ?? null
  let body: RetaqoListResponse | null = null
  let walked = 0
  // Walk forward to reach the requested page. Cap at 50 hops as a safety
  // bound — Retaqo only has 27 products today so even a misconfigured
  // page=99 just lands on the empty tail.
  const targetHops = params.cursor ? 0 : page - 1
  for (let i = 0; i <= targetHops && walked <= 50; i++) {
    const hopUrl = new URL(url.toString())
    if (cursor && i > 0) hopUrl.searchParams.set('cursor', cursor)
    const res = await fetchOnce(hopUrl.toString(), params.revalidate ?? 60)
    if (!res) return null
    body = res
    cursor = res.nextCursor
    walked++
    if (cursor === null && i < targetHops) {
      // No more products before the operator-requested page. Honest
      // empty response is better than wrapping or 500ing.
      return {
        data: [],
        total: 0,
        page,
        limit,
        totalPages: i + 1,
        nextCursor: null,
      }
    }
  }
  if (!body) return null

  const data = body.products.map(adaptProduct)
  // Retaqo doesn't return a total count (cursor pagination). Vami's UI
  // uses total only for the page X of Y label — surface a best-effort
  // estimate based on whether more rows exist.
  const total = body.nextCursor ? page * limit + 1 : (page - 1) * limit + data.length
  const totalPages = body.nextCursor ? page + 1 : page
  return { data, total, page, limit, totalPages, nextCursor: body.nextCursor }
}

async function fetchOnce(url: string, revalidate: number | false): Promise<RetaqoListResponse | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'x-api-key': RETAQO_ECOMMERCE_API_KEY,
        'content-type': 'application/json',
      },
      next: revalidate === false ? { revalidate: 0 } : { revalidate },
    })
    if (!res.ok) {
      // Surface the status to server logs so a 401/403 on the API key
      // shows up in Vercel logs without taking down the page.
      console.error(`[retaqo-catalog] ${res.status} ${url}`)
      return null
    }
    return (await res.json()) as RetaqoListResponse
  } catch (err) {
    console.error('[retaqo-catalog] fetch failed', err)
    return null
  }
}
