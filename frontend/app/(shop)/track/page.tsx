'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Package, Truck, CheckCircle, Clock, ExternalLink, ArrowRight, Store, MapPin } from 'lucide-react'
import { ordersApi } from '@/lib/api'

// ─── Status helpers ───────────────────────────────────────────────────────────

const ORDER_STATUSES = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] as const

const SHIPPING_STATUS_LABELS: Record<string, string> = {
  NOT_CREATED:    'Awaiting dispatch',
  CREATED:        'Shipment booked',
  SHIPPED:        'Picked up by courier',
  IN_TRANSIT:     'In transit',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED:      'Delivered',
  FAILED:         'Delivery issue — contact us',
}

function statusColor(s: string) {
  switch (s) {
    case 'PENDING':    return 'text-amber-400'
    case 'CONFIRMED':  return 'text-blue-400'
    case 'PROCESSING': return 'text-violet-400'
    case 'SHIPPED':    return 'text-cyan-400'
    case 'DELIVERED':  return 'text-emerald-400'
    case 'CANCELLED':  return 'text-red-400'
    default:           return 'text-muted'
  }
}

function StatusDot({ active, done }: { active: boolean; done: boolean }) {
  return (
    <span
      className={`flex h-6 w-6 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors ${
        done    ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400' :
        active  ? 'border-primary bg-primary/20 text-primary-light' :
                  'border-border bg-surface text-muted'
      }`}
    >
      {done ? '✓' : '·'}
    </span>
  )
}

// ─── Tracking result ──────────────────────────────────────────────────────────

type TrackResult = Awaited<ReturnType<typeof ordersApi.track>>

function TrackingResult({ data }: { data: TrackResult }) {
  const isPickup = data.fulfillmentType === 'PICKUP'

  // Pickup orders use a different stage list — there's no carrier handoff,
  // so we surface "Ready to collect" + "Picked up" instead of SHIPPED/DELIVERED.
  const PICKUP_STAGES = [
    { key: 'PAID',    label: 'Order paid',         done: true },
    { key: 'PREP',    label: 'Preparing your order', done: !!data.pickupReadyAt || !!data.pickedUpAt || data.status === 'PROCESSING' || data.status === 'DELIVERED' },
    { key: 'READY',   label: 'Ready to collect',   done: !!data.pickupReadyAt || !!data.pickedUpAt },
    { key: 'PICKED',  label: 'Picked up',          done: !!data.pickedUpAt || data.status === 'DELIVERED' },
  ]
  const currentIdx = ORDER_STATUSES.indexOf(data.status as any)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Order summary */}
      <div className="border border-border bg-surface p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted">Order Number</p>
            <p className="mt-1 font-display text-xl font-bold text-on-background">{data.orderNumber}</p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-widest text-muted">Total</p>
            <p className="mt-1 font-semibold text-on-background">₹{Number(data.total).toLocaleString('en-IN')}</p>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2 flex-wrap">
          <span className={`text-sm font-semibold ${statusColor(data.status)}`}>{data.status}</span>
          <span className="text-muted">·</span>
          <span className="text-xs text-muted">
            {isPickup
              ? (data.pickedUpAt ? 'Collected' : data.pickupReadyAt ? 'Ready to collect' : 'Preparing your order')
              : (SHIPPING_STATUS_LABELS[data.shippingStatus] ?? data.shippingStatus)}
          </span>
          <span className={`ml-auto rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1 ${
            isPickup ? 'bg-primary/15 text-primary-light' : 'bg-cyan-600/15 text-cyan-300'
          }`}>
            {isPickup ? <><Store className="h-3 w-3" /> Store Pickup</> : <><Truck className="h-3 w-3" /> Home Delivery</>}
          </span>
        </div>
      </div>

      {/* Progress tracker */}
      <div className="border border-border bg-surface p-5">
        <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted">
          {isPickup ? 'Pickup Progress' : 'Order Progress'}
        </p>
        <div className="space-y-4">
          {isPickup ? (
            PICKUP_STAGES.map((s, i) => {
              const nextUndone = PICKUP_STAGES.findIndex((x) => !x.done)
              const active = i === nextUndone
              return (
                <div key={s.key} className="flex items-center gap-3">
                  <StatusDot active={active} done={s.done} />
                  <span className={`text-sm ${active ? 'font-semibold text-on-background' : s.done ? 'text-on-background/60' : 'text-muted'}`}>
                    {s.label}
                  </span>
                  {active && <span className="ml-auto text-xs text-primary-light">Current</span>}
                </div>
              )
            })
          ) : (
            ORDER_STATUSES.map((s, i) => {
              const done   = i < currentIdx
              const active = i === currentIdx
              return (
                <div key={s} className="flex items-center gap-3">
                  <StatusDot active={active} done={done} />
                  <span className={`text-sm ${active ? 'font-semibold text-on-background' : done ? 'text-on-background/60' : 'text-muted'}`}>
                    {s.charAt(0) + s.slice(1).toLowerCase()}
                  </span>
                  {active && <span className="ml-auto text-xs text-primary-light">Current</span>}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Pickup location panel (PICKUP only) */}
      {isPickup && (
        <div className="border border-primary/30 bg-primary/5 p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary-light mb-2 flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" /> Collect From
          </p>
          <p className="text-sm font-medium text-on-background">Vami Clubwear — Manjeri Store</p>
          <p className="text-xs text-muted">Manjeri, Malappuram</p>
          <p className="text-xs text-muted">Kerala — 676121, India</p>
          <p className="text-[11px] text-muted mt-3 pt-3 border-t border-primary/20">
            Mon–Sat · 10:30 am – 9:00 pm · Please bring this order number when you visit.
          </p>
          {data.pickupReadyAt && !data.pickedUpAt && (
            <p className="mt-3 text-xs text-emerald-400 font-medium">
              ✓ Your order is ready to collect — come by anytime during store hours.
            </p>
          )}
        </div>
      )}

      {/* Shipment tracking (DELIVERY only) */}
      {!isPickup && data.awbNumber && (
        <div className="border border-cyan-500/30 bg-cyan-500/5 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-cyan-400 mb-1">
                <Truck className="inline h-3.5 w-3.5 mr-1" />Courier Tracking
              </p>
              <p className="text-sm text-muted">AWB Number</p>
              <p className="font-mono font-bold text-on-background">{data.awbNumber}</p>
            </div>
            {data.trackingUrl && (
              <a
                href={data.trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 bg-cyan-600 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white transition-opacity hover:opacity-90"
              >
                Track on Delhivery
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
      )}

      {/* Items */}
      <div className="border border-border bg-surface p-5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">Items</p>
        <div className="space-y-2">
          {data.items.map((item, i) => (
            <div key={i} className="flex items-center justify-between gap-2 text-sm">
              <span className="text-on-background">{item.variant.product.name}</span>
              <span className="text-muted">×{item.quantity}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

// ─── Tracking form ────────────────────────────────────────────────────────────

function TrackContent() {
  const searchParams = useSearchParams()
  const [orderNum,  setOrderNum]  = useState(searchParams.get('order') ?? '')
  const [result,    setResult]    = useState<TrackResult | null>(null)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const q = orderNum.trim()
    if (!q) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const data = await ordersApi.track(q)
      setResult(data)
    } catch {
      setError('Order not found. Please check the order number and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 pt-32 pb-10 md:px-8">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <p className="mb-2 text-xs uppercase tracking-[0.3em] text-primary-light">Order Tracking</p>
        <h1 className="mb-8 font-display text-4xl font-bold text-on-background">Track Your Order</h1>

        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={orderNum}
            onChange={(e) => setOrderNum(e.target.value)}
            placeholder="e.g. VCW-260407-0001"
            autoFocus
            className="flex-1 border border-border bg-surface px-4 py-3 text-sm text-on-background placeholder:text-muted outline-none focus:border-on-background transition-colors"
          />
          <button
            type="submit"
            disabled={loading || !orderNum.trim()}
            className="flex items-center gap-2 bg-primary px-5 py-3 text-xs font-semibold uppercase tracking-widest text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? (
              <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </button>
        </form>

        <AnimatePresence mode="wait">
          {error && (
            <motion.p
              key="error"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="mt-4 text-sm text-red-400"
            >
              {error}
            </motion.p>
          )}

          {result && (
            <motion.div key="result" className="mt-8">
              <TrackingResult data={result} />
            </motion.div>
          )}

          {!result && !error && !loading && (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="mt-12 flex flex-col items-center gap-3 text-center"
            >
              <Package className="h-12 w-12 text-muted opacity-20" />
              <p className="text-sm text-muted">Enter your order number to see live status and tracking.</p>
              <p className="text-xs text-muted">You can find your order number in the confirmation email.</p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-16 border-t border-border pt-8 text-center">
          <p className="text-xs text-muted">Need help? <Link href="/contact" className="text-on-background underline underline-offset-4 hover:text-primary-light transition-colors">Contact us</Link></p>
        </div>
      </motion.div>
    </div>
  )
}

export default function TrackPage() {
  return (
    <Suspense>
      <TrackContent />
    </Suspense>
  )
}
