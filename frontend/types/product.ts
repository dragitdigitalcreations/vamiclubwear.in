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
