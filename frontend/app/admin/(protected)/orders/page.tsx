'use client'

import { useEffect, useState, useCallback } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { AdminHeader } from '@/components/admin/AdminHeader'
import { RBACGuard } from '@/components/admin/RBACGuard'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ordersApi } from '@/lib/api'
import { toast } from '@/stores/toastStore'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

// ── Types ─────────────────────────────────────────────────────────────────────

type OrderStatus =
  | 'PENDING' | 'CONFIRMED' | 'PROCESSING'
  | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED'

type OrderSummary = {
  id: string
  orderNumber: string
  customerName: string | null
  status: string
  total: number
  createdAt: string
}

type OrderDetail = {
  id: string
  orderNumber: string
  status: string
  total: number
  customerName: string | null
  customerEmail: string | null
  customerPhone: string | null
  notes: string | null
  createdAt: string
  items: Array<{
    id: string
    quantity: number
    unitPrice: number
    variant: {
      sku: string
      size: string | null
      color: string | null
      product: { name: string }
    }
  }>
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_FLOW: OrderStatus[] = [
  'PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED',
]

function statusColor(s: string) {
  switch (s) {
    case 'PENDING':    return 'bg-amber-600/20 text-amber-400'
    case 'CONFIRMED':  return 'bg-blue-600/20 text-blue-400'
    case 'PROCESSING': return 'bg-violet-600/20 text-violet-400'
    case 'SHIPPED':    return 'bg-cyan-600/20 text-cyan-400'
    case 'DELIVERED':  return 'bg-emerald-600/20 text-emerald-400'
    case 'CANCELLED':  return 'bg-red-600/20 text-red-400'
    case 'REFUNDED':   return 'bg-gray-600/20 text-gray-400'
    default:           return 'bg-surface-elevated text-muted'
  }
}

const nextStatus: Record<string, OrderStatus | null> = {
  PENDING:    'CONFIRMED',
  CONFIRMED:  'PROCESSING',
  PROCESSING: 'SHIPPED',
  SHIPPED:    'DELIVERED',
  DELIVERED:  null,
  CANCELLED:  null,
  REFUNDED:   null,
}

// ── Order Detail Drawer ───────────────────────────────────────────────────────

function OrderDrawer({
  orderId,
  onClose,
  onStatusChanged,
}: {
  orderId: string
  onClose: () => void
  onStatusChanged: (id: string, status: string) => void
}) {
  const [order,    setOrder]    = useState<OrderDetail | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    ordersApi.get(orderId)
      .then((o) => setOrder(o as OrderDetail))
      .catch(() => toast.error('Failed to load order'))
      .finally(() => setLoading(false))
  }, [orderId])

  async function advance() {
    if (!order) return
    const next = nextStatus[order.status]
    if (!next) return
    setUpdating(true)
    try {
      await ordersApi.updateStatus(order.id, next)
      setOrder((o) => o ? { ...o, status: next } : o)
      onStatusChanged(order.id, next)
      toast.success(`Order marked as ${next.toLowerCase()}`)
    } catch (err: any) {
      toast.error(err.message ?? 'Update failed')
    } finally {
      setUpdating(false)
    }
  }

  async function cancel() {
    if (!order) return
    if (!confirm('Cancel this order?')) return
    setUpdating(true)
    try {
      await ordersApi.updateStatus(order.id, 'CANCELLED')
      setOrder((o) => o ? { ...o, status: 'CANCELLED' } : o)
      onStatusChanged(order.id, 'CANCELLED')
      toast.success('Order cancelled')
    } catch (err: any) {
      toast.error(err.message ?? 'Update failed')
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border p-4">
        <div>
          <h2 className="font-display text-sm font-semibold text-on-background">
            {loading ? '…' : order?.orderNumber}
          </h2>
          {!loading && order && (
            <span className={cn('mt-1 inline-block rounded px-2 py-0.5 text-xs font-medium', statusColor(order.status))}>
              {order.status}
            </span>
          )}
        </div>
        <button onClick={onClose} className="rounded p-1.5 text-muted hover:text-on-background">
          <X className="h-4 w-4" />
        </button>
      </div>

      {loading ? (
        <div className="flex-1 space-y-3 p-4">
          {[...Array(5)].map((_, i) => <div key={i} className="h-6 rounded bg-surface-elevated animate-pulse" />)}
        </div>
      ) : order ? (
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Customer */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted mb-2">Customer</h3>
            <p className="text-sm text-on-background">{order.customerName ?? 'Walk-in'}</p>
            {order.customerEmail && <p className="text-xs text-muted">{order.customerEmail}</p>}
            {order.customerPhone && <p className="text-xs text-muted">{order.customerPhone}</p>}
            {order.notes && <p className="mt-1 text-xs text-muted italic">{order.notes}</p>}
          </section>

          {/* Items */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted mb-2">Items</h3>
            <div className="space-y-2">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-2 text-sm">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-on-background">{item.variant.product.name}</p>
                    <p className="text-xs text-muted font-mono">{item.variant.sku}</p>
                    <p className="text-xs text-muted">
                      {[item.variant.size, item.variant.color].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm text-on-background">₹{item.unitPrice.toLocaleString('en-IN')}</p>
                    <p className="text-xs text-muted">×{item.quantity}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex justify-between border-t border-border pt-3">
              <span className="text-sm font-semibold text-on-background">Total</span>
              <span className="text-sm font-semibold text-on-background">₹{order.total.toLocaleString('en-IN')}</span>
            </div>
          </section>

          {/* Status flow */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted mb-2">Status Flow</h3>
            <div className="flex gap-1 flex-wrap">
              {STATUS_FLOW.map((s) => {
                const idx      = STATUS_FLOW.indexOf(s)
                const curIdx   = STATUS_FLOW.indexOf(order.status as OrderStatus)
                const done     = idx <= curIdx
                return (
                  <span
                    key={s}
                    className={cn(
                      'rounded px-2 py-0.5 text-xs font-medium',
                      done ? statusColor(s) : 'bg-surface-elevated text-muted opacity-40'
                    )}
                  >
                    {s}
                  </span>
                )
              })}
            </div>
          </section>
        </div>
      ) : null}

      {/* Actions */}
      {order && !loading && (
        <div className="border-t border-border p-4 flex gap-2">
          {nextStatus[order.status] && (
            <button
              onClick={advance}
              disabled={updating}
              className="flex-1 bg-primary py-2 text-xs font-semibold uppercase tracking-widest text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {updating ? 'Updating…' : `Mark as ${nextStatus[order.status]}`}
            </button>
          )}
          {!['CANCELLED', 'REFUNDED', 'DELIVERED'].includes(order.status) && (
            <button
              onClick={cancel}
              disabled={updating}
              className="rounded border border-red-500/40 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

const STATUS_FILTERS = ['ALL', 'PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']

export default function OrdersPage() {
  const [orders,      setOrders]      = useState<OrderSummary[]>([])
  const [total,       setTotal]       = useState(0)
  const [page,        setPage]        = useState(1)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [loading,     setLoading]     = useState(true)
  const [selectedId,  setSelectedId]  = useState<string | null>(null)
  const limit = 20

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params: { page: number; limit: number; status?: string } = { page, limit }
      if (statusFilter !== 'ALL') params.status = statusFilter
      const r = await ordersApi.list(params)
      setOrders(r.data)
      setTotal(r.total)
    } catch {
      toast.error('Failed to load orders')
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter])

  useEffect(() => { load() }, [load])

  function handleStatusChanged(id: string, status: string) {
    setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status } : o))
  }

  return (
    <RBACGuard section="orders">
      <AdminHeader title="Orders" subtitle={`${total} total orders`} />

      <div className="flex h-[calc(100vh-64px)]">
        {/* Main list */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Filters */}
          <div className="flex gap-1 overflow-x-auto border-b border-border px-6 py-2">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setPage(1) }}
                className={cn(
                  'shrink-0 rounded px-3 py-1 text-xs font-medium transition-colors',
                  statusFilter === s
                    ? 'bg-primary text-white'
                    : 'text-muted hover:text-on-background hover:bg-surface-elevated'
                )}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="flex-1 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="hidden md:table-cell">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading
                  ? [...Array(8)].map((_, i) => (
                      <TableRow key={i}>
                        {[...Array(5)].map((_, j) => (
                          <TableCell key={j}><div className="h-4 w-24 rounded bg-surface-elevated animate-pulse" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  : orders.map((o) => (
                      <TableRow
                        key={o.id}
                        onClick={() => setSelectedId(o.id)}
                        className={cn(
                          'cursor-pointer transition-colors hover:bg-surface-elevated',
                          selectedId === o.id && 'bg-surface-elevated'
                        )}
                      >
                        <TableCell className="font-mono text-xs font-medium text-on-background">{o.orderNumber}</TableCell>
                        <TableCell className="text-sm">{o.customerName ?? <span className="text-muted">Walk-in</span>}</TableCell>
                        <TableCell>
                          <span className={cn('rounded px-2 py-0.5 text-xs font-medium', statusColor(o.status))}>
                            {o.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-sm font-medium">₹{o.total.toLocaleString('en-IN')}</TableCell>
                        <TableCell className="hidden md:table-cell text-xs text-muted">
                          {new Date(o.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </TableCell>
                      </TableRow>
                    ))
                }
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-border px-6 py-3">
            <span className="text-xs text-muted">
              {Math.min((page - 1) * limit + 1, total)}–{Math.min(page * limit, total)} of {total}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded p-1.5 text-muted hover:text-on-background disabled:opacity-40"
              ><ChevronLeft className="h-4 w-4" /></button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= Math.ceil(total / limit)}
                className="rounded p-1.5 text-muted hover:text-on-background disabled:opacity-40"
              ><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
        </div>

        {/* Detail drawer */}
        <AnimatePresence>
          {selectedId && (
            <motion.aside
              key={selectedId}
              initial={{ x: 40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 40, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="w-80 shrink-0 border-l border-border bg-surface overflow-hidden"
            >
              <OrderDrawer
                orderId={selectedId}
                onClose={() => setSelectedId(null)}
                onStatusChanged={handleStatusChanged}
              />
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </RBACGuard>
  )
}
