// Storefront-facing product types (matches backend API response shape)

export interface ProductMedia {
  id: string
  url: string
  type: 'IMAGE' | 'VIDEO'
  altText: string | null
  isPrimary: boolean
  sortOrder: number
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
  inventory?: Array<{
    quantity: number
    reserved: number
    location: { id: string; name: string }
  }>
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
}

// Computed helpers

export function getPrimaryImage(product: Pick<Product, 'media'>): string | null {
  const primary = product.media.find((m) => m.isPrimary && m.type === 'IMAGE')
  const first   = product.media.find((m) => m.type === 'IMAGE')
  return (primary ?? first)?.url ?? null
}

export function getAvailableStock(variant: ProductVariant): number {
  if (!variant.inventory?.length) return 0
  return variant.inventory.reduce((total, inv) => {
    return total + Math.max(0, inv.quantity - inv.reserved)
  }, 0)
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
