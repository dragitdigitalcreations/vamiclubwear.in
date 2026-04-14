'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { Minus, Plus, ShoppingBag, ArrowRight } from 'lucide-react'
import { useCartStore, selectTotalItems, selectSubtotal } from '@/stores/cartStore'

const fadeUp = {
  hidden:  { opacity: 0, y: 20 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: i * 0.08 },
  }),
}

export default function CartPage() {
  const { items, updateQuantity, removeItem } = useCartStore()
  const totalItems = useCartStore(selectTotalItems)
  const subtotal   = useCartStore(selectSubtotal)

  if (items.length === 0) {
    return (
      <div className="pt-16 flex min-h-[70vh] flex-col items-center justify-center gap-6 px-4 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-surface-elevated">
          <ShoppingBag className="h-8 w-8 text-muted opacity-40" />
        </div>
        <h1 className="font-display text-3xl font-bold text-on-background">Your Bag is Empty</h1>
        <p className="text-muted text-sm max-w-sm">Explore our collections to find something you love.</p>
        <Link
          href="/products"
          className="mt-2 inline-flex items-center gap-2 bg-on-background px-8 py-3.5 text-xs font-semibold uppercase tracking-widest text-white transition-opacity hover:opacity-90"
        >
          Explore Collections
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    )
  }

  const shipping = subtotal >= 2500 ? 0 : 80
  const total    = subtotal + shipping

  return (
    <div className="pt-16 min-h-screen">

      {/* Page header */}
      <div className="border-b border-border">
        <div className="mx-auto w-full px-4 sm:px-6 md:px-8 lg:px-10">
          <div className="flex items-end gap-4 py-10">
            <div>
              <p className="mb-1 t-micro">Your</p>
              <h1 className="t-h1 flex items-center gap-3">
                Bag
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-surface-elevated text-sm font-semibold text-fg-2">
                  {totalItems}
                </span>
              </h1>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full px-4 sm:px-6 md:px-8 lg:px-10 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

          {/* ── Items list ── */}
          <div className="lg:col-span-2">
            <AnimatePresence initial={false}>
              {items.map((item, i) => (
                <motion.div
                  key={item.variantId}
                  layout
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -32, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1], delay: i * 0.04 }}
                  className="mb-4 flex items-center gap-5 border border-border bg-surface px-5 py-5"
                >
                  {/* Image */}
                  <div className="relative h-24 w-20 flex-shrink-0 overflow-hidden rounded bg-surface-elevated">
                    {item.imageUrl ? (
                      <Image src={item.imageUrl} alt={item.productName} fill className="object-cover" sizes="80px" />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <ShoppingBag className="h-6 w-6 text-muted opacity-30" />
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/products/${item.productSlug}`}
                      className="font-semibold text-on-background hover:text-primary-light transition-colors leading-snug line-clamp-2 text-sm"
                    >
                      {item.productName}
                    </Link>
                    <p className="mt-1.5 text-xs text-muted">
                      {item.size  && <span>Size: <span className="font-medium text-on-background">{item.size}</span></span>}
                      {item.size && item.color && <span className="mx-1.5 opacity-40">·</span>}
                      {item.color && (
                        <span>Color: <span className="font-medium" style={{ color: item.colorHex ?? undefined }}>{item.color}</span></span>
                      )}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-on-background">
                      ₹{item.price.toLocaleString('en-IN')}
                    </p>
                  </div>

                  {/* Qty + remove */}
                  <div className="flex flex-col items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => updateQuantity(item.variantId, 1)}
                      disabled={typeof item.stock === 'number' && item.quantity >= item.stock}
                      className="flex h-8 w-8 items-center justify-center rounded bg-on-background text-white transition-opacity hover:opacity-80 disabled:opacity-25 disabled:cursor-not-allowed"
                      aria-label="Increase"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                    <div className="flex h-8 w-8 items-center justify-center rounded bg-on-background text-white text-sm font-semibold">
                      {item.quantity}
                    </div>
                    <button
                      onClick={() => updateQuantity(item.variantId, -1)}
                      className="flex h-8 w-8 items-center justify-center rounded bg-on-background text-white transition-opacity hover:opacity-80"
                      aria-label="Decrease"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => removeItem(item.variantId)}
                      className="mt-1 text-red-500 hover:text-red-600 transition-colors"
                      aria-label="Remove"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                        <path d="M10 11v6"/><path d="M14 11v6"/>
                        <path d="M9 6V4h6v2"/>
                      </svg>
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* ── Order summary sidebar ── */}
          <motion.div
            variants={fadeUp} initial="hidden" animate="visible"
            className="lg:col-span-1"
          >
            <div className="border border-border bg-surface p-6 space-y-5 lg:sticky lg:top-20">
              <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-on-background">Order Summary</h2>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-muted">
                  <span>Subtotal ({totalItems} item{totalItems !== 1 ? 's' : ''})</span>
                  <span>₹{subtotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-muted">
                  <span>Shipping</span>
                  <span>{shipping === 0 ? <span className="text-green-400">Free</span> : `₹${shipping}`}</span>
                </div>
                {subtotal < 2500 && (
                  <p className="text-[11px] text-amber-500">
                    Add ₹{(2500 - subtotal).toLocaleString('en-IN')} more for free shipping
                  </p>
                )}
                <div className="border-t border-border pt-3 flex justify-between font-bold text-on-background text-base">
                  <span>Total</span>
                  <span>₹{total.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <Link
                href="/checkout"
                className="flex w-full items-center justify-center gap-2 bg-primary py-4 text-sm font-semibold uppercase tracking-widest text-white transition-opacity hover:opacity-90"
              >
                Proceed to Checkout
                <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                href="/products"
                className="block w-full text-center py-3 text-xs font-medium uppercase tracking-widest text-muted transition-colors hover:text-on-background"
              >
                Continue Shopping
              </Link>
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  )
}
