'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { Minus, Plus, X, ShoppingBag, ArrowLeft, ArrowRight, Loader2, CheckCircle, CreditCard, Banknote } from 'lucide-react'
import { useCartStore, selectTotalItems, selectSubtotal } from '@/stores/cartStore'
import { ApiError } from '@/lib/api'
import { toast } from '@/stores/toastStore'

const RAZORPAY_KEY = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? ''

declare global {
  interface Window { Razorpay: any }
}

const fadeUp = {
  hidden:  { opacity: 0, y: 20 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: i * 0.08 },
  }),
}

// ─── Form state ───────────────────────────────────────────────────────────────

interface CheckoutForm {
  customerName:  string
  customerEmail: string
  customerPhone: string
  address:       string
  city:          string
  state:         string
  pincode:       string
  notes:         string
}

const EMPTY_FORM: CheckoutForm = {
  customerName: '', customerEmail: '', customerPhone: '',
  address: '', city: '', state: '', pincode: '', notes: '',
}

type PaymentMethod = 'cod' | 'online'

// ─── Checkout Modal ───────────────────────────────────────────────────────────

interface CheckoutModalProps {
  isOpen:    boolean
  onClose:   () => void
  onSuccess: (orderNumber: string) => void
}

function CheckoutModal({ isOpen, onClose, onSuccess }: CheckoutModalProps) {
  const { items, clearCart } = useCartStore()
  const subtotal = useCartStore(selectSubtotal)
  const [form,    setForm]   = useState<CheckoutForm>(EMPTY_FORM)
  const [method,  setMethod] = useState<PaymentMethod>('cod')
  const [submitting, setSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Partial<CheckoutForm>>({})

  const API_BASE = typeof window !== 'undefined' ? '' : (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001')

  // Lazy-load Razorpay script when modal opens
  useEffect(() => {
    if (!isOpen) return
    if (typeof window === 'undefined' || window.Razorpay) return
    const s = document.createElement('script')
    s.src = 'https://checkout.razorpay.com/v1/checkout.js'
    s.async = true
    document.head.appendChild(s)
  }, [isOpen])

  function validate(): boolean {
    const e: Partial<CheckoutForm> = {}
    if (!form.customerName.trim()) e.customerName = 'Name is required'
    if (form.customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.customerEmail)) e.customerEmail = 'Enter a valid email'
    if (!form.customerPhone.trim()) e.customerPhone = 'Phone is required'
    if (!form.address.trim()) e.address = 'Address is required'
    if (!form.city.trim())    e.city    = 'City is required'
    if (!form.pincode.trim()) e.pincode = 'Pincode is required'
    setFieldErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleCOD() {
    if (!validate()) return
    setSubmitting(true)
    try {
      const res = await fetch(`${API_BASE}/api/payment/cod`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          items: items.map(i => ({ variantId: i.variantId, quantity: i.quantity })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new ApiError(res.status, data.error ?? 'Order failed')
      clearCart()
      onSuccess(data.orderNumber)
    } catch (err: any) {
      toast.error(err.message ?? 'Order failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRazorpay() {
    if (!validate()) return
    setSubmitting(true)
    try {
      // Step 1: Create Razorpay order
      const res = await fetch(`${API_BASE}/api/payment/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          items: items.map(i => ({ variantId: i.variantId, quantity: i.quantity })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new ApiError(res.status, data.error ?? 'Payment setup failed')

      if (!data.configured) {
        toast.error('Online payment is not configured. Please use Cash on Delivery.')
        setSubmitting(false)
        return
      }

      // Step 2: Open Razorpay popup
      const rzp = new window.Razorpay({
        key:         data.keyId ?? RAZORPAY_KEY,
        amount:      data.amountPaise,
        currency:    'INR',
        name:        'Vami Clubwear',
        description: `Order — ${items.length} item${items.length !== 1 ? 's' : ''}`,
        order_id:    data.rzpOrderId,
        prefill: {
          name:    form.customerName,
          email:   form.customerEmail,
          contact: form.customerPhone,
        },
        theme: { color: '#5C4033' },
        handler: async (response: any) => {
          // Step 3: Verify on backend
          try {
            const vRes = await fetch(`${API_BASE}/api/payment/verify`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ...form,
                rzpOrderId:   data.rzpOrderId,
                rzpPaymentId: response.razorpay_payment_id,
                rzpSignature: response.razorpay_signature,
                items: items.map(i => ({ variantId: i.variantId, quantity: i.quantity })),
              }),
            })
            const vData = await vRes.json()
            if (!vRes.ok) throw new ApiError(vRes.status, vData.error ?? 'Payment verification failed')
            clearCart()
            onSuccess(vData.orderNumber)
          } catch (err: any) {
            toast.error(err.message ?? 'Payment verification failed. Contact support.')
          }
          setSubmitting(false)
        },
        modal: {
          ondismiss: () => setSubmitting(false),
        },
      })
      rzp.open()
    } catch (err: any) {
      toast.error(err.message ?? 'Payment failed. Please try again.')
      setSubmitting(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (method === 'cod') handleCOD()
    else handleRazorpay()
  }

  function f(key: keyof CheckoutForm) {
    return {
      value: form[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm(prev => ({ ...prev, [key]: e.target.value })),
    }
  }

  const inputCls = (err?: string) =>
    `w-full border ${err ? 'border-red-500' : 'border-border'} bg-transparent px-3 py-2.5 text-sm text-on-background placeholder:text-muted outline-none focus:border-on-background transition-colors`

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70"
            onClick={onClose}
          />
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-x-4 bottom-0 top-14 z-50 mx-auto max-w-lg overflow-y-auto bg-surface md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full"
          >
            <form onSubmit={handleSubmit} className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border px-6 py-4 sticky top-0 bg-surface z-10">
                <h2 className="font-display text-lg font-semibold text-on-background">Checkout</h2>
                <button type="button" onClick={onClose} className="text-muted hover:text-on-background"><X className="h-5 w-5" /></button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

                {/* Order summary */}
                <div className="bg-surface-elevated p-4 space-y-2">
                  <p className="text-xs font-medium uppercase tracking-widest text-muted mb-3">Order Summary</p>
                  {items.map(item => (
                    <div key={item.variantId} className="flex justify-between text-sm">
                      <span className="text-muted truncate max-w-[200px]">
                        {item.productName}{item.size ? ` · ${item.size}` : ''}{item.color ? ` · ${item.color}` : ''} ×{item.quantity}
                      </span>
                      <span className="text-on-background font-medium flex-shrink-0 ml-4">
                        ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                      </span>
                    </div>
                  ))}
                  <div className="border-t border-border pt-2 flex justify-between font-semibold text-on-background">
                    <span>Total</span><span>₹{subtotal.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {/* Contact */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-on-background">Contact</p>
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <input {...f('customerName')} placeholder="Full Name *" className={inputCls(fieldErrors.customerName)} />
                      {fieldErrors.customerName && <p className="mt-1 text-xs text-red-400">{fieldErrors.customerName}</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <input {...f('customerPhone')} type="tel" placeholder="Phone *" className={inputCls(fieldErrors.customerPhone)} />
                        {fieldErrors.customerPhone && <p className="mt-1 text-xs text-red-400">{fieldErrors.customerPhone}</p>}
                      </div>
                      <div>
                        <input {...f('customerEmail')} type="email" placeholder="Email" className={inputCls(fieldErrors.customerEmail)} />
                        {fieldErrors.customerEmail && <p className="mt-1 text-xs text-red-400">{fieldErrors.customerEmail}</p>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Shipping address */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-on-background">Delivery Address</p>
                  <div>
                    <input {...f('address')} placeholder="House / Flat, Street, Area *" className={inputCls(fieldErrors.address)} />
                    {fieldErrors.address && <p className="mt-1 text-xs text-red-400">{fieldErrors.address}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <input {...f('city')} placeholder="City *" className={inputCls(fieldErrors.city)} />
                      {fieldErrors.city && <p className="mt-1 text-xs text-red-400">{fieldErrors.city}</p>}
                    </div>
                    <div>
                      <input {...f('pincode')} placeholder="Pincode *" className={inputCls(fieldErrors.pincode)} />
                      {fieldErrors.pincode && <p className="mt-1 text-xs text-red-400">{fieldErrors.pincode}</p>}
                    </div>
                  </div>
                  <input {...f('state')} placeholder="State (e.g. Kerala)" className={inputCls()} />
                  <textarea
                    {...f('notes')}
                    rows={2}
                    placeholder="Special instructions (optional)"
                    className="w-full border border-border bg-transparent px-3 py-2.5 text-sm text-on-background placeholder:text-muted outline-none focus:border-on-background transition-colors resize-none"
                  />
                </div>

                {/* Payment method */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-on-background">Payment Method</p>
                  <div className="grid grid-cols-1 gap-2">
                    {([
                      { id: 'cod',    Icon: Banknote,    label: 'Cash on Delivery',   sub: 'Pay when your order arrives' },
                      { id: 'online', Icon: CreditCard,  label: 'Pay Online',          sub: 'UPI, Cards, Net Banking, Wallets' },
                    ] as const).map(({ id, Icon, label, sub }) => (
                      <label
                        key={id}
                        className={`flex items-center gap-4 cursor-pointer border p-3.5 transition-colors ${
                          method === id ? 'border-on-background bg-surface-elevated' : 'border-border hover:border-on-background/40'
                        }`}
                      >
                        <input
                          type="radio"
                          name="payment"
                          value={id}
                          checked={method === id}
                          onChange={() => setMethod(id)}
                          className="sr-only"
                        />
                        <div className={`flex h-4 w-4 items-center justify-center rounded-full border-2 flex-shrink-0 ${
                          method === id ? 'border-on-background' : 'border-border'
                        }`}>
                          {method === id && <div className="h-2 w-2 rounded-full bg-on-background" />}
                        </div>
                        <Icon className="h-4 w-4 text-muted flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-on-background">{label}</p>
                          <p className="text-xs text-muted">{sub}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-border px-6 py-4 sticky bottom-0 bg-surface">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex w-full items-center justify-center gap-2 bg-primary py-4 text-sm font-semibold uppercase tracking-widest text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {submitting ? (
                    <><Loader2 className="h-4 w-4 animate-spin" />Processing…</>
                  ) : method === 'cod' ? (
                    <>Place Order (COD) — ₹{subtotal.toLocaleString('en-IN')}</>
                  ) : (
                    <>Pay Online — ₹{subtotal.toLocaleString('en-IN')}</>
                  )}
                </button>
                <p className="mt-2 text-center text-[10px] text-muted">
                  {method === 'online' ? 'Secured by Razorpay' : 'Pay cash when your order arrives'}
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
      <p className="text-muted max-w-sm text-sm">
        Thank you for shopping with Vami Clubwear. We'll contact you shortly to confirm delivery.
      </p>
      <div className="bg-surface border border-border px-6 py-3">
        <p className="text-xs text-muted uppercase tracking-widest">Order Number</p>
        <p className="mt-1 font-display text-xl font-bold text-on-background">{orderNumber}</p>
      </div>
      <p className="text-xs text-muted">A confirmation has been sent to your email (if provided).</p>
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

// ─── Cart Page ────────────────────────────────────────────────────────────────

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
        <p className="text-muted text-sm max-w-sm">Explore our collections to find something you love.</p>
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
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="mx-auto max-w-7xl px-4 pt-28 pb-20 md:px-8"
      >
        <motion.div variants={fadeUp} initial="hidden" animate="visible" className="mb-12 flex items-center justify-between">
          <div>
            <h1 className="font-display text-4xl font-bold text-on-background md:text-5xl">Your Bag</h1>
            <p className="mt-1 text-sm text-muted">{totalItems} {totalItems === 1 ? 'item' : 'items'}</p>
          </div>
          <Link
            href="/products"
            className="hidden items-center gap-2 text-xs font-medium uppercase tracking-widest text-muted transition-colors hover:text-on-background md:flex"
          >
            <ArrowLeft className="h-3.5 w-3.5" />Continue Shopping
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
                      <div className="relative h-28 w-20 flex-shrink-0 overflow-hidden bg-surface-elevated md:h-36 md:w-28">
                        {item.imageUrl ? (
                          <Image src={item.imageUrl} alt={item.productName} fill className="object-cover" sizes="112px" />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <ShoppingBag className="h-8 w-8 text-muted opacity-30" />
                          </div>
                        )}
                      </div>

                      <div className="flex flex-1 flex-col justify-between">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <Link href={`/products/${item.productSlug}`} className="font-medium text-on-background hover:text-primary-light transition-colors">
                              {item.productName}
                            </Link>
                            <div className="mt-1 flex flex-wrap gap-2">
                              {item.color && (
                                <span className="flex items-center gap-1 text-xs text-muted">
                                  {item.colorHex && <span className="inline-block h-2.5 w-2.5 rounded-full border border-border/60" style={{ backgroundColor: item.colorHex }} />}
                                  {item.color}
                                </span>
                              )}
                              {item.size && <span className="text-xs text-muted">Size: {item.size}</span>}
                            </div>
                            <p className="mt-1.5 text-sm font-semibold text-on-background">₹{item.price.toLocaleString('en-IN')}</p>
                          </div>
                          <button onClick={() => removeItem(item.variantId)} className="flex-shrink-0 p-1 text-muted hover:text-on-background transition-colors" aria-label="Remove">
                            <X className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="flex items-center justify-between mt-4">
                          <div className="flex items-center border border-border">
                            <button onClick={() => updateQuantity(item.variantId, -1)} className="px-3 py-1.5 text-muted hover:text-on-background transition-colors"><Minus className="h-3 w-3" /></button>
                            <span className="min-w-[2rem] text-center text-xs font-medium text-on-background">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.variantId, 1)} className="px-3 py-1.5 text-muted hover:text-on-background transition-colors"><Plus className="h-3 w-3" /></button>
                          </div>
                          <p className="text-sm font-semibold text-on-background">₹{(item.price * item.quantity).toLocaleString('en-IN')}</p>
                        </div>
                      </div>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
            <button onClick={clearCart} className="mt-4 text-xs font-medium uppercase tracking-widest text-muted hover:text-on-background transition-colors underline underline-offset-4">
              Clear Bag
            </button>
          </div>

          {/* Order summary */}
          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={1}>
            <div className="sticky top-24 border border-border bg-surface p-6 space-y-5">
              <h2 className="font-display text-xl font-semibold text-on-background">Order Summary</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-muted">
                  <span>Subtotal ({totalItems} {totalItems === 1 ? 'item' : 'items'})</span>
                  <span>₹{subtotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-muted">
                  <span>Shipping</span>
                  <span>{subtotal >= 2500 ? <span className="text-green-400">Free</span> : '₹80'}</span>
                </div>
              </div>
              <div className="border-t border-border pt-4 flex justify-between font-semibold text-on-background">
                <span>Total</span>
                <span>₹{(subtotal + (subtotal >= 2500 ? 0 : 80)).toLocaleString('en-IN')}</span>
              </div>
              {subtotal < 2500 && (
                <p className="text-xs text-amber-400">Add ₹{(2500 - subtotal).toLocaleString('en-IN')} more for free shipping</p>
              )}

              {/* Payment method badges */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {['UPI', 'Cards', 'Net Banking', 'Wallets', 'COD'].map(m => (
                  <span key={m} className="border border-border px-2 py-0.5 text-[10px] text-muted uppercase tracking-wider">{m}</span>
                ))}
              </div>

              <button
                onClick={() => setCheckoutOpen(true)}
                className="w-full bg-primary py-4 text-xs font-semibold uppercase tracking-widest text-white transition-opacity hover:opacity-90 flex items-center justify-center gap-2"
              >
                Proceed to Checkout
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
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
