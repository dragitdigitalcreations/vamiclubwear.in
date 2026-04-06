'use client'

import Link from 'next/link'
import Image from 'next/image'
import { X, Minus, Plus, ShoppingBag } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCartStore, selectTotalItems, selectSubtotal } from '@/stores/cartStore'

export function CartDrawer() {
  const { items, isOpen, closeCart, updateQuantity, removeItem } = useCartStore()
  const totalItems = useCartStore(selectTotalItems)
  const subtotal   = useCartStore(selectSubtotal)

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60"
            onClick={closeCart}
          />

          {/* Drawer */}
          <motion.div
            key="drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
            className="fixed right-0 top-0 bottom-0 z-50 flex w-full max-w-md flex-col bg-surface shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-6 py-5">
              <h2 className="font-display text-lg font-semibold tracking-wide text-on-background">
                Your Bag ({totalItems})
              </h2>
              <button
                onClick={closeCart}
                className="p-1 text-muted transition-colors hover:text-on-background"
                aria-label="Close cart"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                  <ShoppingBag className="h-12 w-12 text-muted" />
                  <p className="text-muted text-sm">Your bag is empty</p>
                  <button
                    onClick={closeCart}
                    className="mt-2 text-xs font-medium uppercase tracking-widest text-on-background underline underline-offset-4 transition-opacity hover:opacity-70"
                  >
                    Continue Shopping
                  </button>
                </div>
              ) : (
                <ul className="space-y-6">
                  {items.map((item) => (
                    <li key={item.variantId} className="flex gap-4">
                      {/* Image */}
                      <div className="relative h-24 w-20 flex-shrink-0 overflow-hidden rounded bg-surface-elevated">
                        {item.imageUrl ? (
                          <Image
                            src={item.imageUrl}
                            alt={item.productName}
                            fill
                            className="object-cover"
                            sizes="80px"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <ShoppingBag className="h-6 w-6 text-muted" />
                          </div>
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex flex-1 flex-col justify-between">
                        <div>
                          <Link
                            href={`/products/${item.productSlug}`}
                            onClick={closeCart}
                            className="text-sm font-medium text-on-background leading-snug hover:text-primary-light transition-colors"
                          >
                            {item.productName}
                          </Link>
                          <p className="mt-1 text-xs text-muted">
                            {[item.color, item.size].filter(Boolean).join(' · ')}
                          </p>
                          <p className="mt-1 text-xs font-medium text-on-background">
                            ₹{item.price.toLocaleString('en-IN')}
                          </p>
                        </div>

                        {/* Qty controls */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 border border-border rounded">
                            <button
                              onClick={() => updateQuantity(item.variantId, -1)}
                              className="px-2 py-1 text-muted hover:text-on-background transition-colors"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="min-w-[1.5rem] text-center text-xs font-medium text-on-background">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.variantId, 1)}
                              className="px-2 py-1 text-muted hover:text-on-background transition-colors"
                              aria-label="Increase quantity"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>

                          <button
                            onClick={() => removeItem(item.variantId)}
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
              <div className="border-t border-border px-6 py-6 space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">Subtotal</span>
                  <span className="font-semibold text-on-background">
                    ₹{subtotal.toLocaleString('en-IN')}
                  </span>
                </div>
                <p className="text-xs text-muted">
                  Taxes and shipping calculated at checkout.
                </p>
                <Link
                  href="/cart"
                  onClick={closeCart}
                  className="block w-full bg-primary py-3.5 text-center text-xs font-semibold uppercase tracking-widest text-white transition-opacity hover:opacity-90"
                >
                  View Bag &amp; Checkout
                </Link>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
