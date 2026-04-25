'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Loader2, CheckCircle, CreditCard, ShieldCheck, Ticket, X } from 'lucide-react'
import { useCartStore, selectSubtotal } from '@/stores/cartStore'
import { useSavedAddress } from '@/hooks/useSavedAddress'
import { ApiError, couponsApi, type CouponValidationResult } from '@/lib/api'
import { toast } from '@/stores/toastStore'

const RAZORPAY_KEY = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? ''

declare global {
  interface Window { Razorpay: any }
}

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

export default function CheckoutPage() {
  const router  = useRouter()
  const { items, clearCart } = useCartStore()
  const subtotal = useCartStore(selectSubtotal)

  const [form,        setForm]        = useState<CheckoutForm>(EMPTY_FORM)
  const [submitting,  setSubmitting]  = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Partial<CheckoutForm>>({})
  const [saveAddr,    setSaveAddr]    = useState(false)
  const [confirmed,   setConfirmed]   = useState<string | null>(null)

  // Coupon state
  const [couponInput,    setCouponInput]    = useState('')
  const [coupon,         setCoupon]         = useState<CouponValidationResult | null>(null)
  const [couponBusy,     setCouponBusy]     = useState(false)
  const [couponMsg,      setCouponMsg]      = useState<string | null>(null)
  const discount = coupon?.discount ?? 0
  const grandTotal = Math.max(0, subtotal - discount)

  async function applyCoupon() {
    const code = couponInput.trim().toUpperCase()
    if (!code) return
    setCouponBusy(true); setCouponMsg(null)
    try {
      const r = await couponsApi.validate(code, subtotal, form.customerEmail || undefined)
      setCoupon(r)
      setCouponMsg(`Saved ₹${r.discount.toLocaleString('en-IN')} with ${r.code}`)
    } catch (e: any) {
      setCoupon(null)
      setCouponMsg(e?.message ?? 'Invalid coupon')
    } finally { setCouponBusy(false) }
  }
  function removeCoupon() { setCoupon(null); setCouponInput(''); setCouponMsg(null) }

  const { saved: savedAddress, save: persistAddress } = useSavedAddress()
  const API_BASE = typeof window !== 'undefined' ? '' : (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001')

  // Redirect if cart is empty (and no confirmed order)
  useEffect(() => {
    if (items.length === 0 && !confirmed) router.replace('/cart')
  }, [items.length, confirmed, router])

  // Pre-fill saved address on mount
  useEffect(() => {
    if (!savedAddress) return
    setForm(prev => ({
      ...prev,
      customerName:  prev.customerName  || savedAddress.customerName,
      customerPhone: prev.customerPhone || savedAddress.customerPhone,
      address:       prev.address       || savedAddress.address,
      city:          prev.city          || savedAddress.city,
      state:         prev.state         || savedAddress.state,
      pincode:       prev.pincode       || savedAddress.pincode,
    }))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Lazy-load Razorpay SDK
  useEffect(() => {
    if (typeof window === 'undefined' || window.Razorpay) return
    const s = document.createElement('script')
    s.src   = 'https://checkout.razorpay.com/v1/checkout.js'
    s.async = true
    document.head.appendChild(s)
  }, [])

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
    if (saveAddr) persistAddress({
      customerName:  form.customerName,
      customerPhone: form.customerPhone,
      address:       form.address,
      city:          form.city,
      state:         form.state,
      pincode:       form.pincode,
    })
  }

  function validate(): boolean {
    const e: Partial<CheckoutForm> = {}
    if (!form.customerName.trim())  e.customerName  = 'Name is required'
    if (form.customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.customerEmail))
      e.customerEmail = 'Enter a valid email'
    if (!form.customerPhone.trim()) e.customerPhone = 'Phone is required'
    if (!form.address.trim())       e.address       = 'Address is required'
    if (!form.city.trim())          e.city          = 'City is required'
    if (!form.pincode.trim())       e.pincode       = 'Pincode is required'
    setFieldErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleRazorpay() {
    if (!validate()) return
    setSubmitting(true)
    try {
      const res  = await fetch(`${API_BASE}/api/payment/create-order`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          ...form,
          couponCode: coupon?.code,
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

      const rzp = new window.Razorpay({
        key:         data.keyId ?? RAZORPAY_KEY,
        amount:      data.amountPaise,
        currency:    'INR',
        name:        'Vami Clubwear',
        description: `Order — ${items.length} item${items.length !== 1 ? 's' : ''}`,
        order_id:    data.rzpOrderId,
        prefill:     { name: form.customerName, email: form.customerEmail, contact: form.customerPhone },
        theme:       { color: '#5C4033' },
        handler: async (response: any) => {
          try {
            const vRes  = await fetch(`${API_BASE}/api/payment/verify`, {
              method:  'POST',
              headers: { 'Content-Type': 'application/json' },
              body:    JSON.stringify({
                ...form,
                couponCode:   coupon?.code,
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
            setConfirmed(vData.orderNumber)
          } catch (err: any) {
            toast.error(err.message ?? 'Payment verification failed. Contact support.')
          }
          setSubmitting(false)
        },
        modal: { ondismiss: () => setSubmitting(false) },
      })
      rzp.open()
    } catch (err: any) {
      toast.error(err.message ?? 'Payment failed. Please try again.')
      setSubmitting(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    handleRazorpay()
  }

  function f(key: keyof CheckoutForm) {
    return {
      value: form[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm(prev => ({ ...prev, [key]: e.target.value })),
    }
  }

  const inp = (err?: string) =>
    `w-full border ${err ? 'border-red-500' : 'border-border'} bg-transparent px-3 py-2.5 text-sm text-on-background placeholder:text-muted outline-none focus:border-on-background transition-colors`

  // ── Order confirmed ────────────────────────────────────────────────────────
  if (confirmed) {
    return (
      <div className="pt-24 min-h-screen">
        <div className="mx-auto w-full max-w-lg px-4 py-20 flex flex-col items-center text-center gap-6">
          <motion.div
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
          >
            <CheckCircle className="h-16 w-16 text-green-400" />
          </motion.div>
          <h1 className="font-display text-3xl font-bold text-on-background">Order Placed!</h1>
          <p className="text-sm text-muted max-w-sm">
            Thank you for shopping with Vami Clubwear. We'll contact you shortly to confirm delivery.
          </p>
          <div className="bg-surface border border-border px-6 py-3 w-full">
            <p className="text-xs text-muted uppercase tracking-widest">Order Number</p>
            <p className="mt-1 font-display text-xl font-bold text-on-background">{confirmed}</p>
          </div>
          <p className="text-xs text-muted">A confirmation has been sent to your email (if provided).</p>
          <div className="flex flex-col gap-3 w-full mt-2">
            <Link
              href={`/track?order=${encodeURIComponent(confirmed)}`}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-border px-8 py-3.5 text-xs font-semibold uppercase tracking-widest text-on-background transition-colors hover:border-on-background"
            >
              Track Order <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/products"
              className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-8 py-3.5 text-xs font-semibold uppercase tracking-widest text-white transition-opacity hover:opacity-90"
            >
              Continue Shopping <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // ── Checkout form ──────────────────────────────────────────────────────────
  return (
    <div className="pt-24 min-h-screen">

      {/* Page header */}
      <div className="border-b border-border">
        <div className="mx-auto w-full px-4 sm:px-6 md:px-8 lg:px-10">
          <div className="flex items-end gap-5 py-10">
            <Link href="/cart" className="mb-1 text-muted hover:text-on-background transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <p className="mb-1 t-micro">Order</p>
              <h1 className="t-h1">Checkout</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-2xl px-4 sm:px-6 md:px-8 py-10">
        <form onSubmit={handleSubmit} className="space-y-10">

          {/* Order summary */}
          <div className="bg-surface-elevated p-5 space-y-3">
            <p className="text-xs font-medium uppercase tracking-widest text-muted">Order Summary</p>
            {items.map(item => (
              <div key={item.variantId} className="flex justify-between text-sm">
                <span className="text-muted truncate max-w-xs">
                  {item.productName}
                  {item.size  ? ` · ${item.size}`  : ''}
                  {item.color ? ` · ${item.color}` : ''}
                  {' '}×{item.quantity}
                </span>
                <span className="text-on-background font-medium flex-shrink-0 ml-4">
                  ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                </span>
              </div>
            ))}
            <div className="flex justify-between text-sm">
              <span className="text-muted">Subtotal</span>
              <span className="text-on-background">₹{subtotal.toLocaleString('en-IN')}</span>
            </div>
            {coupon && (
              <div className="flex justify-between text-sm">
                <span className="text-green-400">Coupon ({coupon.code})</span>
                <span className="text-green-400">−₹{discount.toLocaleString('en-IN')}</span>
              </div>
            )}
            <div className="border-t border-border pt-3 flex justify-between font-semibold text-on-background">
              <span>Total</span>
              <span>₹{grandTotal.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* ── Coupon / gift code ── */}
          <div className="space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-on-background flex items-center gap-2">
              <Ticket className="h-3.5 w-3.5" /> Gift / Coupon Code
            </h2>
            {coupon ? (
              <div className="flex items-center justify-between gap-3 rounded-full border border-green-700/40 bg-green-900/15 px-4 py-2.5">
                <div className="text-sm">
                  <span className="font-semibold text-green-400">{coupon.code}</span>
                  <span className="ml-2 text-xs text-muted">−₹{discount.toLocaleString('en-IN')} off</span>
                </div>
                <button type="button" onClick={removeCoupon} className="rounded-full p-1 text-muted hover:text-on-background" aria-label="Remove coupon">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyCoupon() } }}
                  placeholder="Enter code (e.g. WELCOME10)"
                  className="flex-1 rounded-full border border-border bg-transparent px-4 py-2.5 text-sm text-on-background placeholder:text-muted outline-none focus:border-on-background tracking-[0.12em] uppercase"
                />
                <button
                  type="button"
                  onClick={applyCoupon}
                  disabled={couponBusy || !couponInput.trim()}
                  className="rounded-full bg-primary px-5 py-2.5 text-xs font-semibold uppercase tracking-widest text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {couponBusy ? '…' : 'Apply'}
                </button>
              </div>
            )}
            {couponMsg && (
              <p className={`text-xs ${coupon ? 'text-green-400' : 'text-red-400'}`}>{couponMsg}</p>
            )}
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-on-background">Contact</h2>
            <div>
              <input {...f('customerName')} placeholder="Full Name *" className={inp(fieldErrors.customerName)} />
              {fieldErrors.customerName && <p className="mt-1 text-xs text-red-400">{fieldErrors.customerName}</p>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <input {...f('customerPhone')} type="tel" placeholder="Phone *" className={inp(fieldErrors.customerPhone)} />
                {fieldErrors.customerPhone && <p className="mt-1 text-xs text-red-400">{fieldErrors.customerPhone}</p>}
              </div>
              <div>
                <input {...f('customerEmail')} type="email" placeholder="Email" className={inp(fieldErrors.customerEmail)} />
                {fieldErrors.customerEmail && <p className="mt-1 text-xs text-red-400">{fieldErrors.customerEmail}</p>}
              </div>
            </div>
          </div>

          {/* Delivery address */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-on-background">Delivery Address</h2>
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
              <input {...f('address')} placeholder="House / Flat, Street, Area *" className={inp(fieldErrors.address)} />
              {fieldErrors.address && <p className="mt-1 text-xs text-red-400">{fieldErrors.address}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <input {...f('city')} placeholder="City *" className={inp(fieldErrors.city)} />
                {fieldErrors.city && <p className="mt-1 text-xs text-red-400">{fieldErrors.city}</p>}
              </div>
              <div>
                <input {...f('pincode')} placeholder="Pincode *" className={inp(fieldErrors.pincode)} />
                {fieldErrors.pincode && <p className="mt-1 text-xs text-red-400">{fieldErrors.pincode}</p>}
              </div>
            </div>
            <input {...f('state')} placeholder="State (e.g. Kerala)" className={inp()} />
            <textarea
              {...f('notes')}
              rows={2}
              placeholder="Special instructions (optional)"
              className="w-full border border-border bg-transparent px-3 py-2.5 text-sm text-on-background placeholder:text-muted outline-none focus:border-on-background transition-colors resize-none"
            />
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

          {/* Payment */}
          <div className="flex items-center gap-3 border border-border bg-surface-elevated p-4">
            <CreditCard className="h-4 w-4 text-muted flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-on-background">Pay Online</p>
              <p className="text-xs text-muted">UPI, Cards, Net Banking, Wallets — secured by Razorpay</p>
            </div>
            <ShieldCheck className="h-4 w-4 text-green-400 ml-auto flex-shrink-0" />
          </div>

          {/* Place order */}
          <div className="space-y-2 pb-10">
            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-4 text-sm font-semibold uppercase tracking-widest text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? (
                <><Loader2 className="h-4 w-4 animate-spin" />Processing…</>
              ) : (
                <>Pay ₹{grandTotal.toLocaleString('en-IN')} — Razorpay</>
              )}
            </button>
            <p className="text-center text-[10px] text-muted">256-bit SSL secured · No COD available</p>
          </div>

        </form>
      </div>
    </div>
  )
}
