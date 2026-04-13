'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingBag, Heart } from 'lucide-react'
import { Product, getPrimaryImage } from '@/types/product'
import { useCartStore } from '@/stores/cartStore'
import { useWishlistStore } from '@/stores/wishlistStore'
import { cloudinaryUrl } from '@/lib/cloudinary'

// ─── Price display — actual price + optional crossed-out base price ────────────
function PriceDisplay({ actualPrice, basePrice }: { actualPrice: number; basePrice: number }) {
  const hasDiscount = actualPrice < basePrice
  return (
    <div className="mt-1 flex items-center gap-2">
      <span className="text-sm font-semibold text-on-background">
        ₹{actualPrice.toLocaleString('en-IN')}
      </span>
      {hasDiscount && (
        <span className="text-xs text-muted/50 line-through">
          ₹{basePrice.toLocaleString('en-IN')}
        </span>
      )}
    </div>
  )
}

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
  const { addItem }                    = useCartStore()
  const { toggleItem, isWishlisted }   = useWishlistStore()

  const rawImageUrl   = getPrimaryImage(product)
  const imageUrl      = rawImageUrl ? cloudinaryUrl(rawImageUrl, { w: 600, q: 80 }) : null
  const hoverImages   = product.media?.filter((m) => m.type === 'IMAGE').sort((a, b) => a.sortOrder - b.sortOrder)
  const hoverImageUrl = hoverImages && hoverImages.length > 1
    ? cloudinaryUrl(hoverImages[1].url, { w: 600, q: 80 })
    : null

  const isNew      = isNewProduct(product.createdAt)
  const wishlisted = isWishlisted(product.id)

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

  function handleWishlist(e: React.MouseEvent) {
    e.preventDefault()
    toggleItem({
      id:        product.id,
      name:      product.name,
      slug:      product.slug,
      basePrice: Number(product.basePrice),
      imageUrl:  rawImageUrl ?? null,
      category:  product.category.name,
    })
  }

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group block"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* ── Image container ── */}
      <div className="relative overflow-hidden rounded-[10px] bg-surface-elevated aspect-[3/4]">

        {/* Main image */}
        {imageUrl ? (
          <>
            <Image
              src={imageUrl}
              alt={product.name}
              fill
              priority={priority}
              className={`object-cover transition-all duration-500 ease-out ${
                hovered && hoverImageUrl ? 'opacity-0 scale-[1.03]' : 'opacity-100 scale-100 group-hover:scale-[1.03]'
              }`}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
            {hoverImageUrl && (
              <Image
                src={hoverImageUrl}
                alt={product.name}
                fill
                className={`object-cover transition-all duration-500 ease-out ${
                  hovered ? 'opacity-100 scale-100' : 'opacity-0 scale-[1.03]'
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

        {/* ── Badges top-left ── */}
        <div className="absolute left-2.5 top-2.5 z-10 flex flex-col gap-1">
          {isNew && (
            <span className="rounded-sm bg-on-background px-2 py-[3px] text-[9px] font-bold uppercase tracking-widest text-white">
              New
            </span>
          )}
          {product.isFeatured && !isNew && (
            <span className="rounded-sm bg-primary px-2 py-[3px] text-[9px] font-bold uppercase tracking-widest text-white">
              Featured
            </span>
          )}
        </div>

        {/* ── Wishlist heart — always visible, top-right ── */}
        <button
          onClick={handleWishlist}
          className={`absolute right-2.5 top-2.5 z-20 flex h-7 w-7 items-center justify-center rounded-full transition-all duration-200 hover:scale-110 ${
            wishlisted
              ? 'bg-on-background text-white shadow-sm'
              : 'bg-white/90 text-muted shadow-sm hover:bg-on-background hover:text-white'
          }`}
          aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <Heart className={`h-3 w-3 transition-all duration-200 ${wishlisted ? 'fill-white' : ''}`} />
        </button>

        {/* ── Add to Bag — slides up from bottom on hover ── */}
        <AnimatePresence>
          {hovered && defaultVariant && (
            <motion.button
              key="add-bag"
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.32, 0, 0.67, 0] }}
              onClick={handleQuickAdd}
              className={`absolute inset-x-0 bottom-0 z-10 flex items-center justify-center gap-1.5 py-3 text-[10px] font-semibold uppercase tracking-[0.15em] transition-colors duration-150 ${
                addedPulse
                  ? 'bg-green-700 text-white'
                  : 'bg-white/95 text-on-background hover:bg-on-background hover:text-white'
              }`}
              aria-label="Add to bag"
            >
              <ShoppingBag className="h-3 w-3" />
              {addedPulse ? 'Added ✓' : 'Add to Bag'}
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* ── Info block ── */}
      <div className="mt-3 px-0.5">
        <h3 className="text-sm font-medium leading-snug text-on-background line-clamp-1 transition-colors duration-200 group-hover:text-muted">
          {product.name}
        </h3>
        <PriceDisplay
          actualPrice={defaultVariant ? Number(defaultVariant.price) : Number(product.basePrice)}
          basePrice={Number(product.basePrice)}
        />
      </div>
    </Link>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
export function ProductCardSkeleton() {
  return (
    <div>
      <div className="skeleton aspect-[3/4] w-full rounded-[10px]" />
      <div className="mt-3 space-y-2">
        <div className="skeleton h-4 w-3/4 rounded" />
        <div className="skeleton h-4 w-1/4 rounded" />
      </div>
    </div>
  )
}
