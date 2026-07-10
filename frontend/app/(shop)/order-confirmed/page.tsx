'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Check, Copy, ArrowRight, Mail, Package, Truck, Store, MapPin,
  ShieldCheck, Sparkles, ClipboardCheck,
} from 'lucide-react'
import { ApiError, ordersApi } from '@/lib/api'

// Pickup-store info — mirrors checkout/page.tsx so the customer sees the same
// address language end-to-end (cart → checkout → confirmation → email).
const STORE_PICKUP = {
  name:  'Vami Clubwear — Manjeri Store',
  line1: 'Manjeri, Malappuram',
  line2: 'Kerala — 676121, India',
  hours: 'Mon–Sat · 10:30 am – 9:00 pm',
}

type PublicOrder = Awaited<ReturnType<typeof ordersApi.getPublic>>

// GA4 / Google Ads purchase event — pushes to dataLayer so GTM can forward it
// to Google Ads conversions, Meta, etc. Created on demand so it never errors
// when GTM isn't installed yet. Fires exactly once per page-load.
function fireConversion(order: PublicOrder) {
  if (typeof window === 'undefined') return
  try {
    const w = window as any
    w.dataLayer = w.dataLayer || []
    w.dataLayer.push({ ecommerce: null })
    w.dataLayer.push({
      event: 'purchase',
      ecommerce: {
        transaction_id: order.orderNumber,
        value:          Number(order.total) || 0,
        currency:       'INR',
        items: order.items.map((it) => ({
          item_name: it.variant.product.name,
          item_id:   it.variant.sku,
          item_variant: [it.variant.size, it.variant.color].filter(Boolean).join(' / ') || undefined,
          price:     Number(it.unitPrice) || 0,
          quantity:  it.quantity,
        })),
      },
    })
  } catch {
    // dataLayer is best-effort — never block the UI on analytics.
  }
}

// ─── Page content ─────────────────────────────────────────────────────────────

function OrderConfirmedContent() {
  const params      = useSearchParams()
  const orderNumber = params.get('order')?.trim() || ''
  const verify      = params.get('verify')?.trim() || ''

  const [order,   setOrder]   = useState<PublicOrder | null>(null)
  const [loading, setLoading] = useState(Boolean(orderNumber))
  const [error,   setError]   = useState<string | null>(null)
  const [copied,  setCopied]  = useState(false)

  // Resolve the order from the public endpoint (no auth) so the page works
  // whether the customer is signed in or not — and so refreshes don't blank.
  useEffect(() => {
    if (!orderNumber) return
    if (!verify) {
      setError('Verification required. Please use the tracking page instead.')
      setLoading(false)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const data = await ordersApi.getPublic(orderNumber, verify)
        if (cancelled) return
        setOrder(data)
        fireConversion(data)
      } catch (e) {
        if (cancelled) return
        setError(e instanceof ApiError ? e.message : 'We could not find that order.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [orderNumber])

  async function copyOrderNumber() {
    if (!orderNumber) return
    try {
      await navigator.clipboard.writeText(orderNumber)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {/* clipboard blocked — silent */}
  }

  const isPickup = order?.shippingAddress == null && order?.shippingPincode == null
  // The public endpoint doesn't return `fulfillmentType` explicitly, so we infer
  // PICKUP from the absence of a delivery address. This matches how POS-pickup
  // orders are persisted today (no shipping fields). If that ever changes we
  // can surface `fulfillmentType` from the API and key off it directly.

  const firstName = useMemo(() => {
    const n = order?.customerName?.trim()
    if (!n) return null
    return n.split(/\s+/)[0]
  }, [order?.customerName])

  // ── Empty state — no order number in URL ─────────────────────────────────
  if (!orderNumber) {
    return (
      <div className="pt-32 min-h-screen">
        <div className="mx-auto w-full max-w-md px-4 py-20 text-center">
          <Package className="mx-auto h-12 w-12 text-fg-4 opacity-40" />
          <h1 className="mt-6 t-h2 text-fg-1">No order to show yet</h1>
          <p className="mt-3 t-body text-fg-3">
            Looking for an order you've placed?  Track it with your order number.
          </p>
          <Link
            href="/track"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-fg-1 px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-white transition-colors hover:bg-black"
          >
            Track an order <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    )
  }

  // ── Error state — bad order number ───────────────────────────────────────
  if (error && !loading) {
    return (
      <div className="pt-32 min-h-screen">
        <div className="mx-auto w-full max-w-md px-4 py-20 text-center">
          <Package className="mx-auto h-12 w-12 text-fg-4 opacity-40" />
          <h1 className="mt-6 t-h2 text-fg-1">We couldn't find that order</h1>
          <p className="mt-3 t-body text-fg-3">{error}</p>
          <div className="mt-8 flex flex-col gap-3">
            <Link
              href={`/track?order=${encodeURIComponent(orderNumber)}`}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-fg-1 px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-white transition-colors hover:bg-black"
            >
              Search by order number <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 text-xs text-fg-3 transition-colors hover:text-fg-1"
            >
              Need help? Contact us
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="pt-24 min-h-screen">

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden border-b border-border">
        {/* Soft brand glow behind the headline — subtle, never dominates. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              'radial-gradient(60% 80% at 50% 0%, rgba(196,149,106,0.18) 0%, rgba(196,149,106,0.06) 35%, transparent 70%)',
          }}
        />
        <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 md:px-8 py-20 sm:py-24 text-center">

          {/* Animated success badge */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 220, damping: 18, delay: 0.05 }}
            className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand text-white shadow-z3"
          >
            <Check className="h-7 w-7" strokeWidth={3} />
            <motion.span
              aria-hidden
              initial={{ scale: 0.8, opacity: 0.6 }}
              animate={{ scale: 1.6, opacity: 0 }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
              className="absolute inset-0 rounded-full border-2 border-brand"
            />
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mt-8 t-micro text-brand"
          >
            ORDER CONFIRMED
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-3 font-display text-4xl sm:text-5xl md:text-6xl font-bold text-fg-1 tracking-tight"
          >
            Thank you{firstName ? `, ${firstName}` : ''}.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mx-auto mt-4 max-w-lg t-body-lg text-fg-3"
          >
            Your order is in our hands. We'll take it from here — every piece is hand-checked before it leaves the store.
          </motion.p>

          {/* ── Order number card ─────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mx-auto mt-10 inline-flex flex-col items-center gap-3 sm:flex-row sm:items-stretch border border-border bg-surface-elevated px-5 py-4 text-left shadow-z1"
          >
            <div className="flex flex-col">
              <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-fg-4">Order Number</span>
              <span className="mt-0.5 font-mono text-lg font-bold tracking-wider text-fg-1">{orderNumber}</span>
            </div>
            <button
              type="button"
              onClick={copyOrderNumber}
              className="sm:ml-4 sm:border-l sm:border-border sm:pl-4 flex items-center justify-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-fg-3 transition-colors hover:text-fg-1"
              aria-live="polite"
            >
              {copied ? <><ClipboardCheck className="h-3.5 w-3.5 text-brand" /> Copied</> : <><Copy className="h-3.5 w-3.5" /> Copy</>}
            </button>
          </motion.div>

          {order && (
            <motion.p
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ delay: 0.55 }}
              className="mt-4 text-xs text-fg-4 flex items-center justify-center gap-1.5"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              Payment received · ₹{Number(order.total).toLocaleString('en-IN')}
            </motion.p>
          )}
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div className="mx-auto w-full max-w-2xl px-4 sm:px-6 md:px-8 py-14 space-y-12">

        {/* What happens next */}
        <motion.section
          initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5 }}
        >
          <header className="mb-6 flex items-baseline justify-between">
            <h2 className="t-h4 text-fg-1">What happens next</h2>
            <span className="t-micro text-fg-4">{isPickup ? '3 STEPS' : '3 STEPS'}</span>
          </header>

          <ol className="relative space-y-5 border-l border-border pl-6">
            <NextStep
              icon={<Mail className="h-4 w-4" />}
              title="Confirmation on its way"
              body={order?.customerEmail
                ? <>A receipt is heading to <span className="text-fg-1 font-medium">{order.customerEmail}</span>. Check your inbox in the next few minutes.</>
                : <>We've sent a receipt to your email if you provided one — it usually lands within a few minutes.</>}
            />
            <NextStep
              icon={<Package className="h-4 w-4" />}
              title={isPickup ? 'We start preparing your order' : 'Hand-picked & packed'}
              body={isPickup
                ? <>Our team picks each piece from the shop floor and quality-checks it before notifying you.</>
                : <>Each piece is inspected, folded with care and packed in our signature wrap.</>}
            />
            <NextStep
              icon={isPickup ? <Store className="h-4 w-4" /> : <Truck className="h-4 w-4" />}
              title={isPickup ? 'We email when it\'s ready to collect' : 'Courier dispatch within 24h'}
              body={isPickup
                ? <>You'll receive a "ready for pickup" email — bring the order number along when you visit the store.</>
                : <>Once it's handed to Delhivery, we'll email tracking and you can follow it live from your order page.</>}
              last
            />
          </ol>
        </motion.section>

        {/* Pickup location panel — only for store-pickup orders */}
        {isPickup && (
          <motion.section
            initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5 }}
            className="border border-brand/30 bg-brand/5 p-5"
          >
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-brand">
              <MapPin className="h-3.5 w-3.5" /> Collect From
            </p>
            <p className="mt-3 text-sm font-semibold text-fg-1">{STORE_PICKUP.name}</p>
            <p className="text-xs text-fg-3">{STORE_PICKUP.line1}</p>
            <p className="text-xs text-fg-3">{STORE_PICKUP.line2}</p>
            <p className="mt-3 border-t border-brand/15 pt-3 text-[11px] text-fg-3">{STORE_PICKUP.hours}</p>
          </motion.section>
        )}

        {/* Order summary */}
        {order && (
          <motion.section
            initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5 }}
          >
            <header className="mb-4 flex items-baseline justify-between">
              <h2 className="t-h4 text-fg-1">Order summary</h2>
              <span className="t-micro text-fg-4">{order.items.length} ITEM{order.items.length !== 1 ? 'S' : ''}</span>
            </header>
            <div className="border border-border bg-surface-elevated divide-y divide-border">
              {order.items.map((it, i) => {
                const meta = [it.variant.size, it.variant.color].filter(Boolean).join(' · ')
                return (
                  <div key={i} className="flex items-start justify-between gap-4 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-fg-1">{it.variant.product.name}</p>
                      <p className="mt-0.5 text-xs text-fg-3">
                        {meta && <span>{meta} · </span>}Qty {it.quantity}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-medium text-fg-1">
                      ₹{(Number(it.unitPrice) * it.quantity).toLocaleString('en-IN')}
                    </p>
                  </div>
                )
              })}
              <div className="flex items-center justify-between px-4 py-3.5 bg-surface">
                <span className="t-label text-fg-3">Paid total</span>
                <span className="font-display text-lg font-bold text-fg-1">
                  ₹{Number(order.total).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </motion.section>
        )}

        {/* CTAs */}
        <motion.section
          initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5 }}
          className="space-y-3"
        >
          <Link
            href={`/track?order=${encodeURIComponent(orderNumber)}`}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-fg-1 px-8 py-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-white transition-colors hover:bg-black"
          >
            Track this order <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <Link
            href="/products"
            className="flex w-full items-center justify-center gap-2 rounded-full border border-fg-1 px-8 py-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-fg-1 transition-colors hover:bg-surface-elevated"
          >
            Continue shopping <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </motion.section>

        {/* Loyalty hook + footer reassurance */}
        <motion.section
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5 }}
          className="border-t border-border pt-10 text-center"
        >
          <Sparkles className="mx-auto h-4 w-4 text-brand" />
          <p className="mt-3 text-xs text-fg-3">
            A confirmation email is on its way{order?.customerEmail ? <> to <span className="text-fg-1">{order.customerEmail}</span></> : null}.
            Save your order number — you'll need it to track or collect.
          </p>
          <p className="mt-4 text-[11px] text-fg-4">
            Questions? Reach us on{' '}
            <Link href="/contact" className="text-fg-1 underline underline-offset-4 hover:text-brand transition-colors">
              WhatsApp or email
            </Link>
            {' '}— we reply within a few hours.
          </p>
        </motion.section>

        {loading && !order && (
          <p className="text-center text-xs text-fg-4">Loading your order details…</p>
        )}
      </div>
    </div>
  )
}

// ─── Timeline step ────────────────────────────────────────────────────────────

function NextStep({
  icon, title, body, last,
}: { icon: React.ReactNode; title: string; body: React.ReactNode; last?: boolean }) {
  return (
    <li className="relative">
      <span
        aria-hidden
        className="absolute -left-[31px] top-0 flex h-6 w-6 items-center justify-center rounded-full border border-brand/30 bg-surface text-brand"
      >
        {icon}
      </span>
      <p className="text-sm font-semibold text-fg-1">{title}</p>
      <p className="mt-1 text-xs text-fg-3 leading-relaxed">{body}</p>
      {!last && <span className="sr-only">Next step:</span>}
    </li>
  )
}

// ─── Suspense boundary ───────────────────────────────────────────────────────

export default function OrderConfirmedPage() {
  return (
    <Suspense>
      <OrderConfirmedContent />
    </Suspense>
  )
}
