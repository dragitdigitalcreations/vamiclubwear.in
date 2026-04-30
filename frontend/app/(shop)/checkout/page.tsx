'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Loader2, CheckCircle, CreditCard, ShieldCheck, Ticket, X, AlertTriangle, Truck, Store, MapPin } from 'lucide-react'
import { useCartStore, selectSubtotal } from '@/stores/cartStore'
import { useSavedAddress } from '@/hooks/useSavedAddress'
import { ApiError, couponsApi, type CouponValidationResult } from '@/lib/api'
import { toast } from '@/stores/toastStore'

const RAZORPAY_KEY = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? ''

// Mirror of backend `calcShippingFee` in src/utils/shipping.ts —
// keep the threshold + flat rate in sync if either side changes.
const FREE_SHIPPING_THRESHOLD = 2400
const FLAT_DELIVERY_FEE       = 80

declare global {
  interface Window { Razorpay: any }
}

type FulfillmentType = 'DELIVERY' | 'PICKUP'

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

// Physical store the customer collects from when they choose PICKUP. Mirrors
// the address rendered in the pickup-ready transactional email.
const STORE_PICKUP = {
  name:    'Vami Clubwear — Manjeri Store',
  line1:   'Manjeri, Malappuram',
  line2:   'Kerala — 676121, India',
  hours:   'Mon–Sat · 10:30 am – 9:00 pm',
}

export default function CheckoutPage() {
  const router  = useRouter()
  const { items, clearCart } = useCartStore()
  const subtotal = useCartStore(selectSubtotal)

  const [form,            setForm]            = useState<CheckoutForm>(EMPTY_FORM)
  const [submitting,      setSubmitting]      = useState(false)
  const [fieldErrors,     setFieldErrors]     = useState<Partial<CheckoutForm>>({})
  const [saveAddr,        setSaveAddr]        = useState(false)
  const [confirmed,       setConfirmed]       = useState<string | null>(null)
  const [confirmedFulfil, setConfirmedFulfil] = useState<FulfillmentType>('DELIVERY')
  const [fulfillment,     setFulfillment]     = useState<FulfillmentType>('DELIVERY')
  const isPickup = fulfillment === 'PICKUP'

  // Refs for each validated field so we can scroll + focus the first invalid one
  // and let the summary banner jump to a specific row.
  const fieldRefs = useRef<Partial<Record<keyof CheckoutForm, HTMLInputElement | null>>>({})
  const errorSummaryRef = useRef<HTMLDivElement | null>(null)

  // Order matters — drives the order in the summary banner and the "first invalid"
  // field that gets focused on submit. Match the on-page top-to-bottom order.
  const FIELD_ORDER: Array<keyof CheckoutForm> = [
    'customerName', 'customerPhone', 'customerEmail',
    'address', 'city', 'pincode',
  ]
  const FIELD_LABELS: Record<keyof CheckoutForm, string> = {
    customerName:  'Full Name',
    customerPhone: 'Phone',
    customerEmail: 'Email',
    address:       'Address',
    city:          'City',
    state:         'State',
    pincode:       'Pincode',
    notes:         'Notes',
  }

  // Coupon state
  const [couponInput,    setCouponInput]    = useState('')
  const [coupon,         setCoupon]         = useState<CouponValidationResult | null>(null)
  const [couponBusy,     setCouponBusy]     = useState(false)
  const [couponMsg,      setCouponMsg]      = useState<string | null>(null)
  const discount       = coupon?.discount ?? 0
  const afterDiscount  = Math.max(0, subtotal - discount)
  // Pickup orders never carry a delivery fee — mirrors the backend in
  // payment.routes.ts and order.service.ts.
  const shippingFee    = !isPickup && afterDiscount > 0 && afterDiscount < FREE_SHIPPING_THRESHOLD
    ? FLAT_DELIVERY_FEE
    : 0
  const grandTotal     = afterDiscount + shippingFee

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
    if (!form.customerName.trim())  e.customerName  = 'Please enter your full name'
    if (form.customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.customerEmail))
      e.customerEmail = 'That email address looks incomplete — check for typos'
    if (!form.customerPhone.trim()) {
      e.customerPhone = isPickup
        ? 'We need a phone number to call you when your order is ready'
        : 'We need a phone number to coordinate delivery'
    }
    // Pickup orders skip address validation — the customer collects from the store.
    if (!isPickup) {
      if (!form.address.trim()) e.address = 'Please enter your house / street / area'
      if (!form.city.trim())    e.city    = 'Please enter your city'
      if (!form.pincode.trim()) e.pincode = 'Please enter your 6-digit pincode'
    }
    setFieldErrors(e)

    if (Object.keys(e).length > 0) {
      // Show the summary banner first, then jump to the first failing field —
      // far clearer than a generic toast that tells users nothing about WHICH
      // field is wrong or where it is on the page.
      const firstInvalid = FIELD_ORDER.find((k) => e[k])
      requestAnimationFrame(() => {
        errorSummaryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        if (firstInvalid) {
          setTimeout(() => {
            const el = fieldRefs.current[firstInvalid]
            el?.focus({ preventScroll: true })
          }, 350)
        }
      })
      return false
    }
    return true
  }

  function focusField(key: keyof CheckoutForm) {
    const el = fieldRefs.current[key]
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setTimeout(() => el.focus({ preventScroll: true }), 250)
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
          fulfillmentType: fulfillment,
          couponCode: coupon?.code,
          items: items.map(i => ({ variantId: i.variantId, quantity: i.quantity })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new ApiError(res.status, data.error ?? 'Payment setup failed')

      if (!data.configured) {
        toast.error('Online payment is temporarily unavailable. Please contact us on WhatsApp to complete your order.')
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
                fulfillmentType: fulfillment,
                couponCode:   coupon?.code,
                rzpOrderId:   data.rzpOrderId,
                rzpPaymentId: response.razorpay_payment_id,
                rzpSignature: response.razorpay_signature,
                items: items.map(i => ({ variantId: i.variantId, quantity: i.quantity })),
              }),
            })
            const vData = await vRes.json()
            if (!vRes.ok) throw new ApiError(vRes.status, vData.error ?? 'Payment verification failed')
            // Only save the address if the customer used delivery — saving stale
            // address values on a pickup order would mislead them next time.
            if (!isPickup) maybePersistAddress()
            clearCart()
            setConfirmedFulfil(fulfillment)
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
    const wasPickup = confirmedFulfil === 'PICKUP'
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
            {wasPickup
              ? "Thank you for shopping with Vami Clubwear. We'll email you the moment your order is ready to collect from our store."
              : "Thank you for shopping with Vami Clubwear. We'll contact you shortly to confirm delivery."}
          </p>
          <div className="bg-surface border border-border px-6 py-3 w-full">
            <p className="text-xs text-muted uppercase tracking-widest">Order Number</p>
            <p className="mt-1 font-display text-xl font-bold text-on-background">{confirmed}</p>
          </div>
          {wasPickup && (
            <div className="border border-primary/30 bg-primary/5 p-4 w-full text-left">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-primary-light flex items-center gap-1.5">
                <Store className="h-3.5 w-3.5" /> Collect From
              </p>
              <p className="mt-2 text-sm text-on-background font-medium">{STORE_PICKUP.name}</p>
              <p className="text-xs text-muted">{STORE_PICKUP.line1}</p>
              <p className="text-xs text-muted">{STORE_PICKUP.line2}</p>
              <p className="mt-2 text-[11px] text-muted">{STORE_PICKUP.hours}</p>
            </div>
          )}
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
            <div className="flex justify-between text-sm">
              <span className="text-muted">{isPickup ? 'Store Pickup' : 'Delivery'}</span>
              <span className={shippingFee === 0 ? 'text-green-400' : 'text-on-background'}>
                {isPickup ? 'No charge' : (shippingFee === 0 ? 'Free' : `₹${shippingFee}`)}
              </span>
            </div>
            {!isPickup && shippingFee > 0 && (
              <p className="text-[11px] text-amber-500">
                Add ₹{(FREE_SHIPPING_THRESHOLD - afterDiscount).toLocaleString('en-IN')} more for free delivery
              </p>
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

          {/* Fulfillment — Delivery vs Store pickup */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-on-background">How would you like to receive your order?</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFulfillment('DELIVERY')}
                aria-pressed={!isPickup}
                className={`flex items-start gap-3 border p-4 text-left transition-colors ${
                  !isPickup
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-transparent hover:border-on-background/40'
                }`}
              >
                <Truck className={`h-5 w-5 flex-shrink-0 mt-0.5 ${!isPickup ? 'text-primary-light' : 'text-muted'}`} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-on-background">Home Delivery</p>
                  <p className="mt-0.5 text-[11px] text-muted">
                    Courier to your address. Free over ₹{FREE_SHIPPING_THRESHOLD.toLocaleString('en-IN')}, else ₹{FLAT_DELIVERY_FEE} flat.
                  </p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setFulfillment('PICKUP')}
                aria-pressed={isPickup}
                className={`flex items-start gap-3 border p-4 text-left transition-colors ${
                  isPickup
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-transparent hover:border-on-background/40'
                }`}
              >
                <Store className={`h-5 w-5 flex-shrink-0 mt-0.5 ${isPickup ? 'text-primary-light' : 'text-muted'}`} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-on-background">Collect from Shop</p>
                  <p className="mt-0.5 text-[11px] text-muted">
                    Pick up at our Manjeri store · No delivery charge
                  </p>
                </div>
              </button>
            </div>
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

          {/* Delivery address — hidden when the customer chose store pickup */}
          {!isPickup ? (
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
          ) : (
            <div className="space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-on-background">Pickup Location</h2>
              <div className="border border-border bg-surface-elevated p-4 flex gap-3">
                <MapPin className="h-5 w-5 text-primary-light flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-on-background">{STORE_PICKUP.name}</p>
                  <p className="text-muted text-xs mt-0.5">{STORE_PICKUP.line1}</p>
                  <p className="text-muted text-xs">{STORE_PICKUP.line2}</p>
                  <p className="text-[11px] text-muted mt-2">{STORE_PICKUP.hours}</p>
                  <p className="text-[11px] text-primary-light mt-2">
                    We'll email you the moment your order is ready to be collected.
                  </p>
                </div>
              </div>
              <textarea
                {...f('notes')}
                rows={2}
                placeholder="Anything we should know? (optional)"
                className="w-full border border-border bg-transparent px-3 py-2.5 text-sm text-on-background placeholder:text-muted outline-none focus:border-on-background transition-colors resize-none"
              />
            </div>
          )}

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
            <p className="text-center text-[10px] text-muted">256-bit SSL secured · Online payment only — UPI, Cards, Net Banking, Wallets</p>
          </div>

        </form>
      </div>
    </div>
  )
}
