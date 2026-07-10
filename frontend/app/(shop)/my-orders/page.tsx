'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Package, ChevronRight, ExternalLink,
  Truck, Clock, CheckCircle, XCircle, ArrowLeft,
} from 'lucide-react'
import { customerAuthApi } from '@/lib/api'
import { useCustomerAuthStore } from '@/stores/customerAuthStore'

// ─── Types ────────────────────────────────────────────────────────────────────

type OrderSummary = Awaited<ReturnType<typeof customerAuthApi.orders>>['orders'][number]

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
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] as const }}
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

// ─── Signed-in customer order history ─────────────────────────────────────────
// F2 removed the anonymous phone/email lookup endpoint. Middleware.ts gates
// this route to signed-in customers only, so we always fetch via the
// authenticated /customer/orders endpoint and never accept an untrusted
// contact-detail query. If a visitor lands here without a session the
// middleware has already redirected them to /?signin=required.

function MyOrdersContent() {
  const customer = useCustomerAuthStore((s) => s.user)

  const [orders,  setOrders]  = useState<OrderSummary[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    if (!customer) {
      // Middleware normally prevents us from getting here; render an empty
      // state instead of blocking.
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    customerAuthApi
      .orders()
      .then((res) => { if (!cancelled) setOrders(res.orders) })
      .catch((err: any) => {
        if (!cancelled) setError(err?.message ?? 'Could not load your orders.')
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [customer?.id])

  return (
    <div className="mx-auto max-w-2xl px-4 pt-32 pb-10 md:px-8">

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
          {customer?.email
            ? <>Showing orders for <strong className="text-on-background">{customer.email}</strong>.</>
            : 'Sign in to see your complete order history.'}
        </p>

        {error && (
          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="mb-6 text-sm text-red-400"
          >
            {error}
          </motion.p>
        )}
      </motion.div>

      {/* Results */}
      <AnimatePresence mode="wait">
        {loading && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="mt-10 flex justify-center py-16"
          >
            <span className="h-6 w-6 rounded-full border-2 border-muted/30 border-t-on-background animate-spin" />
          </motion.div>
        )}

        {!loading && orders !== null && orders.length === 0 && (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-10 flex flex-col items-center gap-4 py-16 text-center"
          >
            <Package className="h-14 w-14 text-muted opacity-20" />
            <p className="font-display text-xl font-bold text-on-background">No orders yet</p>
            <p className="text-sm text-muted max-w-xs">
              You haven't placed any orders yet. Start browsing our collection.
            </p>
            <Link
              href="/products"
              className="mt-4 inline-flex items-center gap-2 bg-primary px-7 py-3 text-xs font-semibold uppercase tracking-widest text-white transition-opacity hover:opacity-90"
            >
              Start Shopping
            </Link>
          </motion.div>
        )}

        {!loading && orders !== null && orders.length > 0 && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-10"
          >
            <p className="mb-4 text-xs text-muted">
              Found <strong className="text-on-background">{orders.length}</strong> order{orders.length !== 1 ? 's' : ''}
            </p>
            <div className="space-y-3">
              {orders.map((order) => (
                <OrderCard key={order.orderNumber} order={order} />
              ))}
            </div>
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
