'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Package, Phone, Mail, ChevronRight, ExternalLink,
  Truck, Clock, CheckCircle, XCircle, Search, ArrowLeft,
} from 'lucide-react'
import { ordersApi } from '@/lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────

type OrderSummary = Awaited<ReturnType<typeof ordersApi.lookup>>['orders'][number]

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  PENDING:    'bg-amber-500/15 text-amber-400 border-amber-500/30',
  CONFIRMED:  'bg-blue-500/15 text-blue-400 border-blue-500/30',
  PROCESSING: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
  SHIPPED:    'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  DELIVERED:  'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  CANCELLED:  'bg-red-500/15 text-red-400 border-red-500/30',
}

const SHIPPING_LABEL: Record<string, string> = {
  NOT_CREATED:      'Awaiting dispatch',
  CREATED:          'Shipment booked',
  SHIPPED:          'Picked up',
  IN_TRANSIT:       'In transit',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED:        'Delivered',
  FAILED:           'Delivery issue',
}

function statusIcon(status: string) {
  switch (status) {
    case 'DELIVERED':  return <CheckCircle className="h-4 w-4 text-emerald-400" />
    case 'SHIPPED':
    case 'IN_TRANSIT':
    case 'OUT_FOR_DELIVERY': return <Truck className="h-4 w-4 text-cyan-400" />
    case 'CANCELLED':  return <XCircle className="h-4 w-4 text-red-400" />
    default:           return <Clock className="h-4 w-4 text-amber-400" />
  }
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ─── Order Card ───────────────────────────────────────────────────────────────

function OrderCard({ order }: { order: OrderSummary }) {
  const [expanded, setExpanded] = useState(false)
  const itemCount = order.items.reduce((s, i) => s + i.quantity, 0)

  return (
    <motion.div
      layout
      className="border border-border bg-surface overflow-hidden"
    >
      {/* Header row */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-surface-elevated transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs font-bold text-on-background">{order.orderNumber}</span>
            <span className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] font-medium ${STATUS_COLOR[order.status] ?? 'bg-surface-elevated text-muted border-border'}`}>
              {order.status}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted">{fmtDate(order.createdAt)} · {itemCount} item{itemCount !== 1 ? 's' : ''}</p>
          <div className="mt-1 flex items-center gap-1.5">
            {statusIcon(order.shippingStatus)}
            <span className="text-xs text-muted">{SHIPPING_LABEL[order.shippingStatus] ?? order.shippingStatus}</span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-semibold text-on-background">₹{Number(order.total).toLocaleString('en-IN')}</p>
          <ChevronRight className={`mt-1 h-4 w-4 text-muted ml-auto transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </div>
      </button>

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t border-border px-4 py-4 space-y-4">

              {/* Items */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted mb-2">Items</p>
                <div className="space-y-2">
                  {order.items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <Link
                          href={`/products/${item.variant.product.slug}`}
                          className="text-sm font-medium text-on-background hover:text-primary-light transition-colors truncate block"
                        >
                          {item.variant.product.name}
                        </Link>
                        <p className="text-xs text-muted">
                          {[item.variant.size, item.variant.color].filter(Boolean).join(' · ')}
                          {' '}·{' '}SKU: {item.variant.sku}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm text-on-background">₹{Number(item.unitPrice).toLocaleString('en-IN')}</p>
                        <p className="text-xs text-muted">×{item.quantity}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tracking */}
              {order.awbNumber && (
                <div className="rounded border border-cyan-500/20 bg-cyan-500/5 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-cyan-400 mb-1">Shipment Tracking</p>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs text-muted">AWB Number</p>
                      <p className="font-mono text-sm font-bold text-on-background">{order.awbNumber}</p>
                    </div>
                    {order.trackingUrl && (
                      <a
                        href={order.trackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 bg-cyan-700/30 border border-cyan-500/30 px-3 py-1.5 text-xs font-medium text-cyan-400 hover:bg-cyan-700/50 transition-colors shrink-0"
                      >
                        Track <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Full detail link */}
              <Link
                href={`/track?order=${encodeURIComponent(order.orderNumber)}`}
                className="flex items-center justify-center gap-2 border border-border py-2 text-xs font-semibold uppercase tracking-widest text-muted hover:text-on-background hover:border-on-background transition-colors"
              >
                Full Tracking Details <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Lookup form ──────────────────────────────────────────────────────────────

type LookupMode = 'phone' | 'email'

function MyOrdersContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [mode,    setMode]    = useState<LookupMode>('phone')
  const [value,   setValue]   = useState(searchParams.get('phone') ?? searchParams.get('email') ?? '')
  const [orders,  setOrders]  = useState<OrderSummary[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [searched, setSearched] = useState(false)

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault()
    const q = value.trim()
    if (!q) return
    setLoading(true)
    setError(null)
    setOrders(null)
    setSearched(false)
    try {
      const res = await ordersApi.lookup(
        mode === 'phone' ? { phone: q } : { email: q }
      )
      setOrders(res.orders)
      setSearched(true)
      // Update URL without reload
      const params = new URLSearchParams()
      params.set(mode, q)
      router.replace(`/my-orders?${params}`, { scroll: false })
    } catch {
      setError('Could not look up orders. Please check and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pt-32 pb-24 md:px-8">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Link
          href="/products"
          className="mb-8 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-muted hover:text-on-background transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Continue Shopping
        </Link>

        <p className="mb-2 text-xs uppercase tracking-[0.3em] text-primary-light">Order History</p>
        <h1 className="mb-2 font-display text-4xl font-bold text-on-background">My Orders</h1>
        <p className="mb-10 text-sm text-muted">
          Enter the phone number or email you used at checkout to see all your orders.
        </p>

        {/* Mode toggle */}
        <div className="mb-4 flex gap-1 border border-border p-1 w-fit">
          {(['phone', 'email'] as LookupMode[]).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setValue(''); setOrders(null); setSearched(false) }}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-widest transition-colors ${
                mode === m ? 'bg-primary text-white' : 'text-muted hover:text-on-background'
              }`}
            >
              {m === 'phone' ? <Phone className="h-3.5 w-3.5" /> : <Mail className="h-3.5 w-3.5" />}
              {m === 'phone' ? 'Phone Number' : 'Email Address'}
            </button>
          ))}
        </div>

        {/* Lookup form */}
        <form onSubmit={handleLookup} className="flex gap-2">
          <div className="relative flex-1">
            {mode === 'phone'
              ? <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
              : <Mail  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
            }
            <input
              type={mode === 'email' ? 'email' : 'tel'}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={mode === 'phone' ? 'e.g. 9876543210' : 'e.g. you@email.com'}
              autoFocus
              className="w-full border border-border bg-surface pl-10 pr-4 py-3 text-sm text-on-background placeholder:text-muted outline-none focus:border-on-background transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !value.trim()}
            className="flex items-center gap-2 bg-primary px-5 py-3 text-xs font-semibold uppercase tracking-widest text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading
              ? <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              : <Search className="h-4 w-4" />
            }
            <span className="hidden sm:inline">Find Orders</span>
          </button>
        </form>

        {error && (
          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="mt-3 text-sm text-red-400"
          >
            {error}
          </motion.p>
        )}
      </motion.div>

      {/* Results */}
      <AnimatePresence mode="wait">
        {searched && orders !== null && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-10"
          >
            {orders.length === 0 ? (
              <div className="flex flex-col items-center gap-4 py-16 text-center">
                <Package className="h-14 w-14 text-muted opacity-20" />
                <p className="font-display text-xl font-bold text-on-background">No orders found</p>
                <p className="text-sm text-muted max-w-xs">
                  We couldn't find any orders for that {mode === 'phone' ? 'phone number' : 'email address'}.
                  Make sure it matches what you entered at checkout.
                </p>
                <Link
                  href="/products"
                  className="mt-4 inline-flex items-center gap-2 bg-primary px-7 py-3 text-xs font-semibold uppercase tracking-widest text-white transition-opacity hover:opacity-90"
                >
                  Start Shopping
                </Link>
              </div>
            ) : (
              <>
                <p className="mb-4 text-xs text-muted">
                  Found <strong className="text-on-background">{orders.length}</strong> order{orders.length !== 1 ? 's' : ''}
                </p>
                <div className="space-y-3">
                  {orders.map((order) => (
                    <OrderCard key={order.orderNumber} order={order} />
                  ))}
                </div>
              </>
            )}
          </motion.div>
        )}

        {!searched && !loading && (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="mt-16 flex flex-col items-center gap-3 text-center"
          >
            <Package className="h-12 w-12 text-muted opacity-15" />
            <p className="text-sm text-muted">Your complete order history will appear here.</p>
            <p className="text-xs text-muted">Each order shows status, tracking, and item details.</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Help footer */}
      <div className="mt-16 border-t border-border pt-8 text-center">
        <p className="text-xs text-muted">
          Can't find your order?{' '}
          <Link href="/contact" className="text-on-background underline underline-offset-4 hover:text-primary-light transition-colors">
            Contact us
          </Link>
          {' '}or{' '}
          <Link href="/track" className="text-on-background underline underline-offset-4 hover:text-primary-light transition-colors">
            track by order number
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function MyOrdersPage() {
  return (
    <Suspense>
      <MyOrdersContent />
    </Suspense>
  )
}
