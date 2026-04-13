'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, ShoppingBag, X, ArrowRight } from 'lucide-react'
import { useWishlistStore } from '@/stores/wishlistStore'
import { cloudinaryUrl } from '@/lib/cloudinary'

const fadeUp = {
  hidden:  { opacity: 0, y: 20 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: i * 0.05 },
  }),
}

export default function WishlistPage() {
  const { items, removeItem } = useWishlistStore()

  return (
    <div className="pt-16 min-h-screen">
      {/* ── Header ── */}
      <div className="border-b border-border">
        <div className="mx-auto w-full px-4 sm:px-6 md:px-8 lg:px-10">
          <div className="flex items-end gap-4 py-10">
            <div>
              <p className="mb-1 t-micro">Saved</p>
              <h1 className="t-h1 flex items-center gap-3">
                Wishlist
                {items.length > 0 && (
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-surface-elevated text-sm font-semibold text-fg-2">
                    {items.length}
                  </span>
                )}
              </h1>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full px-4 sm:px-6 md:px-8 lg:px-10 py-10">
        <AnimatePresence mode="wait">
          {items.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-32 text-center"
            >
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-surface-elevated">
                <Heart className="h-7 w-7 text-muted" />
              </div>
              <p className="t-h3 text-fg-1">Your wishlist is empty</p>
              <p className="mt-2 t-body text-fg-3">
                Save pieces you love and come back to them anytime.
              </p>
              <Link
                href="/products"
                className="mt-8 inline-flex items-center gap-2 btn-primary"
              >
                Explore Collections
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </motion.div>
          ) : (
            <motion.div
              key="grid"
              className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 md:gap-4"
            >
              {items.map((item, i) => (
                <motion.div
                  key={item.id}
                  variants={fadeUp}
                  initial="hidden"
                  animate="visible"
                  exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                  custom={i}
                  layout
                >
                  <WishlistCard item={item} onRemove={() => removeItem(item.id)} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {items.length > 0 && (
          <div className="mt-12 flex justify-center">
            <Link
              href="/products"
              className="inline-flex items-center gap-2 btn-secondary"
            >
              Continue Shopping
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Wishlist card ─────────────────────────────────────────────────────────────
function WishlistCard({
  item,
  onRemove,
}: {
  item: ReturnType<typeof useWishlistStore.getState>['items'][number]
  onRemove: () => void
}) {
  const imageUrl = item.imageUrl
    ? cloudinaryUrl(item.imageUrl, { w: 600, q: 80 })
    : null

  return (
    <div className="group relative block">
      {/* ── Image ── */}
      <div className="relative overflow-hidden rounded-[4px] bg-surface-elevated aspect-[4/7]">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={item.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <ShoppingBag className="h-10 w-10 text-muted opacity-20" />
          </div>
        )}

        {/* Remove button */}
        <button
          onClick={onRemove}
          className="absolute right-2.5 top-2.5 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-muted shadow-sm transition-all duration-200 hover:bg-on-background hover:text-white hover:scale-110"
          aria-label="Remove from wishlist"
        >
          <X className="h-3 w-3" />
        </button>

        {/* View product overlay */}
        <Link
          href={`/products/${item.slug}`}
          className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-center gap-1.5 bg-white/95 py-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-on-background opacity-0 transition-opacity duration-200 group-hover:opacity-100 hover:bg-on-background hover:text-white"
        >
          <ShoppingBag className="h-3 w-3" />
          View Product
        </Link>
      </div>

      {/* ── Info ── */}
      <div className="mt-3 px-0.5">
        <Link href={`/products/${item.slug}`}>
          <h3 className="text-sm font-medium leading-snug text-on-background line-clamp-1 transition-colors group-hover:text-muted">
            {item.name}
          </h3>
        </Link>
        <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-muted">
          {item.category}
        </p>
        <p className="mt-1 text-sm font-semibold text-on-background">
          ₹{item.basePrice.toLocaleString('en-IN')}
        </p>
      </div>
    </div>
  )
}
