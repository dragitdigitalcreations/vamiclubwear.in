'use client'

import Link from 'next/link'
import Image from 'next/image'
import { X, Heart, ShoppingBag } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWishlistStore, selectWishlistCount } from '@/stores/wishlistStore'
import { useCartStore } from '@/stores/cartStore'
import { cloudinaryUrl } from '@/lib/cloudinary'

export function WishlistDrawer() {
  const { items, isOpen, closeWishlist, removeItem } = useWishlistStore()
  const count    = useWishlistStore(selectWishlistCount)
  const { openCart } = useCartStore()

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="wl-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60"
            onClick={closeWishlist}
          />

          {/* Drawer */}
          <motion.div
            key="wl-drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
            className="fixed right-0 top-0 bottom-0 z-50 flex w-full max-w-md flex-col bg-surface shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-6 py-5">
              <h2 className="font-display text-lg font-semibold tracking-wide text-on-background flex items-center gap-2">
                <Heart className="h-4 w-4 text-primary-light" />
                Wishlist ({count})
              </h2>
              <button
                onClick={closeWishlist}
                className="p-1 text-muted transition-colors hover:text-on-background"
                aria-label="Close wishlist"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                  <Heart className="h-12 w-12 text-muted" />
                  <p className="text-muted text-sm">Your wishlist is empty</p>
                  <button
                    onClick={closeWishlist}
                    className="mt-2 text-xs font-medium uppercase tracking-widest text-on-background underline underline-offset-4 transition-opacity hover:opacity-70"
                  >
                    Continue Shopping
                  </button>
                </div>
              ) : (
                <ul className="space-y-5">
                  {items.map((item) => (
                    <li key={item.id} className="flex gap-4">
                      {/* Image */}
                      <Link
                        href={`/products/${item.slug}`}
                        onClick={closeWishlist}
                        className="relative h-24 w-20 flex-shrink-0 overflow-hidden rounded bg-surface-elevated"
                      >
                        {item.imageUrl ? (
                          <Image
                            src={cloudinaryUrl(item.imageUrl, { w: 120, q: 75 })}
                            alt={item.name}
                            fill
                            className="object-cover"
                            sizes="80px"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <ShoppingBag className="h-6 w-6 text-muted" />
                          </div>
                        )}
                      </Link>

                      {/* Details */}
                      <div className="flex flex-1 flex-col justify-between">
                        <div>
                          <Link
                            href={`/products/${item.slug}`}
                            onClick={closeWishlist}
                            className="text-sm font-medium text-on-background leading-snug hover:text-primary-light transition-colors line-clamp-2"
                          >
                            {item.name}
                          </Link>
                          <p className="mt-1 text-[11px] font-medium uppercase tracking-wider text-muted">
                            {item.category}
                          </p>
                          <p className="mt-1 text-sm font-semibold text-on-background">
                            ₹{Number(item.basePrice).toLocaleString('en-IN')}
                          </p>
                        </div>

                        <div className="flex items-center gap-4 mt-2">
                          <Link
                            href={`/products/${item.slug}`}
                            onClick={closeWishlist}
                            className="flex items-center gap-1.5 bg-primary px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-white transition-opacity hover:opacity-90"
                          >
                            <ShoppingBag className="h-3 w-3" />
                            View &amp; Add
                          </Link>
                          <button
                            onClick={() => removeItem(item.id)}
                            className="text-xs text-muted hover:text-on-background transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="border-t border-border px-6 py-5">
                <Link
                  href="/products"
                  onClick={closeWishlist}
                  className="block w-full border border-border py-3.5 text-center text-xs font-semibold uppercase tracking-widest text-on-background transition-all hover:bg-surface-elevated"
                >
                  Continue Shopping
                </Link>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
