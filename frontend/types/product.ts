// Storefront-facing product types (matches backend API response shape)

// Stage 50 — when the catalog source is Retaqo's public ecommerce API,
// each media row carries an optional `delivery` object with pre-built
// Cloudinary transformation URLs (thumb ~200px, list ~600px, detail
// ~1200px, original full-size with q_auto+f_auto). Vami's legacy
// backend responses do not populate this — getPrimaryImage falls back
// to the raw `url` automatically.
export interface ProductMediaDelivery {
  thumb: string
  list: string
  detail: string
  original: string
}

export interface ProductMedia {
  id: string
  url: string
  type: 'IMAGE' | 'VIDEO'
  altText: string | null
  isPrimary: boolean
  sortOrder: number
  delivery?: ProductMediaDelivery | null
}

export interface ProductVariant {
  id: string
  sku: string
  size: string | null
  color: string | null
  colorHex: string | null
  fabric: string | null
  style: string | null
  price: number
  isActive: boolean
  // Admin/authenticated responses carry the per-location breakdown; public
  // storefront responses are stripped to the two summary fields below
  // (see stripInternalFields in the backend product controller).
  inventory?: Array<{
    quantity: number
    reserved: number
    location: { id: string; name: string }
  }>
  availableStock?: number
  inStock?: boolean
}

export interface ProductCategory {
  id: string
  name: string
  slug: string
}

export interface Product {
  id: string
  name: string
  slug: string
  description: string | null
  basePrice: number
  category: ProductCategory
  variants: ProductVariant[]
  media: ProductMedia[]
  isFeatured: boolean
  isActive: boolean
  createdAt?: string
  // POS scan code(s), shown on the product page. Single-mode products carry one
  // `barcode`; per-colour products carry one entry per colour in `colorBarcodes`.
  barcode?: string | null
  perColorBarcode?: boolean
  colorBarcodes?: Array<{ color: string; barcode: string }>
}

// Computed helpers

// Pick the row that should drive the product card / hero image — primary
// first, then the first IMAGE row as a graceful fallback. Returns the row
// itself (not just a URL) so callers can read alt text and delivery URLs.
function pickPrimaryMedia(product: Pick<Product, 'media'>): ProductMedia | null {
  const primary = product.media.find((m) => m.isPrimary && m.type === 'IMAGE')
  const first   = product.media.find((m) => m.type === 'IMAGE')
  return primary ?? first ?? null
}

// Default — listing-card size (Stage 50: Retaqo's delivery.list is ~600px
// q_auto+f_auto; for legacy Vami responses delivery is missing and we
// fall back to the raw url unchanged, so existing call sites keep
// working identically when the Retaqo flag is OFF).
export function getPrimaryImage(product: Pick<Product, 'media'>): string | null {
  const m = pickPrimaryMedia(product)
  if (!m) return null
  return m.delivery?.list ?? m.url ?? null
}

// Smaller thumbnail — for tiny strips, navigation tiles, related-product
// rails. Falls through list → url so the same primary row is reused even
// without Retaqo's delivery field.
export function getPrimaryThumb(product: Pick<Product, 'media'>): string | null {
  const m = pickPrimaryMedia(product)
  if (!m) return null
  return m.delivery?.thumb ?? m.delivery?.list ?? m.url ?? null
}

// Product detail page — bigger transformation so PDP hero looks sharp.
export function getPrimaryDetailImage(product: Pick<Product, 'media'>): string | null {
  const m = pickPrimaryMedia(product)
  if (!m) return null
  return m.delivery?.detail ?? m.delivery?.list ?? m.url ?? null
}

// Per-media helpers — for galleries that iterate over every image and
// need the right size per slot (e.g. PDP gallery thumb strip + hero).
export function mediaThumb(m: Pick<ProductMedia, 'url' | 'delivery'>): string {
  return m.delivery?.thumb ?? m.delivery?.list ?? m.url
}
export function mediaList(m: Pick<ProductMedia, 'url' | 'delivery'>): string {
  return m.delivery?.list ?? m.url
}
export function mediaDetail(m: Pick<ProductMedia, 'url' | 'delivery'>): string {
  return m.delivery?.detail ?? m.delivery?.list ?? m.url
}

export function getAvailableStock(variant: ProductVariant): number {
  if (variant.inventory?.length) {
    return variant.inventory.reduce((total, inv) => {
      return total + Math.max(0, inv.quantity - inv.reserved)
    }, 0)
  }
  if (typeof variant.availableStock === 'number') {
    return Math.max(0, variant.availableStock)
  }
  // Transitional: responses cached before availableStock existed only carry
  // the boolean. Treat "in stock, count unknown" as 1 so the item is
  // purchasable but the qty stepper stays conservative.
  return variant.inStock ? 1 : 0
}

export function getVariantsBySize(variants: ProductVariant[]): string[] {
  const sizes = variants
    .filter((v) => v.isActive && v.size)
    .map((v) => v.size!)
  return Array.from(new Set(sizes))
}

export function getVariantsByColor(variants: ProductVariant[]): Array<{ color: string; colorHex: string | null }> {
  const seen = new Set<string>()
  return variants
    .filter((v) => v.isActive && v.color)
    .filter((v) => {
      if (seen.has(v.color!)) return false
      seen.add(v.color!)
      return true
    })
    .map((v) => ({ color: v.color!, colorHex: v.colorHex }))
}

// ─── Per-media colour association ───────────────────────────────────────────
// We carry the associated colour inside altText using the prefix
// `color:<Name>|<rest of alt text>`. This lets admins tag images with a
// specific colour variant (so the storefront can show the right photos when
// a customer selects a colour) without requiring a DB schema change.

export function parseMediaColor(altText: string | null | undefined): {
  color: string | null
  text:  string
} {
  if (!altText) return { color: null, text: '' }
  const m = altText.match(/^color:([^|]+)(?:\|(.*))?$/)
  if (!m) return { color: null, text: altText }
  return { color: m[1].trim() || null, text: (m[2] ?? '').trim() }
}

export function encodeMediaAlt(color: string | null | undefined, text: string | null | undefined): string | undefined {
  const c = (color ?? '').trim()
  const t = (text  ?? '').trim()
  if (!c && !t) return undefined
  if (!c) return t
  return `color:${c}${t ? `|${t}` : ''}`
}

export function filterMediaByColor(
  media: ProductMedia[],
  color: string | null | undefined,
): ProductMedia[] {
  if (!color) return media
  const target = color.trim().toLowerCase()
  const matched = media.filter((m) => {
    const c = parseMediaColor(m.altText).color
    return c !== null && c.trim().toLowerCase() === target
  })
  if (matched.length === 0) return media                // graceful fallback: no tagged images for this colour
  // Include untagged media too, after the colour-specific ones, so the
  // gallery still has supplementary content (e.g. lifestyle shots).
  const untagged = media.filter((m) => parseMediaColor(m.altText).color === null)
  return [...matched, ...untagged]
}

// Returns ALL media, but with the selected colour's images first, then
// untagged media, then media tagged with other colours. Within each group the
// original `sortOrder` is preserved. Customers can still scroll to every photo
// — the selected colour just leads the gallery.
export function sortMediaByColor(
  media: ProductMedia[],
  color: string | null | undefined,
): ProductMedia[] {
  const bySort = (a: ProductMedia, b: ProductMedia) => a.sortOrder - b.sortOrder
  if (!color) return [...media].sort(bySort)
  const target = color.trim().toLowerCase()

  const selected: ProductMedia[] = []
  const untagged: ProductMedia[] = []
  const others:   ProductMedia[] = []

  for (const m of media) {
    const c = parseMediaColor(m.altText).color
    if (c === null) untagged.push(m)
    else if (c.trim().toLowerCase() === target) selected.push(m)
    else others.push(m)
  }

  selected.sort(bySort)
  untagged.sort(bySort)
  others.sort(bySort)
  return [...selected, ...untagged, ...others]
}

// Cart types (also used in cart store)

export interface CartItem {
  variantId: string
  productId: string
  productName: string
  productSlug: string
  sku: string
  size: string | null
  color: string | null
  colorHex: string | null
  price: number
  quantity: number
  imageUrl: string | null
  stock?: number          // available stock at time of add — used to cap qty in cart
  categoryName?: string  // shown on cart cards
}
