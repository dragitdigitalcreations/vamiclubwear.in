'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion'
import { ChevronLeft, ChevronRight, Play, ShoppingBag, ChevronDown, ArrowRight, Zap, Heart, Barcode, Copy, Check } from 'lucide-react'
import {
  Product,
  ProductMedia,
  ProductVariant,
  getVariantsBySize,
  getVariantsByColor,
  getAvailableStock,
  parseMediaColor,
  filterMediaByColor,
} from '@/types/product'
import { useCartStore } from '@/stores/cartStore'
import { useWishlistStore } from '@/stores/wishlistStore'
import { useCustomerAuthStore } from '@/stores/customerAuthStore'
import { useAuthStore } from '@/stores/authStore'
import { toast } from '@/stores/toastStore'
import { cloudinaryUrl } from '@/lib/cloudinary'
import { productsApi } from '@/lib/api'
import { ProductCard } from '@/components/shop/ProductCard'

// ─── Media Gallery ─────────────────────────────────────────────────────────────
function MediaGallery({ media, selectedColor }: { media: ProductMedia[]; selectedColor: string | null }) {
  const filtered = filterMediaByColor(media, selectedColor)
  const sorted   = [...filtered].sort((a, b) => a.sortOrder - b.sortOrder)
  const [active, setActive] = useState(0)

  // When the colour changes the filtered list may shorten — clamp the index.
  useEffect(() => {
    setActive(0)
  }, [selectedColor])

  const current = sorted[active] ?? sorted[0]
  const touchStartX = useRef<number | null>(null)

  function prev() { setActive((i) => (i - 1 + sorted.length) % sorted.length) }
  function next() { setActive((i) => (i + 1) % sorted.length) }

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null || sorted.length <= 1) return
    const delta = e.changedTouches[0].clientX - touchStartX.current
    if (delta > 50) prev()
    else if (delta < -50) next()
    touchStartX.current = null
  }

  return (
    <div className="flex flex-col gap-4 md:flex-row-reverse">
      {/* Main media */}
      <div
        className="relative aspect-[3/4] flex-1 overflow-hidden bg-surface-elevated touch-pan-y"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, scale: 1.03 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0"
          >
            {current?.type === 'VIDEO' ? (
              <video
                src={current.url}
                className="h-full w-full object-cover"
                autoPlay muted loop playsInline
              />
            ) : current?.url ? (
              <Image
                src={cloudinaryUrl(current.url, { w: 900, q: 85 })}
                alt={current.altText ?? 'Product image'}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 55vw"
                priority
              />
            ) : (
              <div className="flex h-full items-center justify-center text-muted">
                <ShoppingBag className="h-16 w-16 opacity-20" />
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {sorted.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center bg-white/85 text-on-background backdrop-blur-sm transition-colors hover:bg-white"
              aria-label="Previous"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center bg-white/85 text-on-background backdrop-blur-sm transition-colors hover:bg-white"
              aria-label="Next"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5">
              {sorted.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActive(i)}
                  className={`h-1 rounded-full transition-all ${i === active ? 'w-5 bg-white' : 'w-1.5 bg-white/40'}`}
                  aria-label={`Image ${i + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {sorted.length > 1 && (
        <div className="flex gap-2 overflow-x-auto md:flex-col md:overflow-y-auto md:w-20">
          {sorted.map((item, i) => (
            <button
              key={item.id}
              onClick={() => setActive(i)}
              className={`relative flex-shrink-0 h-20 w-16 overflow-hidden rounded border-2 transition-all duration-200 md:h-24 md:w-full ${
                i === active ? 'border-on-background opacity-100' : 'border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              {item.type === 'VIDEO' ? (
                <div className="flex h-full items-center justify-center bg-surface-elevated text-muted">
                  <Play className="h-4 w-4" />
                </div>
              ) : (
                <Image
                  src={cloudinaryUrl(item.url, { w: 120, q: 70 })}
                  alt={item.altText ?? ''}
                  fill
                  className="object-cover"
                  sizes="80px"
                />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Variant Selector ─────────────────────────────────────────────────────────
interface VariantSelectorProps {
  product:  Product
  selected: ProductVariant | null
  onChange: (v: ProductVariant) => void
}

function VariantSelector({ product, selected, onChange }: VariantSelectorProps) {
  const sizes  = getVariantsBySize(product.variants)
  const colors = getVariantsByColor(product.variants)

  const [selectedSize,  setSelectedSize]  = useState<string | null>(selected?.size  ?? sizes[0]  ?? null)
  const [selectedColor, setSelectedColor] = useState<string | null>(selected?.color ?? colors[0]?.color ?? null)

  const resolveVariant = useCallback((size: string | null, color: string | null) => {
    const match = product.variants.find((v) => {
      const sizeOk  = !size  || v.size  === size
      const colorOk = !color || v.color === color
      return v.isActive && sizeOk && colorOk
    })
    if (match) onChange(match)
  }, [product.variants, onChange])

  useEffect(() => { resolveVariant(selectedSize, selectedColor) }, [selectedSize, selectedColor, resolveVariant])

  // ── Availability = variant isActive AND in-stock (inventory > reserved) ──
  const isCombinationInStock = (size: string | null, color: string | null) =>
    product.variants.some((v) => {
      if (!v.isActive) return false
      if (size  && v.size  !== size)  return false
      if (color && v.color !== color) return false
      return getAvailableStock(v) > 0
    })

  return (
    <div className="space-y-6">
      {colors.length > 0 && (
        <div>
          <p className="mb-3 text-xs font-medium uppercase tracking-widest text-muted">
            Color — <span className="text-on-background">{selectedColor ?? '—'}</span>
          </p>
          <div className="flex flex-wrap gap-2.5">
            {colors.map((c) => {
              const available = isCombinationInStock(selectedSize, c.color)
              const isSelected = selectedColor === c.color
              return (
                <button
                  key={c.color}
                  onClick={() => available && setSelectedColor(c.color)}
                  disabled={!available}
                  title={`${c.color}${available ? '' : ' — unavailable'}`}
                  className={`relative h-7 w-7 rounded-full border-2 transition-all duration-200 ${
                    available ? 'hover:scale-110' : 'cursor-not-allowed opacity-55'
                  } ${isSelected ? 'border-on-background scale-110' : 'border-transparent'}`}
                >
                  <span
                    className="absolute inset-1 rounded-full"
                    style={{ backgroundColor: c.colorHex ?? '#888' }}
                  />
                  {/* Diagonal strike-through when unavailable */}
                  {!available && (
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-0 flex items-center justify-center"
                    >
                      <span className="block h-[1.5px] w-[130%] rotate-45 bg-red-400/90" />
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {sizes.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-widest text-muted">Size</p>
            <button className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-muted hover:text-on-background transition-colors">
              Size Guide <ChevronDown className="h-3 w-3" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {sizes.map((size) => {
              const available = isCombinationInStock(size, selectedColor)
              return (
                <button
                  key={size}
                  onClick={() => available && setSelectedSize(size)}
                  disabled={!available}
                  title={available ? size : `${size} — unavailable`}
                  className={`min-w-[3rem] border px-3 py-2 text-xs font-medium uppercase tracking-wider transition-all duration-200 ${
                    selectedSize === size
                      ? 'border-on-background bg-on-background text-background'
                      : available
                      ? 'border-border text-muted hover:border-on-background hover:text-on-background'
                      : 'border-border/60 text-muted/40 cursor-not-allowed line-through decoration-red-400/80 decoration-[1.5px]'
                  }`}
                >
                  {size}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Sticky Add-to-Cart Bar ────────────────────────────────────────────────────
function StickyCartBar({
  product,
  variant,
  qty,
  onAdd,
  stock,
  added,
}: {
  product:  Product
  variant:  ProductVariant | null
  qty:      number
  onAdd:    () => void
  stock:    number
  added:    boolean
}) {
  const price = variant ? Number(variant.price) : Number(product.basePrice)

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 80, opacity: 0 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="fixed bottom-0 inset-x-0 z-50 border-t border-border bg-background/95 backdrop-blur-md shadow-[0_-4px_24px_rgba(0,0,0,0.4)]"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-8">
        <div className="flex items-center gap-3 min-w-0">
          {/* Thumbnail */}
          {product.media.find((m) => m.type === 'IMAGE') && (
            <div className="relative h-12 w-9 flex-shrink-0 overflow-hidden rounded bg-surface-elevated">
              <Image
                src={cloudinaryUrl(
                  product.media.find((m) => m.type === 'IMAGE')!.url,
                  { w: 80, q: 70 }
                )}
                alt={product.name}
                fill
                className="object-cover"
                sizes="40px"
              />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium text-on-background leading-tight truncate">{product.name}</p>
            <p className="text-xs text-muted">
              {variant?.size && <span>{variant.size}</span>}
              {variant?.size && variant?.color && <span> · </span>}
              {variant?.color && <span>{variant.color}</span>}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-base font-semibold text-on-background hidden sm:block">
            ₹{price.toLocaleString('en-IN')}
          </span>
          <button
            onClick={onAdd}
            disabled={!variant || stock === 0}
            className={`flex items-center gap-2 px-6 py-3 text-xs font-semibold uppercase tracking-wider transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed ${
              added ? 'bg-green-700 text-white' : 'bg-primary text-white hover:bg-primary/90 active:scale-[0.98]'
            }`}
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            {added ? 'Added!' : stock === 0 ? 'Out of Stock' : 'Add to Bag'}
          </button>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Admin-only Barcode Panel ──────────────────────────────────────────────────
// Visible only to logged-in admin staff. Lets shop staff cross-check stock at
// the POS scanner if a sale was missed during checkout.
function AdminBarcodePanel({
  product,
  variant,
}: {
  product: Product
  variant: ProductVariant | null
}) {
  const isStaff = useAuthStore((s) => s.isAuthenticated && !!s.user)
  const [copied, setCopied] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  // Avoid SSR/CSR mismatch — auth state is hydrated client-side from localStorage
  useEffect(() => { setMounted(true) }, [])

  if (!mounted || !isStaff) return null

  const p              = product as Product & {
    barcode?:         string | null
    perColorBarcode?: boolean
    colorBarcodes?:   Array<{ color: string; barcode: string }>
  }
  const perColor       = !!p.perColorBarcode
  const colorBarcodes  = p.colorBarcodes ?? []
  const activeColor    = variant?.color ?? null
  const activeColorBc  = perColor && activeColor
    ? colorBarcodes.find((c) => c.color === activeColor)?.barcode ?? null
    : null

  const hasAnyBarcode = perColor ? colorBarcodes.length > 0 : !!p.barcode
  if (!hasAnyBarcode) return null

  function copy(value: string) {
    navigator.clipboard?.writeText(value).then(() => {
      setCopied(value)
      setTimeout(() => setCopied(null), 1500)
    }).catch(() => {})
  }

  return (
    <div className="mt-6 rounded-md border border-dashed border-amber-500/40 bg-amber-500/5 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Barcode className="h-3.5 w-3.5 text-amber-400" />
        <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-400">
          Admin · POS Cross-Check
        </span>
      </div>

      {!perColor && p.barcode && (
        <div className="flex items-center justify-between gap-3 rounded border border-border bg-surface px-3 py-2">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-muted">Product Barcode</p>
            <p className="font-mono text-sm text-on-background truncate">{p.barcode}</p>
          </div>
          <button
            type="button"
            onClick={() => copy(p.barcode!)}
            className="flex shrink-0 items-center gap-1 rounded border border-border px-2 py-1 text-[10px] uppercase tracking-wider text-muted transition-colors hover:border-on-background hover:text-on-background"
            aria-label="Copy barcode"
          >
            {copied === p.barcode
              ? <><Check className="h-3 w-3 text-green-400" />Copied</>
              : <><Copy className="h-3 w-3" />Copy</>}
          </button>
        </div>
      )}

      {perColor && (
        <div className="space-y-2">
          {activeColorBc && (
            <div className="flex items-center justify-between gap-3 rounded border border-amber-500/30 bg-surface px-3 py-2">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-muted">
                  Selected colour — <span className="text-amber-300">{activeColor}</span>
                </p>
                <p className="font-mono text-sm text-on-background truncate">{activeColorBc}</p>
              </div>
              <button
                type="button"
                onClick={() => copy(activeColorBc)}
                className="flex shrink-0 items-center gap-1 rounded border border-border px-2 py-1 text-[10px] uppercase tracking-wider text-muted transition-colors hover:border-on-background hover:text-on-background"
                aria-label="Copy barcode"
              >
                {copied === activeColorBc
                  ? <><Check className="h-3 w-3 text-green-400" />Copied</>
                  : <><Copy className="h-3 w-3" />Copy</>}
              </button>
            </div>
          )}

          {colorBarcodes.length > 1 && (
            <details className="rounded border border-border bg-surface">
              <summary className="cursor-pointer px-3 py-2 text-[10px] uppercase tracking-wider text-muted hover:text-on-background">
                All colour barcodes ({colorBarcodes.length})
              </summary>
              <div className="divide-y divide-border">
                {colorBarcodes.map((c) => (
                  <div key={c.color} className="flex items-center justify-between gap-3 px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-wider text-muted">{c.color}</p>
                      <p className="font-mono text-xs text-on-background truncate">{c.barcode}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => copy(c.barcode)}
                      className="flex shrink-0 items-center gap-1 rounded border border-border px-2 py-1 text-[10px] uppercase tracking-wider text-muted transition-colors hover:border-on-background hover:text-on-background"
                      aria-label={`Copy ${c.color} barcode`}
                    >
                      {copied === c.barcode
                        ? <><Check className="h-3 w-3 text-green-400" />Copied</>
                        : <><Copy className="h-3 w-3" />Copy</>}
                    </button>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Related Products ──────────────────────────────────────────────────────────
function RelatedProducts({ categorySlug, excludeId }: { categorySlug: string; excludeId: string }) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    productsApi.list({ isActive: 'true', category: categorySlug, limit: 6 })
      .then((res) => {
        const all = (res as any).data ?? []
        setProducts(all.filter((p: Product) => p.id !== excludeId).slice(0, 4))
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false))
  }, [categorySlug, excludeId])

  if (!loading && products.length === 0) return null

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 md:px-8">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <p className="mb-1 text-[11px] uppercase tracking-[0.35em] text-primary-light">You May Also Like</p>
          <h2 className="font-display text-3xl font-bold text-on-background md:text-4xl">Related Pieces</h2>
        </div>
        <Link href={`/products?category=${categorySlug}`}
          className="hidden items-center gap-2 text-xs font-medium uppercase tracking-widest text-muted transition-colors hover:text-on-background md:flex">
          View All <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 md:gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i}>
                <div className="skeleton aspect-[4/7] w-full rounded-[4px]" />
                <div className="mt-3 space-y-2 px-1">
                  <div className="skeleton h-4 w-3/4 rounded" />
                  <div className="skeleton h-3 w-1/3 rounded" />
                  <div className="skeleton h-3 w-1/4 rounded" />
                </div>
              </div>
            ))
          : products.map((p, i) => (
              <motion.div key={p.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
                <ProductCard product={p} />
              </motion.div>
            ))}
      </div>
    </section>
  )
}

// ─── Main Client Component ─────────────────────────────────────────────────────
export function ProductDetailClient({ product }: { product: Product }) {
  const { addItem }                    = useCartStore()
  const { toggleItem, isWishlisted }   = useWishlistStore()
  const customerAuthed                 = useCustomerAuthStore((s) => !!s.token && !!s.user)
  const openPrompt                     = useCustomerAuthStore((s) => s.openPrompt)
  const router                         = useRouter()
  const addToCartRef                   = useRef<HTMLButtonElement>(null)

  const [variant, setVariant] = useState<ProductVariant | null>(
    () => product.variants.find((v) => v.isActive) ?? null
  )
  const [qty,          setQty]          = useState(1)
  const [added,        setAdded]        = useState(false)
  const [showSticky,   setShowSticky]   = useState(false)

  // Show sticky bar when main button scrolls out of view
  const { scrollY } = useScroll()
  useMotionValueEvent(scrollY, 'change', (y) => {
    if (!addToCartRef.current) return
    const rect = addToCartRef.current.getBoundingClientRect()
    setShowSticky(rect.bottom < 0)
  })

  const stock = variant ? getAvailableStock(variant) : 0
  const price = variant ? Number(variant.price) : Number(product.basePrice)

  function handleAddToCart() {
    if (!product || !variant) return
    if (!customerAuthed) {
      openPrompt('Sign in to save items to your cart and checkout seamlessly.')
      return
    }
    const imageUrl = product.media.find((m) => m.isPrimary && m.type === 'IMAGE')?.url
                  ?? product.media.find((m) => m.type === 'IMAGE')?.url
                  ?? null
    addItem({
      variantId:    variant.id,
      productId:    product.id,
      productName:  product.name,
      productSlug:  product.slug,
      sku:          variant.sku,
      size:         variant.size,
      color:        variant.color,
      colorHex:     variant.colorHex,
      price:        Number(variant.price),
      imageUrl,
      stock:        stock > 0 ? stock : undefined,
      categoryName: product.category.name,
    })
    setAdded(true)
    toast.success(`${product.name} added to your bag`)
    setTimeout(() => setAdded(false), 2000)
  }

  function handleBuyNow() {
    handleAddToCart()
    router.push('/cart')
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="mx-auto max-w-7xl px-4 pt-28 pb-10 md:px-8"
      >
        {/* Breadcrumb */}
        <nav className="mb-8 flex items-center gap-2 text-xs text-muted flex-wrap">
          <Link href="/" className="hover:text-on-background transition-colors">Home</Link>
          <span>/</span>
          <Link href="/products" className="hover:text-on-background transition-colors">Collections</Link>
          <span>/</span>
          <Link href={`/products?category=${product.category.slug}`} className="hover:text-on-background transition-colors">
            {product.category.name}
          </Link>
          <span>/</span>
          <span className="text-on-background truncate max-w-[200px]">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
          {/* Media — swaps to the colour-specific set when a colour is selected */}
          <MediaGallery media={product.media} selectedColor={variant?.color ?? null} />

          {/* Info */}
          <div className="flex flex-col">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="mb-2 text-xs font-medium uppercase tracking-[0.3em] text-primary-light">
                {product.category.name}
              </p>
              <div className="flex items-start justify-between gap-4">
                <h1 className="font-display text-3xl font-bold leading-tight text-on-background md:text-4xl">
                  {product.name}
                </h1>
                <button
                  onClick={() => toggleItem({
                    id:        product.id,
                    name:      product.name,
                    slug:      product.slug,
                    basePrice: Number(product.basePrice),
                    imageUrl:  product.media.find((m) => m.type === 'IMAGE')?.url ?? null,
                    category:  product.category.name,
                  })}
                  className={`mt-1 flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-full border transition-all duration-200 hover:scale-110 ${
                    isWishlisted(product.id)
                      ? 'border-primary bg-primary text-white'
                      : 'border-border text-muted hover:border-primary hover:bg-primary hover:text-white'
                  }`}
                  aria-label={isWishlisted(product.id) ? 'Remove from wishlist' : 'Add to wishlist'}
                >
                  <Heart className={`h-4 w-4 ${isWishlisted(product.id) ? 'fill-white' : ''}`} />
                </button>
              </div>
              <p className="mt-4 text-2xl font-semibold text-on-background">
                ₹{price.toLocaleString('en-IN')}
              </p>
              {variant && stock > 0 && stock <= 5 && (
                <motion.p
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="mt-1 text-xs font-medium text-amber-400"
                >
                  Only {stock} left
                </motion.p>
              )}
              {variant && stock === 0 && (
                <p className="mt-1 text-xs font-medium text-red-400">Out of stock</p>
              )}
            </motion.div>

            {product.description && (
              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18, duration: 0.5 }}
                className="mt-6 text-sm leading-relaxed text-muted border-t border-border pt-6"
              >
                {product.description}
              </motion.p>
            )}

            {/* Product Details — fabric, style, category, sku, price range */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22, duration: 0.5 }}
              className="mt-6 border-t border-border pt-6"
            >
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-on-background">Product Details</p>
              <dl className="grid grid-cols-1 gap-y-2 text-sm sm:grid-cols-[140px_1fr]">
                {variant?.fabric && (
                  <>
                    <dt className="text-muted uppercase tracking-wider text-[11px]">Fabric</dt>
                    <dd className="text-on-background">{variant.fabric}</dd>
                  </>
                )}
                {variant?.style && (
                  <>
                    <dt className="text-muted uppercase tracking-wider text-[11px]">Style / Cut</dt>
                    <dd className="text-on-background">{variant.style}</dd>
                  </>
                )}
                <dt className="text-muted uppercase tracking-wider text-[11px]">Category</dt>
                <dd className="text-on-background">{product.category.name}</dd>
                {variant?.size && (
                  <>
                    <dt className="text-muted uppercase tracking-wider text-[11px]">Size</dt>
                    <dd className="text-on-background">{variant.size}</dd>
                  </>
                )}
                {variant?.color && (
                  <>
                    <dt className="text-muted uppercase tracking-wider text-[11px]">Colour</dt>
                    <dd className="text-on-background">{variant.color}</dd>
                  </>
                )}
              </dl>
              {(() => {
                const fabrics = Array.from(new Set(product.variants.filter(v => v.isActive && v.fabric).map(v => v.fabric as string)))
                const styles  = Array.from(new Set(product.variants.filter(v => v.isActive && v.style ).map(v => v.style  as string)))
                const extras: string[] = []
                if (fabrics.length > 1) extras.push(`Fabrics: ${fabrics.join(', ')}`)
                if (styles.length  > 1) extras.push(`Styles: ${styles.join(', ')}`)
                return extras.length ? (
                  <p className="mt-3 text-[11px] text-muted leading-relaxed">
                    {extras.join(' · ')}
                  </p>
                ) : null
              })()}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.26, duration: 0.5 }}
              className="mt-8 border-t border-border pt-8"
            >
              <VariantSelector product={product} selected={variant} onChange={setVariant} />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.34, duration: 0.5 }}
              className="mt-8 space-y-4"
            >
              {/* Qty selector */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium uppercase tracking-widest text-muted">Qty</span>
                <div className="flex items-center border border-border">
                  <button
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    className="px-4 py-2 text-muted hover:text-on-background transition-colors active:scale-95"
                  >−</button>
                  <span className="min-w-[2.5rem] text-center text-sm font-medium text-on-background">{qty}</span>
                  <button
                    onClick={() => setQty((q) => Math.min(stock || 10, q + 1))}
                    className="px-4 py-2 text-muted hover:text-on-background transition-colors active:scale-95"
                  >+</button>
                </div>
              </div>

              {/* Main Add to Cart — ref'd for sticky trigger */}
              <button
                ref={addToCartRef}
                onClick={handleAddToCart}
                disabled={!variant || stock === 0}
                className={`flex w-full items-center justify-center gap-3 py-4 text-sm font-semibold uppercase tracking-widest transition-all duration-200 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 ${
                  added ? 'bg-green-700 text-white' : 'bg-primary text-white hover:bg-primary/90'
                }`}
              >
                <ShoppingBag className="h-4 w-4" />
                {added ? 'Added to Bag!' : stock === 0 ? 'Out of Stock' : 'Add to Bag'}
              </button>

              {/* Buy Now */}
              <button
                onClick={handleBuyNow}
                disabled={!variant || stock === 0}
                className="flex w-full items-center justify-center gap-3 border border-border py-4 text-sm font-semibold uppercase tracking-widest transition-all duration-200 hover:border-on-background hover:bg-surface-elevated active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 text-on-background"
              >
                <Zap className="h-4 w-4" />
                Buy Now
              </button>

              {/* Trust badges */}
              <div className="flex items-center justify-center gap-6 border-t border-border pt-4">
                {['Free shipping ₹2500+', 'Easy 7-day returns', 'Secure checkout'].map((badge) => (
                  <span key={badge} className="text-[10px] text-muted uppercase tracking-wide text-center">{badge}</span>
                ))}
              </div>
            </motion.div>

            {variant && (
              <p className="mt-6 text-[10px] text-muted uppercase tracking-widest">
                SKU: {variant.sku}
              </p>
            )}

            <AdminBarcodePanel product={product} variant={variant} />
          </div>
        </div>
      </motion.div>

      {/* Sticky Add-to-Cart bar */}
      <AnimatePresence>
        {showSticky && (
          <StickyCartBar
            product={product}
            variant={variant}
            qty={qty}
            onAdd={handleAddToCart}
            stock={stock}
            added={added}
          />
        )}
      </AnimatePresence>

      {/* You May Also Like */}
      <div className="border-t border-border/50">
        <RelatedProducts categorySlug={product.category.slug} excludeId={product.id} />
      </div>
    </>
  )
}
