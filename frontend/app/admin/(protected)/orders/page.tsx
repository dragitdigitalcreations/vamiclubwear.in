'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  ChevronLeft, ChevronRight, X, Truck, FileText,
  ExternalLink, Loader2, Package, User, CheckCircle,
} from 'lucide-react'
import { AdminHeader }  from '@/components/admin/AdminHeader'
import { RBACGuard }    from '@/components/admin/RBACGuard'
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table'
import { ordersApi, shippingApi } from '@/lib/api'
import { toast }  from '@/stores/toastStore'
import { cn }     from '@/lib/utils'
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
  customerName:    string | null
  customerEmail:   string | null
  customerPhone:   string | null
  shippingAddress: string | null
  shippingCity:    string | null
  shippingState:   string | null
  shippingPincode: string | null
  shippingStatus:  string
  awbNumber:       string | null
  trackingUrl:     string | null
  invoiceStatus:   string
  invoiceNumber:   string | null
  invoicePdfUrl:   string | null
  notes:           string | null
  createdAt:       string
  items: Array<{
    id: string
    quantity:  number
    unitPrice: number
    variant: {
      sku:   string
      size:  string | null
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

const SHIPPING_STATUS_LABELS: Record<string, string> = {
  NOT_CREATED:      'Not dispatched',
  CREATED:          'Shipment booked',
  SHIPPED:          'Shipped / Picked up',
  IN_TRANSIT:       'In Transit',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED:        'Delivered',
  FAILED:           'Delivery Failed',
}

function shippingStatusColor(s: string) {
  switch (s) {
    case 'DELIVERED':        return 'bg-emerald-600/20 text-emerald-400'
    case 'SHIPPED':
    case 'IN_TRANSIT':       return 'bg-cyan-600/20 text-cyan-400'
    case 'OUT_FOR_DELIVERY': return 'bg-blue-600/20 text-blue-400'
    case 'CREATED':          return 'bg-violet-600/20 text-violet-400'
    case 'FAILED':           return 'bg-red-600/20 text-red-400'
    default:                 return 'bg-surface-elevated text-muted'
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

// ── Drawer Tab type ───────────────────────────────────────────────────────────

type DrawerTab = 'details' | 'shipment' | 'invoice'

// ── Tab Button ────────────────────────────────────────────────────────────────

function TabBtn({
  active, onClick, icon: Icon, label, dot, dotColor,
}: {
  active: boolean
  onClick: () => void
  icon: React.ElementType
  label: string
  dot?: boolean
  dotColor?: string
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative flex flex-1 flex-col items-center gap-1 py-3 text-[10px] font-semibold uppercase tracking-wider transition-colors border-b-2',
        active
          ? 'border-primary-light text-on-background'
          : 'border-transparent text-muted hover:text-on-background'
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
      {dot && (
        <span className={cn('absolute right-3 top-2 h-2 w-2 rounded-full', dotColor ?? 'bg-amber-400')} />
      )}
    </button>
  )
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
  const [order,         setOrder]         = useState<OrderDetail | null>(null)
  const [loading,       setLoading]       = useState(true)
  const [updating,      setUpdating]      = useState(false)
  const [tab,           setTab]           = useState<DrawerTab>('details')
  const [creatingShip,  setCreatingShip]  = useState(false)
  const [invoiceNum,    setInvoiceNum]    = useState('')
  const [savingInvoice, setSavingInvoice] = useState(false)

  useEffect(() => {
    setTab('details')
    ordersApi.get(orderId)
      .then((o) => {
        const od = o as OrderDetail
        setOrder(od)
        setInvoiceNum(od.invoiceNumber ?? '')
      })
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

  async function handleCreateShipment() {
    if (!order) return
    setCreatingShip(true)
    try {
      const result = await shippingApi.createShipment(order.id)
      setOrder((o) => o ? {
        ...o,
        shippingStatus: result.status,
        awbNumber:      result.awbNumber,
        trackingUrl:    result.trackingUrl,
      } : o)
      toast.success(`Shipment created! AWB: ${result.awbNumber}`)
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to create shipment')
    } finally {
      setCreatingShip(false)
    }
  }

  const [resendingEmail, setResendingEmail] = useState(false)
  async function handleResendShipmentEmail() {
    if (!order) return
    setResendingEmail(true)
    try {
      const result = await shippingApi.resendShipmentEmail(order.id)
      toast.success(`Tracking email sent to ${result.sentTo}`)
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to resend tracking email')
    } finally {
      setResendingEmail(false)
    }
  }

  async function handleSaveInvoice(markCreated?: boolean) {
    if (!order) return
    setSavingInvoice(true)
    try {
      const result = await shippingApi.updateInvoice(order.id, {
        invoiceNumber: invoiceNum || undefined,
        invoiceStatus: markCreated ? 'CREATED' : undefined,
      })
      setOrder((o) => o ? {
        ...o,
        invoiceStatus: result.invoiceStatus,
        invoiceNumber: result.invoiceNumber,
      } : o)
      toast.success(markCreated ? 'Invoice marked as created in Acrotex' : 'Invoice number saved')
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to save invoice')
    } finally {
      setSavingInvoice(false)
    }
  }

  return (
    <div className="flex h-full flex-col">

      {/* ── Drawer header ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="min-w-0">
          <h2 className="font-mono text-sm font-bold text-on-background truncate">
            {loading ? '…' : order?.orderNumber}
          </h2>
          {!loading && order && (
            <span className={cn(
              'mt-1 inline-block rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
              statusColor(order.status)
            )}>
              {order.status}
            </span>
          )}
        </div>
        <button onClick={onClose} className="ml-2 shrink-0 rounded p-1.5 text-muted hover:text-on-background transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* ── Tab bar ──────────────────────────────────────────────────────── */}
      {order && !loading && (
        <div className="flex border-b border-border bg-surface">
          <TabBtn
            active={tab === 'details'}
            onClick={() => setTab('details')}
            icon={Package}
            label="Details"
          />
          <TabBtn
            active={tab === 'shipment'}
            onClick={() => setTab('shipment')}
            icon={Truck}
            label="Shipment"
            dot={order.shippingStatus === 'NOT_CREATED'}
            dotColor="bg-amber-400"
          />
          <TabBtn
            active={tab === 'invoice'}
            onClick={() => setTab('invoice')}
            icon={FileText}
            label="Invoice"
            dot={order.invoiceStatus === 'PENDING'}
            dotColor="bg-amber-400"
          />
        </div>
      )}

      {/* ── Content area ─────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex-1 space-y-3 p-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-6 rounded bg-surface-elevated animate-pulse" />
          ))}
        </div>
      ) : order ? (
        <div className="flex-1 overflow-y-auto">

          {/* ── DETAILS TAB ──────────────────────────────────────────────── */}
          {tab === 'details' && (
            <div className="p-4 space-y-5">

              {/* Customer */}
              <section>
                <div className="flex items-center gap-2 mb-2">
                  <User className="h-3.5 w-3.5 text-muted" />
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-muted">Customer</h3>
                </div>
                <div className="rounded border border-border bg-surface-elevated p-3 space-y-1">
                  <p className="text-sm font-medium text-on-background">{order.customerName ?? 'Walk-in Customer'}</p>
                  {order.customerEmail && <p className="text-xs text-muted">{order.customerEmail}</p>}
                  {order.customerPhone && <p className="text-xs text-muted">{order.customerPhone}</p>}
                  {(order.shippingAddress || order.shippingCity) && (
                    <p className="mt-1 text-xs text-muted pt-1 border-t border-border">
                      {[order.shippingAddress, order.shippingCity, order.shippingState, order.shippingPincode]
                        .filter(Boolean).join(', ')}
                    </p>
                  )}
                  {order.notes && (
                    <p className="text-xs text-muted italic pt-1 border-t border-border">{order.notes}</p>
                  )}
                </div>
              </section>

              {/* Items */}
              <section>
                <div className="flex items-center gap-2 mb-2">
                  <Package className="h-3.5 w-3.5 text-muted" />
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-muted">Items</h3>
                </div>
                <div className="rounded border border-border overflow-hidden">
                  {order.items.map((item, i) => (
                    <div key={item.id} className={cn(
                      'flex items-start justify-between gap-3 p-3',
                      i > 0 && 'border-t border-border'
                    )}>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-on-background leading-snug">{item.variant.product.name}</p>
                        <p className="text-xs font-mono text-muted">{item.variant.sku}</p>
                        {(item.variant.size || item.variant.color) && (
                          <p className="text-xs text-muted">
                            {[item.variant.size, item.variant.color].filter(Boolean).join(' · ')}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-on-background">₹{Number(item.unitPrice).toLocaleString('en-IN')}</p>
                        <p className="text-xs text-muted">qty {item.quantity}</p>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between border-t border-border bg-surface-elevated px-3 py-2">
                    <span className="text-sm font-semibold text-on-background">Total</span>
                    <span className="text-sm font-semibold text-on-background">₹{Number(order.total).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </section>

              {/* Status progress */}
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-widest text-muted mb-2">Order Progress</h3>
                <div className="rounded border border-border overflow-hidden">
                  {STATUS_FLOW.map((s, i) => {
                    const curIdx = STATUS_FLOW.indexOf(order.status as OrderStatus)
                    const done   = i < curIdx
                    const active = i === curIdx
                    return (
                      <div key={s} className={cn(
                        'flex items-center gap-3 px-3 py-2',
                        i > 0 && 'border-t border-border',
                        active && 'bg-surface-elevated'
                      )}>
                        <span className={cn(
                          'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                          done   ? 'bg-emerald-500/20 text-emerald-400' :
                          active ? 'bg-primary/20 text-primary-light' :
                                   'bg-surface text-muted border border-border'
                        )}>
                          {done ? '✓' : i + 1}
                        </span>
                        <span className={cn(
                          'text-xs font-medium',
                          active ? 'text-on-background' : done ? 'text-on-background/50' : 'text-muted'
                        )}>
                          {s.charAt(0) + s.slice(1).toLowerCase()}
                        </span>
                        {active && (
                          <span className="ml-auto text-[10px] text-primary-light font-semibold uppercase tracking-wider">
                            Current
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </section>

            </div>
          )}

          {/* ── SHIPMENT TAB ─────────────────────────────────────────────── */}
          {tab === 'shipment' && (
            <div className="p-4 space-y-4">

              {/* Status badge */}
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-muted">Delhivery Shipment</h3>
                <span className={cn('rounded px-2 py-1 text-xs font-semibold', shippingStatusColor(order.shippingStatus))}>
                  {SHIPPING_STATUS_LABELS[order.shippingStatus] ?? order.shippingStatus}
                </span>
              </div>

              {order.awbNumber ? (
                /* ── Shipment booked — show AWB + tracking ── */
                <div className="space-y-3">
                  <div className="rounded border border-cyan-500/25 bg-cyan-500/5 p-4 space-y-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-cyan-400 mb-1">AWB / Tracking Number</p>
                      <p className="font-mono text-lg font-bold text-on-background">{order.awbNumber}</p>
                    </div>
                    {order.trackingUrl && (
                      <a
                        href={order.trackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 bg-cyan-700/30 border border-cyan-500/40 py-2.5 text-xs font-semibold uppercase tracking-widest text-cyan-400 hover:bg-cyan-700/50 transition-colors w-full"
                      >
                        <Truck className="h-3.5 w-3.5" />
                        Track on Delhivery
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>

                  {/* Resend tracking email — for backfilling orders whose
                      original auto-send was skipped or to re-send on customer request */}
                  {order.customerEmail && (
                    <button
                      onClick={handleResendShipmentEmail}
                      disabled={resendingEmail}
                      className="flex w-full items-center justify-center gap-2 rounded border border-border py-2.5 text-xs font-semibold uppercase tracking-widest text-on-background hover:bg-surface-elevated disabled:opacity-50 transition-colors"
                    >
                      {resendingEmail
                        ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Sending…</>
                        : <>Resend Tracking Email to {order.customerEmail}</>
                      }
                    </button>
                  )}

                  <div className="rounded border border-border p-3 text-xs text-muted space-y-1">
                    <p><span className="text-on-background font-medium">Carrier:</span> Delhivery</p>
                    <p><span className="text-on-background font-medium">Status:</span> {SHIPPING_STATUS_LABELS[order.shippingStatus]}</p>
                    {order.shippingAddress && (
                      <p className="pt-1 border-t border-border">
                        <span className="text-on-background font-medium">Delivering to:</span>{' '}
                        {[order.shippingAddress, order.shippingCity, order.shippingState, order.shippingPincode]
                          .filter(Boolean).join(', ')}
                      </p>
                    )}
                  </div>
                </div>

              ) : order.status === 'PENDING' ? (
                /* ── Order not confirmed yet — explain auto-flow ── */
                <div className="rounded border border-border bg-surface-elevated p-4 space-y-2 text-center">
                  <Truck className="h-8 w-8 text-muted opacity-30 mx-auto" />
                  <p className="text-sm font-medium text-on-background">Shipment will be auto-created</p>
                  <p className="text-xs text-muted">
                    When you click <strong className="text-on-background">Mark as CONFIRMED</strong> below,
                    Delhivery will automatically book a pickup and generate an AWB number.
                    The customer will receive a tracking email instantly.
                  </p>
                </div>

              ) : ['CONFIRMED', 'PROCESSING', 'SHIPPED'].includes(order.status) && order.shippingStatus === 'NOT_CREATED' ? (
                /* ── Post-payment but no AWB — auto-creation skipped or failed ── */
                <div className="space-y-4">
                  <div className="rounded border border-amber-500/30 bg-amber-500/5 p-3">
                    <p className="text-xs font-semibold text-amber-400 mb-1">Shipment not yet created</p>
                    <p className="text-xs text-muted">
                      Auto-creation may have been skipped if <code className="text-on-background">DELHIVERY_TOKEN</code> wasn&apos;t set
                      at the moment of status change, or if Delhivery returned an error. Click below to create the shipment now.
                    </p>
                  </div>

                  {order.shippingAddress ? (
                    <button
                      onClick={handleCreateShipment}
                      disabled={creatingShip}
                      className="flex w-full items-center justify-center gap-2 bg-primary py-3 text-xs font-semibold uppercase tracking-widest text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
                    >
                      {creatingShip
                        ? <><Loader2 className="h-4 w-4 animate-spin" />Creating…</>
                        : <><Truck className="h-4 w-4" />Create Shipment via Delhivery</>
                      }
                    </button>
                  ) : (
                    <div className="rounded border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-400">
                      No delivery address on this order. Contact the customer to get their address, then update the order.
                    </div>
                  )}
                </div>

              ) : (
                /* ── Cancelled / other terminal state ── */
                <div className="rounded border border-border bg-surface-elevated p-4 text-center">
                  <p className="text-xs text-muted">No shipment — order is {order.status.toLowerCase()}.</p>
                </div>
              )}
            </div>
          )}

          {/* ── INVOICE TAB ──────────────────────────────────────────────── */}
          {tab === 'invoice' && (
            <div className="p-4 space-y-4">

              {/* Status */}
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-muted">Acrotex Invoice</h3>
                <span className={cn(
                  'rounded px-2 py-1 text-xs font-semibold',
                  order.invoiceStatus === 'CREATED'
                    ? 'bg-emerald-600/20 text-emerald-400'
                    : 'bg-amber-600/20 text-amber-400'
                )}>
                  {order.invoiceStatus === 'CREATED' ? '✓ Created in Acrotex' : 'Pending'}
                </span>
              </div>

              {/* How it works */}
              <div className="rounded border border-border bg-surface-elevated p-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted mb-1.5">Workflow</p>
                <ol className="text-xs text-muted space-y-1.5 list-decimal list-inside">
                  <li>Open Acrotex and create the invoice manually</li>
                  <li>Copy the invoice number from Acrotex</li>
                  <li>Paste it below and click <strong className="text-on-background">Save</strong></li>
                  <li>Click <strong className="text-on-background">Mark as Created</strong> to close the loop</li>
                </ol>
              </div>

              {/* Invoice number input */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-widest text-muted">Invoice Number</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={invoiceNum}
                    onChange={(e) => setInvoiceNum(e.target.value)}
                    placeholder="e.g. INV-2026-0042"
                    className="flex-1 border border-border bg-transparent px-3 py-2.5 text-sm text-on-background placeholder:text-muted outline-none focus:border-on-background transition-colors"
                  />
                  <button
                    onClick={() => handleSaveInvoice(false)}
                    disabled={savingInvoice || !invoiceNum.trim()}
                    className="px-4 py-2.5 text-xs font-semibold border border-border text-muted hover:text-on-background hover:border-on-background disabled:opacity-40 transition-colors"
                  >
                    Save
                  </button>
                </div>
                {order.invoiceNumber && order.invoiceStatus === 'CREATED' && (
                  <p className="flex items-center gap-1.5 text-xs text-emerald-400">
                    <CheckCircle className="h-3.5 w-3.5" />
                    Invoice <strong>{order.invoiceNumber}</strong> saved and marked created
                  </p>
                )}
              </div>

              {/* Mark created button */}
              {order.invoiceStatus !== 'CREATED' && (
                <button
                  onClick={() => handleSaveInvoice(true)}
                  disabled={savingInvoice}
                  className="flex w-full items-center justify-center gap-2 bg-emerald-700/20 border border-emerald-500/40 py-3 text-xs font-semibold uppercase tracking-widest text-emerald-400 hover:bg-emerald-700/30 disabled:opacity-50 transition-colors"
                >
                  {savingInvoice
                    ? <><Loader2 className="h-4 w-4 animate-spin" />Saving…</>
                    : <><CheckCircle className="h-4 w-4" />Mark Invoice Created in Acrotex</>
                  }
                </button>
              )}

              {/* Order summary for reference */}
              <div className="rounded border border-border p-3 space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted">Order Reference</p>
                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted">Order No.</span>
                    <span className="font-mono text-on-background">{order.orderNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Customer</span>
                    <span className="text-on-background">{order.customerName ?? '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Phone</span>
                    <span className="text-on-background">{order.customerPhone ?? '—'}</span>
                  </div>
                  <div className="flex justify-between border-t border-border pt-1 mt-1">
                    <span className="text-muted font-semibold">Total Amount</span>
                    <span className="font-bold text-on-background">₹{Number(order.total).toLocaleString('en-IN')}</span>
                  </div>
                </div>
                <div className="pt-1">
                  <p className="text-[10px] text-muted mb-1">Items</p>
                  {order.items.map((item, i) => (
                    <p key={i} className="text-xs text-muted">
                      {item.variant.product.name}
                      {item.variant.size ? ` (${item.variant.size})` : ''}
                      {' '}×{item.quantity}
                      {' — '}₹{(Number(item.unitPrice) * item.quantity).toLocaleString('en-IN')}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      ) : null}

      {/* ── Bottom action bar ─────────────────────────────────────────────── */}
      {order && !loading && (
        <div className="shrink-0 border-t border-border p-3 flex gap-2">
          {nextStatus[order.status] && (
            <button
              onClick={advance}
              disabled={updating}
              className="flex-1 bg-primary py-2.5 text-xs font-semibold uppercase tracking-widest text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {updating ? 'Updating…' : `Mark as ${nextStatus[order.status]}`}
            </button>
          )}
          {!['CANCELLED', 'REFUNDED', 'DELIVERED'].includes(order.status) && (
            <button
              onClick={cancel}
              disabled={updating}
              className="rounded border border-red-500/40 px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-500/10 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
          )}
          {order.status === 'DELIVERED' && (
            <p className="flex-1 text-center text-xs text-emerald-400 font-medium py-2">
              ✓ Order Complete
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main Orders Page ──────────────────────────────────────────────────────────

const STATUS_FILTERS = ['ALL', 'PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']

export default function OrdersPage() {
  const [orders,       setOrders]       = useState<OrderSummary[]>([])
  const [total,        setTotal]        = useState(0)
  const [page,         setPage]         = useState(1)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [loading,      setLoading]      = useState(true)
  const [selectedId,   setSelectedId]   = useState<string | null>(null)
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
        {/* ── Order list ──────────────────────────────────────────────────── */}
        <div className={cn('flex flex-col overflow-hidden transition-all', selectedId ? 'flex-1' : 'w-full')}>

          {/* Status filter tabs */}
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
                          <TableCell key={j}>
                            <div className="h-4 w-24 rounded bg-surface-elevated animate-pulse" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  : orders.map((o) => (
                      <TableRow
                        key={o.id}
                        onClick={() => setSelectedId(o.id)}
                        className={cn(
                          'cursor-pointer transition-colors hover:bg-surface-elevated',
                          selectedId === o.id && 'bg-surface-elevated ring-1 ring-inset ring-primary/30'
                        )}
                      >
                        <TableCell className="font-mono text-xs font-bold text-on-background">
                          {o.orderNumber}
                        </TableCell>
                        <TableCell className="text-sm">
                          {o.customerName ?? <span className="text-muted">Walk-in</span>}
                        </TableCell>
                        <TableCell>
                          <span className={cn('rounded px-2 py-0.5 text-xs font-medium', statusColor(o.status))}>
                            {o.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-sm font-semibold">
                          ₹{Number(o.total).toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-xs text-muted">
                          {new Date(o.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric', month: 'short', year: 'numeric',
                          })}
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

        {/* ── Detail drawer ────────────────────────────────────────────────── */}
        <AnimatePresence>
          {selectedId && (
            <motion.aside
              key={selectedId}
              initial={{ x: 60, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 60, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="w-[400px] shrink-0 border-l border-border bg-surface overflow-hidden flex flex-col"
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
