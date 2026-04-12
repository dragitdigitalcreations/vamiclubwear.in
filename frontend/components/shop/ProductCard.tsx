'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingBag, Eye } from 'lucide-react'
import { Product, getPrimaryImage, getVariantsByColor } from '@/types/product'
import { useCartStore } from '@/stores/cartStore'
import { cloudinaryUrl } from '@/lib/cloudinary'

interface ProductCardProps {
  product: Product
  priority?: boolean
}

function isNewProduct(createdAt?: string): boolean {
  if (!createdAt) return false
  return Date.now() - new Date(createdAt).getTime() < 30 * 24 * 60 * 60 * 1000
}

export function ProductCard({ product, priority = false }: ProductCardProps) {
  const [hovered,    setHovered]    = useState(false)
  const [addedPulse, setAddedPulse] = useState(false)
  const { addItem } = useCartStore()

  const rawImageUrl  = getPrimaryImage(product)
  const imageUrl     = rawImageUrl ? cloudinaryUrl(rawImageUrl, { w: 600, q: 80 }) : null
  // Second image for hover swap (if available)
  const hoverImages  = product.media?.filter((m) => m.type === 'IMAGE').sort((a, b) => a.sortOrder - b.sortOrder)
  const hoverImageUrl = hoverImages && hoverImages.length > 1
    ? cloudinaryUrl(hoverImages[1].url, { w: 600, q: 80 })
    : null

  const colors   = getVariantsByColor(product.variants)
  const isNew    = isNewProduct(product.createdAt)

  const defaultVariant = product.variants
    .filter((v) => v.isActive)
    .sort((a, b) => a.price - b.price)[0]

  function handleQuickAdd(e: React.MouseEvent) {
    e.preventDefault()
    if (!defaultVariant) return
    addItem({
      variantId:   defaultVariant.id,
      productId:   product.id,
      productName: product.name,
      productSlug: product.slug,
      sku:         defaultVariant.sku,
      size:        defaultVariant.size,
      color:       defaultVariant.color,
      colorHex:    defaultVariant.colorHex,
      price:       Number(defaultVariant.price),
      imageUrl,
    })
    setAddedPulse(true)
    setTimeout(() => setAddedPulse(false), 1200)
  }

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group block"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* ── Image container ── */}
      <div
        className="relative overflow-hidden rounded-[14px] bg-surface-elevated aspect-[3/4] shadow-card transition-shadow duration-300 group-hover:shadow-card-hover"
      >
        {imageUrl ? (
          <>
            {/* Primary image */}
            <Image
              src={imageUrl}
              alt={product.name}
              fill
              priority={priority}
              className={`object-cover transition-all duration-500 ease-out ${
                hovered && hoverImageUrl ? 'opacity-0 scale-[1.04]' : 'opacity-100 scale-100 group-hover:scale-[1.04]'
              }`}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
            {/* Hover-swap second image */}
            {hoverImageUrl && (
              <Image
                src={hoverImageUrl}
                alt={product.name}
                fill
                className={`object-cover transition-all duration-500 ease-out ${
                  hovered ? 'opacity-100 scale-100' : 'opacity-0 scale-[1.04]'
                }`}
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              />
            )}
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-muted">
            <ShoppingBag className="h-10 w-10 opacity-20" />
          </div>
        )}

        {/* ── Badges (top-left) ── */}
        <div className="absolute left-3 top-3 z-10 flex flex-col gap-1.5">
          {isNew && (
            <span className="rounded-sm bg-on-background px-2 py-[3px] text-[9px] font-bold uppercase tracking-widest text-background">
              New
            </span>
          )}
          {product.isFeatured && (
            <span className="rounded-sm bg-primary px-2 py-[3px] text-[9px] font-bold uppercase tracking-widest text-white">
              Featured
            </span>
          )}
        </div>

        {/* ── Hover overlay ── */}
        <AnimatePresence>
          {hovered && (
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="absolute inset-0 z-10 flex items-end gap-2 rounded-[14px] bg-black/20 p-3"
            >
              {/* Quick add */}
              {defaultVariant && (
                <motion.button
                  initial={{ y: 8, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 8, opacity: 0 }}
                  transition={{ duration: 0.18, delay: 0.02 }}
                  onClick={handleQuickAdd}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-[10px] py-2.5 text-[10px] font-semibold uppercase tracking-widest backdrop-blur-sm transition-colors duration-200 ${
                    addedPulse
                      ? 'bg-green-700/90 text-white'
                      : 'bg-background/80 text-on-background hover:bg-primary hover:text-white'
                  }`}
                  aria-label="Quick add to cart"
                >
                  <ShoppingBag className="h-3 w-3" />
                  {addedPulse ? 'Added ✓' : 'Quick Add'}
                </motion.button>
              )}

              {/* View detail */}
              <motion.div
                initial={{ y: 8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 8, opacity: 0 }}
                transition={{ duration: 0.18, delay: 0.05 }}
                className="flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-[10px] bg-background/80 backdrop-blur-sm transition-colors duration-200 hover:bg-primary"
                aria-label="View product"
              >
                <Eye className="h-3.5 w-3.5 text-on-background" />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Info block ── */}
      <div className="mt-3 px-1">
        {/* Color swatches */}
        {colors.length > 0 && (
          <div className="mb-2 flex items-center gap-1.5">
            {colors.slice(0, 5).map((c) => (
              <span
                key={c.color}
                title={c.color}
                className="h-[10px] w-[10px] rounded-full border border-border/40 shadow-sm"
                style={{ backgroundColor: c.colorHex ?? '#888' }}
              />
            ))}
            {colors.length > 5 && (
              <span className="text-[10px] leading-none text-muted">+{colors.length - 5}</span>
            )}
          </div>
        )}

        <h3 className="text-sm font-medium leading-snug text-on-background line-clamp-2 transition-colors duration-200 group-hover:text-primary-light">
          {product.name}
        </h3>
        <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-muted">
          {product.category.name}
        </p>
        <p className="mt-1.5 text-sm font-semibold text-on-background">
          ₹{Number(product.basePrice).toLocaleString('en-IN')}
        </p>
      </div>
    </Link>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
export function ProductCardSkeleton() {
  return (
    <div>
      <div className="skeleton aspect-[3/4] w-full rounded-[14px]" />
      <div className="mt-3 space-y-2 px-1">
        <div className="skeleton h-4 w-3/4 rounded" />
        <div className="skeleton h-3 w-1/3 rounded" />
        <div className="skeleton h-4 w-1/4 rounded" />
      </div>
    </div>
  )
}
