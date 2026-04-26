'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingBag, Heart, Share2, Link as LinkIcon, Check, MessageCircle, Facebook, Twitter } from 'lucide-react'
import { Product, getPrimaryImage, getVariantsByColor, getAvailableStock } from '@/types/product'
import { useCartStore } from '@/stores/cartStore'
import { useWishlistStore } from '@/stores/wishlistStore'
import { useCustomerAuthStore } from '@/stores/customerAuthStore'
import { cloudinaryUrl } from '@/lib/cloudinary'

// Site origin used to build absolute share URLs at click time. The env var
// matches what's used elsewhere for canonical URLs in metadata generation.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.vamiclubwear.in'

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
  const [shareOpen,  setShareOpen]  = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const shareWrapRef = useRef<HTMLDivElement | null>(null)
  const { addItem }                    = useCartStore()
  const { toggleItem, isWishlisted }   = useWishlistStore()
  const customerAuthed                 = useCustomerAuthStore((s) => !!s.token && !!s.user)
  const openPrompt                     = useCustomerAuthStore((s) => s.openPrompt)

  // Close share popover on outside-click or Escape so the card behaves like a
  // proper menu rather than swallowing input until the user re-clicks the icon.
  useEffect(() => {
    if (!shareOpen) return
    function onDoc(e: MouseEvent) {
      if (shareWrapRef.current && !shareWrapRef.current.contains(e.target as Node)) {
        setShareOpen(false)
      }
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setShareOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [shareOpen])

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

  const colors = getVariantsByColor(product.variants)
  const variantStock = defaultVariant ? getAvailableStock(defaultVariant) : undefined

  function handleQuickAdd(e: React.MouseEvent) {
    e.preventDefault()
    if (!defaultVariant) return
    if (!customerAuthed) {
      openPrompt('Sign in to save items to your cart and sync them across devices.')
      return
    }
    addItem({
      variantId:    defaultVariant.id,
      productId:    product.id,
      productName:  product.name,
      productSlug:  product.slug,
      sku:          defaultVariant.sku,
      size:         defaultVariant.size,
      color:        defaultVariant.color,
      colorHex:     defaultVariant.colorHex,
      price:        Number(defaultVariant.price),
      imageUrl,
      categoryName: product.category.name,
      // Only pass stock if inventory data is present; undefined = no cap (listing pages)
      stock:        variantStock && variantStock > 0 ? variantStock : undefined,
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

  // Resolve share URL at click time so it picks up the current host even when
  // the env var isn't set (e.g. preview deployments) — falls back to SITE_URL.
  function getShareUrl(): string {
    const origin = typeof window !== 'undefined' ? window.location.origin : SITE_URL
    return `${origin}/products/${product.slug}`
  }

  async function handleShareClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    const url   = getShareUrl()
    const title = product.name
    const text  = `${product.name} — Vami Clubwear`

    // Prefer the native Web Share sheet on mobile / supporting browsers (gives
    // users their full app list — WhatsApp, Instagram DM, Mail, etc).
    if (typeof navigator !== 'undefined' && typeof (navigator as any).share === 'function') {
      try {
        await (navigator as any).share({ title, text, url })
        return
      } catch {
        // User cancelled or share failed — fall through to popover
      }
    }
    setShareOpen((v) => !v)
  }

  function copyShareLink(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    const url = getShareUrl()
    navigator.clipboard?.writeText(url).then(() => {
      setLinkCopied(true)
      setTimeout(() => { setLinkCopied(false); setShareOpen(false) }, 1200)
    }).catch(() => {})
  }

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group block"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* ── Image container ── */}
      <div className="relative overflow-hidden rounded-[4px] bg-surface-elevated aspect-[4/7]">

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
            <span className="rounded-sm bg-white/20 backdrop-blur-md border border-white/30 px-2 py-[3px] text-[9px] font-bold uppercase tracking-widest text-white shadow-sm">
              New
            </span>
          )}
          {product.isFeatured && !isNew && (
            <span className="rounded-sm bg-primary px-2 py-[3px] text-[9px] font-bold uppercase tracking-widest text-white">
              Featured
            </span>
          )}
        </div>

        {/* ── Wishlist + Share — top-right, always visible ── */}
        <div className="absolute right-2.5 top-2.5 z-20 flex flex-col items-end gap-1.5">
          <button
            onClick={handleWishlist}
            className={`flex h-7 w-7 items-center justify-center rounded-full transition-all duration-200 hover:scale-110 ${
              wishlisted
                ? 'bg-on-background text-white shadow-sm'
                : 'bg-white/90 text-muted shadow-sm hover:bg-on-background hover:text-white'
            }`}
            aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            <Heart className={`h-3 w-3 transition-all duration-200 ${wishlisted ? 'fill-white' : ''}`} />
          </button>

          <div ref={shareWrapRef} className="relative">
            <button
              onClick={handleShareClick}
              className={`flex h-7 w-7 items-center justify-center rounded-full transition-all duration-200 hover:scale-110 ${
                shareOpen
                  ? 'bg-on-background text-white shadow-sm'
                  : 'bg-white/90 text-muted shadow-sm hover:bg-on-background hover:text-white'
              }`}
              aria-label="Share product"
              aria-haspopup="menu"
              aria-expanded={shareOpen}
            >
              <Share2 className="h-3 w-3" />
            </button>

            <AnimatePresence>
              {shareOpen && (
                <motion.div
                  key="share-menu"
                  initial={{ opacity: 0, y: -4, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  role="menu"
                  onClick={(e: React.MouseEvent) => e.preventDefault()}
                  className="absolute right-0 top-9 z-30 w-44 overflow-hidden rounded-md border border-border bg-background shadow-xl"
                >
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(`${product.name} — ${getShareUrl()}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => { e.stopPropagation(); setShareOpen(false) }}
                    className="flex items-center gap-2 px-3 py-2 text-xs text-on-background hover:bg-surface-elevated"
                    role="menuitem"
                  >
                    <MessageCircle className="h-3.5 w-3.5 text-green-500" /> WhatsApp
                  </a>
                  <a
                    href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(getShareUrl())}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => { e.stopPropagation(); setShareOpen(false) }}
                    className="flex items-center gap-2 px-3 py-2 text-xs text-on-background hover:bg-surface-elevated"
                    role="menuitem"
                  >
                    <Facebook className="h-3.5 w-3.5 text-blue-500" /> Facebook
                  </a>
                  <a
                    href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(getShareUrl())}&text=${encodeURIComponent(product.name)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => { e.stopPropagation(); setShareOpen(false) }}
                    className="flex items-center gap-2 px-3 py-2 text-xs text-on-background hover:bg-surface-elevated"
                    role="menuitem"
                  >
                    <Twitter className="h-3.5 w-3.5 text-sky-400" /> X / Twitter
                  </a>
                  <button
                    type="button"
                    onClick={copyShareLink}
                    className="flex w-full items-center gap-2 border-t border-border px-3 py-2 text-xs text-on-background hover:bg-surface-elevated"
                    role="menuitem"
                  >
                    {linkCopied
                      ? <><Check className="h-3.5 w-3.5 text-green-400" /> Link copied</>
                      : <><LinkIcon className="h-3.5 w-3.5 text-muted" /> Copy link</>}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

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

        {/* Category name — low opacity, between name and price */}
        <p className="mt-0.5 text-[9px] uppercase tracking-[0.12em] text-muted/50 line-clamp-1">
          {product.category.name}
        </p>

        {/* Color swatches — matches admin VariantBuilder swatch style */}
        {colors.length > 0 && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            {colors.slice(0, 5).map((c) => (
              <span
                key={c.color}
                title={c.color}
                className="h-3 w-3 rounded-full border border-border/60 flex-shrink-0"
                style={{ backgroundColor: c.colorHex ?? '#888888' }}
              />
            ))}
            {colors.length > 5 && (
              <span className="text-[10px] text-muted/50 leading-none">+{colors.length - 5}</span>
            )}
          </div>
        )}

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
      <div className="skeleton aspect-[4/7] w-full rounded-[4px]" />
      <div className="mt-3 space-y-2">
        <div className="skeleton h-4 w-3/4 rounded" />
        <div className="skeleton h-4 w-1/4 rounded" />
      </div>
    </div>
  )
}
