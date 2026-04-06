'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Play, ShoppingBag, ChevronDown } from 'lucide-react'
import {
  Product,
  ProductMedia,
  ProductVariant,
  getVariantsBySize,
  getVariantsByColor,
  getAvailableStock,
} from '@/types/product'
import { useCartStore } from '@/stores/cartStore'
import { productsApi } from '@/lib/api'
import { toast } from '@/stores/toastStore'

// ─── Media Gallery ─────────────────────────────────────────────────────────────
function MediaGallery({ media }: { media: ProductMedia[] }) {
  const [active, setActive] = useState(0)
  const sorted = [...media].sort((a, b) => a.sortOrder - b.sortOrder)
  const current = sorted[active]

  function prev() { setActive((i) => (i - 1 + sorted.length) % sorted.length) }
  function next() { setActive((i) => (i + 1) % sorted.length) }

  return (
    <div className="flex flex-col gap-4 md:flex-row-reverse">
      {/* Main media */}
      <div className="relative aspect-[3/4] flex-1 overflow-hidden bg-surface-elevated">
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, scale: 1.03 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
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
                src={current.url}
                alt={current.altText ?? 'Product image'}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 60vw"
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
              className="absolute left-3 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
              aria-label="Previous"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
              aria-label="Next"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}

        {sorted.length > 1 && (
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5">
            {sorted.map((_, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                className={`h-1 transition-all ${i === active ? 'w-5 bg-white' : 'w-1.5 bg-white/40'}`}
                aria-label={`Image ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {sorted.length > 1 && (
        <div className="flex gap-2 overflow-x-auto md:flex-col md:overflow-y-auto md:w-20">
          {sorted.map((item, i) => (
            <button
              key={item.id}
              onClick={() => setActive(i)}
              className={`relative flex-shrink-0 h-20 w-16 overflow-hidden border-2 transition-colors md:h-24 md:w-full ${
                i === active ? 'border-on-background' : 'border-transparent'
              }`}
            >
              {item.type === 'VIDEO' ? (
                <div className="flex h-full items-center justify-center bg-surface-elevated text-muted">
                  <Play className="h-4 w-4" />
                </div>
              ) : (
                <Image
                  src={item.url}
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

  return (
    <div className="space-y-6">
      {/* Color */}
      {colors.length > 0 && (
        <div>
          <p className="mb-3 text-xs font-medium uppercase tracking-widest text-muted">
            Color — <span className="text-on-background">{selectedColor ?? '—'}</span>
          </p>
          <div className="flex flex-wrap gap-2.5">
            {colors.map((c) => (
              <button
                key={c.color}
                onClick={() => setSelectedColor(c.color)}
                title={c.color}
                className={`relative h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 ${
                  selectedColor === c.color ? 'border-on-background' : 'border-transparent'
                }`}
              >
                <span
                  className="absolute inset-1 rounded-full"
                  style={{ backgroundColor: c.colorHex ?? '#888' }}
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Size */}
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
              const available = product.variants.some(
                (v) => v.isActive && v.size === size && (!selectedColor || v.color === selectedColor)
              )
              return (
                <button
                  key={size}
                  onClick={() => available && setSelectedSize(size)}
                  disabled={!available}
                  className={`min-w-[3rem] border px-3 py-2 text-xs font-medium uppercase tracking-wider transition-colors ${
                    selectedSize === size
                      ? 'border-on-background bg-on-background text-background'
                      : available
                      ? 'border-border text-muted hover:border-on-background hover:text-on-background'
                      : 'border-border text-muted/30 cursor-not-allowed line-through'
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

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ProductDetailPage() {
  const params = useParams<{ slug: string }>()
  const { addItem } = useCartStore()

  const [product,  setProduct]  = useState<Product | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [variant,  setVariant]  = useState<ProductVariant | null>(null)
  const [qty,      setQty]      = useState(1)
  const [added,    setAdded]    = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const data = await productsApi.getBySlug(params.slug) as unknown as Product
        setProduct(data)
        const first = data.variants.find((v) => v.isActive)
        if (first) setVariant(first)
      } catch (err: any) {
        if (err?.status === 404) setNotFound(true)
        else {
          toast.error('Failed to load product')
          setNotFound(true)
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params.slug])

  const stock = variant ? getAvailableStock(variant) : 0
  const price = variant ? Number(variant.price) : product ? Number(product.basePrice) : 0

  function handleAddToCart() {
    if (!product || !variant) return
    const imageUrl = product.media.find((m) => m.isPrimary && m.type === 'IMAGE')?.url
                  ?? product.media.find((m) => m.type === 'IMAGE')?.url
                  ?? null
    addItem({
      variantId:   variant.id,
      productId:   product.id,
      productName: product.name,
      productSlug: product.slug,
      sku:         variant.sku,
      size:        variant.size,
      color:       variant.color,
      colorHex:    variant.colorHex,
      price:       Number(variant.price),
      imageUrl,
    })
    setAdded(true)
    toast.success(`${product.name} added to your bag`)
    setTimeout(() => setAdded(false), 2000)
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 pt-28 pb-16 md:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
          <div className="skeleton aspect-[3/4] w-full" />
          <div className="space-y-6 pt-4">
            <div className="skeleton h-8 w-3/4" />
            <div className="skeleton h-6 w-1/3" />
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-5/6" />
          </div>
        </div>
      </div>
    )
  }

  if (notFound || !product) {
    return (
      <div className="flex flex-col items-center justify-center pt-40 pb-20 text-center">
        <p className="font-display text-3xl font-bold text-on-background">Product not found</p>
        <Link href="/products" className="mt-6 text-xs font-medium uppercase tracking-widest text-muted underline underline-offset-4">
          Back to Collections
        </Link>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="mx-auto max-w-7xl px-4 pt-28 pb-16 md:px-8"
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
        {/* Media */}
        <MediaGallery media={product.media} />

        {/* Info */}
        <div className="flex flex-col">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.3em] text-primary-light">
              {product.category.name}
            </p>
            <h1 className="font-display text-3xl font-bold leading-tight text-on-background md:text-4xl">
              {product.name}
            </h1>
            <p className="mt-4 text-2xl font-semibold text-on-background">
              ₹{price.toLocaleString('en-IN')}
            </p>
            {variant && stock > 0 && stock <= 5 && (
              <p className="mt-1 text-xs font-medium text-amber-400">Only {stock} left</p>
            )}
            {variant && stock === 0 && (
              <p className="mt-1 text-xs font-medium text-red-400">Out of stock</p>
            )}
          </motion.div>

          {product.description && (
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22, duration: 0.6 }}
              className="mt-6 text-sm leading-relaxed text-muted border-t border-border pt-6"
            >
              {product.description}
            </motion.p>
          )}

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="mt-8 border-t border-border pt-8"
          >
            <VariantSelector product={product} selected={variant} onChange={setVariant} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.38, duration: 0.6 }}
            className="mt-8 space-y-4"
          >
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium uppercase tracking-widest text-muted">Qty</span>
              <div className="flex items-center border border-border">
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="px-4 py-2 text-muted hover:text-on-background transition-colors"
                >−</button>
                <span className="min-w-[2.5rem] text-center text-sm font-medium text-on-background">{qty}</span>
                <button
                  onClick={() => setQty((q) => Math.min(stock || 10, q + 1))}
                  className="px-4 py-2 text-muted hover:text-on-background transition-colors"
                >+</button>
              </div>
            </div>

            <button
              onClick={handleAddToCart}
              disabled={!variant || stock === 0}
              className={`flex w-full items-center justify-center gap-3 py-4 text-sm font-semibold uppercase tracking-widest transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                added ? 'bg-green-700 text-white' : 'bg-primary text-white hover:bg-primary/90'
              }`}
            >
              <ShoppingBag className="h-4 w-4" />
              {added ? 'Added to Bag!' : stock === 0 ? 'Out of Stock' : 'Add to Bag'}
            </button>
          </motion.div>

          {variant && (
            <p className="mt-6 text-[10px] text-muted uppercase tracking-widest">
              SKU: {variant.sku}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  )
}
