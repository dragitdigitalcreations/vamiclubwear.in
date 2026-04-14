'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { Minus, Plus, X, ShoppingBag, ArrowLeft, ArrowRight, Loader2, CheckCircle, CreditCard, Banknote } from 'lucide-react'
import { useCartStore, selectTotalItems, selectSubtotal } from '@/stores/cartStore'
import { ApiError } from '@/lib/api'
import { toast } from '@/stores/toastStore'
import { useSavedAddress } from '@/hooks/useSavedAddress'

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
  const [submitting,  setSubmitting]  = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Partial<CheckoutForm>>({})
  const [saveAddr,    setSaveAddr]    = useState(false)

  const { saved: savedAddress, save: persistAddress } = useSavedAddress()

  const API_BASE = typeof window !== 'undefined' ? '' : (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001')

  // Lock body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  // Pre-fill from saved address when modal opens
  useEffect(() => {
    if (!isOpen) return
    if (savedAddress) {
      setForm(prev => ({
        ...prev,
        customerName:  prev.customerName  || savedAddress.customerName,
        customerPhone: prev.customerPhone || savedAddress.customerPhone,
        address:       prev.address       || savedAddress.address,
        city:          prev.city          || savedAddress.city,
        state:         prev.state         || savedAddress.state,
        pincode:       prev.pincode       || savedAddress.pincode,
      }))
    }
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  // Lazy-load Razorpay script when modal opens
  useEffect(() => {
    if (!isOpen) return
    if (typeof window === 'undefined' || window.Razorpay) return
    const s = document.createElement('script')
    s.src = 'https://checkout.razorpay.com/v1/checkout.js'
    s.async = true
    document.head.appendChild(s)
  }, [isOpen])

  function applyUseSaved() {
    if (!savedAddress) return
    setForm(prev => ({
      ...prev,
      customerName:  savedAddress.customerName,
      customerPhone: savedAddress.customerPhone,
      address:       savedAddress.address,
      city:          savedAddress.city,
      state:         savedAddress.state,
      pincode:       savedAddress.pincode,
    }))
    setFieldErrors({})
  }

  function maybePersistAddress() {
    if (saveAddr) {
      persistAddress({
        customerName:  form.customerName,
        customerPhone: form.customerPhone,
        address:       form.address,
        city:          form.city,
        state:         form.state,
        pincode:       form.pincode,
      })
    }
  }

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
      maybePersistAddress()
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
            maybePersistAddress()
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
            className="fixed inset-x-4 bottom-0 top-14 z-50 mx-auto max-w-lg flex flex-col bg-surface md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full"
          >
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-surface">
                <h2 className="font-display text-lg font-semibold text-on-background">Checkout</h2>
                <button type="button" onClick={onClose} className="text-muted hover:text-on-background"><X className="h-5 w-5" /></button>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 py-5 space-y-6">

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
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-widest text-on-background">Delivery Address</p>
                    {savedAddress && (
                      <button
                        type="button"
                        onClick={applyUseSaved}
                        className="flex items-center gap-1.5 rounded bg-primary/10 border border-primary/30 px-2.5 py-1 text-[11px] font-semibold text-primary-light hover:bg-primary/20 transition-colors"
                      >
                        ↙ Use Saved Address
                      </button>
                    )}
                  </div>
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

                  {/* Save address checkbox */}
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <div
                      onClick={() => setSaveAddr(v => !v)}
                      className={`flex h-4 w-4 shrink-0 items-center justify-center border transition-colors ${
                        saveAddr ? 'border-primary bg-primary' : 'border-border bg-transparent'
                      }`}
                    >
                      {saveAddr && (
                        <svg viewBox="0 0 10 8" fill="none" className="h-2.5 w-2.5">
                          <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                    <span className="text-xs text-muted">
                      {savedAddress ? 'Update my saved address with this one' : 'Save this address for next time'}
                    </span>
                  </label>
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
              <div className="border-t border-border px-6 py-4 bg-surface">
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
      <div className="bg-surface border border-border px-6 py-3 w-full max-w-xs">
        <p className="text-xs text-muted uppercase tracking-widest">Order Number</p>
        <p className="mt-1 font-display text-xl font-bold text-on-background">{orderNumber}</p>
      </div>
      <p className="text-xs text-muted">A confirmation has been sent to your email (if provided).</p>
      <div className="flex flex-col items-center gap-3 w-full max-w-xs">
        <Link
          href={`/track?order=${encodeURIComponent(orderNumber)}`}
          className="flex w-full items-center justify-center gap-2 border border-border px-8 py-3.5 text-xs font-semibold uppercase tracking-widest text-on-background transition-colors hover:border-on-background"
        >
          Track Order
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
        <Link
          href="/products"
          className="flex w-full items-center justify-center gap-2 bg-primary px-8 py-3.5 text-xs font-semibold uppercase tracking-widest text-white transition-opacity hover:opacity-90"
        >
          Continue Shopping
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </motion.div>
  )
}

// ─── Cart Page ────────────────────────────────────────────────────────────────

export default function CartPage() {
  const { items, updateQuantity, removeItem } = useCartStore()
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
        <h1 className="font-display text-3xl font-bold text-on-background">Your Cart is Empty</h1>
        <p className="text-muted text-sm max-w-sm">Explore our collections to find something you love.</p>
        <Link
          href="/products"
          className="mt-4 inline-flex items-center gap-2 bg-on-background px-8 py-3.5 text-xs font-semibold uppercase tracking-widest text-white transition-opacity hover:opacity-90"
        >
          Explore Collections
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    )
  }

  const total = subtotal + (subtotal >= 2500 ? 0 : 80)

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="mx-auto w-full px-4 sm:px-6 md:px-8 lg:px-10 pt-28 pb-10"
      >
        {/* Heading */}
        <motion.h1
          variants={fadeUp} initial="hidden" animate="visible"
          className="font-display text-4xl font-bold text-on-background mb-8"
        >
          Cart
        </motion.h1>

        {/* Item cards */}
        <AnimatePresence initial={false}>
          {items.map((item, i) => (
            <motion.div
              key={item.variantId}
              layout
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -32, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1], delay: i * 0.05 }}
              className="mb-4 flex items-center gap-5 rounded-xl border border-border bg-surface px-5 py-5"
            >
              {/* Image */}
              <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-surface-elevated">
                {item.imageUrl ? (
                  <Image src={item.imageUrl} alt={item.productName} fill className="object-cover" sizes="96px" />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <ShoppingBag className="h-7 w-7 text-muted opacity-30" />
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <Link
                  href={`/products/${item.productSlug}`}
                  className="font-semibold text-on-background hover:text-primary-light transition-colors leading-snug line-clamp-2"
                >
                  {item.productName}
                </Link>
                <p className="mt-1.5 text-sm text-muted">
                  {item.size  && <span>Size: <span className="font-medium text-on-background">{item.size}</span></span>}
                  {item.size && item.color && <span className="mx-2 opacity-40">·</span>}
                  {item.color && (
                    <span>Color: <span className="font-medium" style={{ color: item.colorHex ?? undefined }}>{item.color}</span></span>
                  )}
                  {(item.size || item.color) && <span className="mx-2 opacity-40">·</span>}
                  <span>Price: <span className="font-semibold text-on-background">₹{item.price.toLocaleString('en-IN')}</span></span>
                </p>
              </div>

              {/* Qty controls + remove — stacked on the right */}
              <div className="flex flex-col items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => updateQuantity(item.variantId, 1)}
                  disabled={typeof item.stock === 'number' && item.quantity >= item.stock}
                  className="flex h-8 w-8 items-center justify-center rounded-md bg-on-background text-white text-sm font-bold transition-opacity hover:opacity-80 disabled:opacity-25 disabled:cursor-not-allowed"
                  aria-label="Increase quantity"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-on-background text-white text-sm font-semibold">
                  {item.quantity}
                </div>
                <button
                  onClick={() => updateQuantity(item.variantId, -1)}
                  className="flex h-8 w-8 items-center justify-center rounded-md bg-on-background text-white text-sm font-bold transition-opacity hover:opacity-80"
                  aria-label="Decrease quantity"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => removeItem(item.variantId)}
                  className="mt-1 text-red-500 hover:text-red-600 transition-colors"
                  aria-label="Remove item"
                >
                  <Minus className="hidden" />
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                  </svg>
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Total bar */}
        <div className="mt-6 border-t border-border pt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-base font-bold text-on-background">
              Total ({totalItems} {totalItems === 1 ? 'item' : 'items'}): ₹{total.toLocaleString('en-IN')}
            </p>
            {subtotal < 2500 && (
              <p className="mt-1 text-xs text-amber-500">
                Add ₹{(2500 - subtotal).toLocaleString('en-IN')} more for free shipping
              </p>
            )}
          </div>
          <button
            onClick={() => setCheckoutOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-on-background px-8 py-3.5 text-sm font-semibold text-white transition-opacity hover:opacity-85"
          >
            Proceed to Checkout
          </button>
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
