'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { Minus, Plus, X, ShoppingBag, ArrowLeft, ArrowRight, Loader2, CheckCircle } from 'lucide-react'
import { useCartStore, selectTotalItems, selectSubtotal } from '@/stores/cartStore'
import { ordersApi, ApiError } from '@/lib/api'
import { toast } from '@/stores/toastStore'

const fadeUp = {
  hidden:  { opacity: 0, y: 20 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: i * 0.08 },
  }),
}

// ─── Checkout modal ───────────────────────────────────────────────────────────

interface CheckoutForm {
  customerName:  string
  customerEmail: string
  customerPhone: string
  notes:         string
}

interface CheckoutModalProps {
  isOpen:    boolean
  onClose:   () => void
  onSuccess: (orderNumber: string) => void
}

function CheckoutModal({ isOpen, onClose, onSuccess }: CheckoutModalProps) {
  const { items, clearCart }  = useCartStore()
  const subtotal              = useCartStore(selectSubtotal)
  const [form, setForm]       = useState<CheckoutForm>({
    customerName: '', customerEmail: '', customerPhone: '', notes: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Partial<CheckoutForm>>({})

  function validate(): boolean {
    const errs: Partial<CheckoutForm> = {}
    if (!form.customerName.trim()) errs.customerName = 'Name is required'
    if (form.customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.customerEmail)) {
      errs.customerEmail = 'Enter a valid email'
    }
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setSubmitting(true)
    try {
      const order = await ordersApi.create({
        customerName:  form.customerName || undefined,
        customerEmail: form.customerEmail || undefined,
        customerPhone: form.customerPhone || undefined,
        notes:         form.notes || undefined,
        locationId:    undefined as any,  // backend resolves to default location
        items: items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
      })
      clearCart()
      onSuccess((order as any).orderNumber)
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : 'Order failed. Please try again.'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

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
            className="fixed inset-0 z-50 bg-black/70"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-x-4 bottom-0 top-16 z-50 mx-auto max-w-lg overflow-y-auto bg-surface md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full"
          >
            <form onSubmit={handleSubmit} className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border px-6 py-5">
                <h2 className="font-display text-xl font-semibold text-on-background">
                  Complete Order
                </h2>
                <button type="button" onClick={onClose} className="text-muted hover:text-on-background">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
                {/* Order summary */}
                <div className="bg-surface-elevated p-4 space-y-2">
                  <p className="text-xs font-medium uppercase tracking-widest text-muted mb-3">
                    Order Summary
                  </p>
                  {items.map((item) => (
                    <div key={item.variantId} className="flex justify-between text-sm">
                      <span className="text-muted truncate max-w-[200px]">
                        {item.productName}
                        {item.size ? ` · ${item.size}` : ''}
                        {item.color ? ` · ${item.color}` : ''}
                        {' ×'}{item.quantity}
                      </span>
                      <span className="text-on-background font-medium flex-shrink-0 ml-4">
                        ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                      </span>
                    </div>
                  ))}
                  <div className="border-t border-border pt-2 flex justify-between font-semibold text-on-background">
                    <span>Total</span>
                    <span>₹{subtotal.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {/* Customer fields */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-widest text-muted mb-1.5">
                      Full Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.customerName}
                      onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))}
                      placeholder="Your name"
                      className="w-full border border-border bg-transparent px-3 py-2.5 text-sm text-on-background placeholder:text-muted outline-none focus:border-on-background transition-colors"
                    />
                    {fieldErrors.customerName && (
                      <p className="mt-1 text-xs text-red-400">{fieldErrors.customerName}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium uppercase tracking-widest text-muted mb-1.5">
                      Email
                    </label>
                    <input
                      type="email"
                      value={form.customerEmail}
                      onChange={(e) => setForm((f) => ({ ...f, customerEmail: e.target.value }))}
                      placeholder="your@email.com"
                      className="w-full border border-border bg-transparent px-3 py-2.5 text-sm text-on-background placeholder:text-muted outline-none focus:border-on-background transition-colors"
                    />
                    {fieldErrors.customerEmail && (
                      <p className="mt-1 text-xs text-red-400">{fieldErrors.customerEmail}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium uppercase tracking-widest text-muted mb-1.5">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={form.customerPhone}
                      onChange={(e) => setForm((f) => ({ ...f, customerPhone: e.target.value }))}
                      placeholder="+91 98765 43210"
                      className="w-full border border-border bg-transparent px-3 py-2.5 text-sm text-on-background placeholder:text-muted outline-none focus:border-on-background transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium uppercase tracking-widest text-muted mb-1.5">
                      Special Notes
                    </label>
                    <textarea
                      rows={3}
                      value={form.notes}
                      onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                      placeholder="Custom measurements, delivery instructions…"
                      className="w-full border border-border bg-transparent px-3 py-2.5 text-sm text-on-background placeholder:text-muted outline-none focus:border-on-background transition-colors resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-border px-6 py-5">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex w-full items-center justify-center gap-2 bg-primary py-4 text-sm font-semibold uppercase tracking-widest text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {submitting ? (
                    <><Loader2 className="h-4 w-4 animate-spin" />Placing Order…</>
                  ) : (
                    <>Place Order — ₹{subtotal.toLocaleString('en-IN')}</>
                  )}
                </button>
                <p className="mt-3 text-center text-[10px] text-muted">
                  By placing an order you agree to our terms. Payment on delivery.
                </p>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ─── Order confirmation ───────────────────────────────────────────────────────
function OrderConfirmation({ orderNumber, onClose }: { orderNumber: string; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4 text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
      >
        <CheckCircle className="h-16 w-16 text-green-400" />
      </motion.div>
      <h1 className="font-display text-3xl font-bold text-on-background">Order Placed!</h1>
      <p className="text-muted max-w-sm">
        Thank you for your order. Our team will contact you shortly to confirm and arrange delivery.
      </p>
      <div className="bg-surface border border-border px-6 py-3">
        <p className="text-xs text-muted uppercase tracking-widest">Order Number</p>
        <p className="mt-1 font-display text-xl font-bold text-on-background">{orderNumber}</p>
      </div>
      <Link
        href="/products"
        className="mt-2 inline-flex items-center gap-2 bg-primary px-8 py-3.5 text-xs font-semibold uppercase tracking-widest text-white transition-opacity hover:opacity-90"
      >
        Continue Shopping
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </motion.div>
  )
}

// ─── Cart page ────────────────────────────────────────────────────────────────
export default function CartPage() {
  const { items, updateQuantity, removeItem, clearCart } = useCartStore()
  const totalItems = useCartStore(selectTotalItems)
  const subtotal   = useCartStore(selectSubtotal)

  const [checkoutOpen,   setCheckoutOpen]   = useState(false)
  const [confirmedOrder, setConfirmedOrder] = useState<string | null>(null)

  if (confirmedOrder) {
    return <OrderConfirmation orderNumber={confirmedOrder} onClose={() => setConfirmedOrder(null)} />
  }

  if (items.length === 0) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 px-4 text-center pt-16">
        <ShoppingBag className="h-16 w-16 text-muted opacity-30" />
        <h1 className="font-display text-3xl font-bold text-on-background">Your Bag is Empty</h1>
        <p className="text-muted text-sm max-w-sm">
          Explore our collections to find something you love.
        </p>
        <Link
          href="/products"
          className="mt-4 inline-flex items-center gap-2 bg-primary px-8 py-3.5 text-xs font-semibold uppercase tracking-widest text-white transition-opacity hover:opacity-90"
        >
          Explore Collections
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    )
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mx-auto max-w-7xl px-4 pt-28 pb-20 md:px-8"
      >
        {/* Header */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="mb-12 flex items-center justify-between"
        >
          <div>
            <h1 className="font-display text-4xl font-bold text-on-background md:text-5xl">
              Your Bag
            </h1>
            <p className="mt-1 text-sm text-muted">{totalItems} {totalItems === 1 ? 'item' : 'items'}</p>
          </div>
          <Link
            href="/products"
            className="hidden items-center gap-2 text-xs font-medium uppercase tracking-widest text-muted transition-colors hover:text-on-background md:flex"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Continue Shopping
          </Link>
        </motion.div>

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
          {/* Items */}
          <div className="lg:col-span-2">
            <ul className="divide-y divide-border">
              <AnimatePresence initial={false}>
                {items.map((item) => (
                  <motion.li
                    key={item.variantId}
                    layout
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, x: -40, height: 0 }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="flex gap-5 py-6">
                      {/* Thumbnail */}
                      <div className="relative h-28 w-20 flex-shrink-0 overflow-hidden bg-surface-elevated md:h-36 md:w-28">
                        {item.imageUrl ? (
                          <Image
                            src={item.imageUrl}
                            alt={item.productName}
                            fill
                            className="object-cover"
                            sizes="112px"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <ShoppingBag className="h-8 w-8 text-muted opacity-30" />
                          </div>
                        )}
                      </div>

                      <div className="flex flex-1 flex-col justify-between">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <Link
                              href={`/products/${item.productSlug}`}
                              className="font-medium text-on-background hover:text-primary-light transition-colors"
                            >
                              {item.productName}
                            </Link>
                            <div className="mt-1 flex flex-wrap gap-2">
                              {item.color && (
                                <span className="flex items-center gap-1 text-xs text-muted">
                                  {item.colorHex && (
                                    <span
                                      className="inline-block h-2.5 w-2.5 rounded-full border border-border/60"
                                      style={{ backgroundColor: item.colorHex }}
                                    />
                                  )}
                                  {item.color}
                                </span>
                              )}
                              {item.size && (
                                <span className="text-xs text-muted">Size: {item.size}</span>
                              )}
                            </div>
                            <p className="mt-1.5 text-sm font-semibold text-on-background">
                              ₹{item.price.toLocaleString('en-IN')}
                            </p>
                          </div>

                          <button
                            onClick={() => removeItem(item.variantId)}
                            className="flex-shrink-0 p-1 text-muted hover:text-on-background transition-colors"
                            aria-label="Remove"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="flex items-center justify-between mt-4">
                          <div className="flex items-center border border-border">
                            <button
                              onClick={() => updateQuantity(item.variantId, -1)}
                              className="px-3 py-1.5 text-muted hover:text-on-background transition-colors"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="min-w-[2rem] text-center text-xs font-medium text-on-background">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.variantId, 1)}
                              className="px-3 py-1.5 text-muted hover:text-on-background transition-colors"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                          <p className="text-sm font-semibold text-on-background">
                            ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>

            <button
              onClick={clearCart}
              className="mt-4 text-xs font-medium uppercase tracking-widest text-muted hover:text-on-background transition-colors underline underline-offset-4"
            >
              Clear Bag
            </button>
          </div>

          {/* Order summary */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={1}
          >
            <div className="sticky top-24 border border-border bg-surface p-6 space-y-5">
              <h2 className="font-display text-xl font-semibold text-on-background">
                Order Summary
              </h2>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-muted">
                  <span>Subtotal ({totalItems} {totalItems === 1 ? 'item' : 'items'})</span>
                  <span>₹{subtotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-muted">
                  <span>Shipping</span>
                  <span>Calculated at checkout</span>
                </div>
              </div>

              <div className="border-t border-border pt-4 flex justify-between font-semibold text-on-background">
                <span>Total</span>
                <span>₹{subtotal.toLocaleString('en-IN')}</span>
              </div>

              <button
                onClick={() => setCheckoutOpen(true)}
                className="w-full bg-primary py-4 text-xs font-semibold uppercase tracking-widest text-white transition-opacity hover:opacity-90 flex items-center justify-center gap-2"
              >
                Proceed to Checkout
                <ArrowRight className="h-3.5 w-3.5" />
              </button>

              <p className="text-center text-[10px] text-muted">
                Free shipping on orders above ₹2,500. Payment on delivery.
              </p>
            </div>
          </motion.div>
        </div>
      </motion.div>

      <CheckoutModal
        isOpen={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        onSuccess={(orderNumber) => {
          setCheckoutOpen(false)
          setConfirmedOrder(orderNumber)
        }}
      />
    </>
  )
}
