'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Package, Search, Phone, Mail, ChevronRight,
  ExternalLink, Truck, Clock, CheckCircle, XCircle,
  MessageCircle, ArrowRight, MapPin, Pencil, Trash2, Save,
} from 'lucide-react'
import { ordersApi, customerAuthApi } from '@/lib/api'
import { useSavedAddress, type SavedAddress } from '@/hooks/useSavedAddress'
import { useCustomerAuthStore } from '@/stores/customerAuthStore'
import { LogIn, LogOut } from 'lucide-react'

// ─── Types ─────────────────────────────────────────────────────────────────────

type Order = Awaited<ReturnType<typeof ordersApi.lookup>>['orders'][number]
type CustomerOrder = Awaited<ReturnType<typeof customerAuthApi.orders>>['orders'][number]

const STATUS_COLOR: Record<string, string> = {
  PENDING:    'bg-amber-500/15 text-amber-400',
  CONFIRMED:  'bg-blue-500/15 text-blue-400',
  PROCESSING: 'bg-violet-500/15 text-violet-400',
  SHIPPED:    'bg-cyan-500/15 text-cyan-400',
  DELIVERED:  'bg-emerald-500/15 text-emerald-400',
  CANCELLED:  'bg-red-500/15 text-red-400',
}

const SHIP_LABEL: Record<string, string> = {
  NOT_CREATED:      'Awaiting dispatch',
  CREATED:          'Shipment booked',
  SHIPPED:          'Picked up',
  IN_TRANSIT:       'In transit',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED:        'Delivered',
  FAILED:           'Delivery issue',
}

function statusIcon(s: string) {
  if (s === 'DELIVERED') return <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
  if (['SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(s)) return <Truck className="h-3.5 w-3.5 text-cyan-400" />
  if (s === 'CANCELLED') return <XCircle className="h-3.5 w-3.5 text-red-400" />
  return <Clock className="h-3.5 w-3.5 text-amber-400" />
}

const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '919XXXXXXXXX'
const WHATSAPP_MSG    = 'Hi Vami Clubwear! I need help with my order.'

// ─── Order row (expandable) ────────────────────────────────────────────────────

function OrderRow({ order }: { order: Order | CustomerOrder }) {
  const [open, setOpen] = useState(false)
  const items = order.items.reduce((s, i) => s + i.quantity, 0)

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-surface-elevated transition-colors"
      >
        <div className="flex-1 min-w-0">
          <p className="font-mono text-xs font-bold text-on-background">{order.orderNumber}</p>
          <p className="text-[11px] text-muted mt-0.5">
            {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            {' · '}{items} item{items !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${STATUS_COLOR[order.status] ?? 'bg-surface-elevated text-muted'}`}>
            {order.status}
          </span>
          <p className="text-xs font-semibold text-on-background">₹{Number(order.total).toLocaleString('en-IN')}</p>
        </div>
        <ChevronRight className={`h-3.5 w-3.5 text-muted transition-transform shrink-0 ${open ? 'rotate-90' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
            transition={{ duration: 0.2 }} className="overflow-hidden"
          >
            <div className="border-t border-border px-4 py-4 space-y-3 bg-surface-elevated">
              <div className="space-y-1.5">
                {order.items.map((item, i) => (
                  <div key={i} className="flex justify-between gap-2 text-xs">
                    <span className="text-on-background truncate">
                      {item.variant.product.name}
                      {item.variant.size ? ` · ${item.variant.size}` : ''}
                    </span>
                    <span className="text-muted shrink-0">×{item.quantity}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-1.5 text-xs text-muted">
                {statusIcon(order.shippingStatus)}
                {SHIP_LABEL[order.shippingStatus] ?? order.shippingStatus}
              </div>

              {order.awbNumber && (
                <div className="flex items-center justify-between rounded border border-cyan-500/20 bg-cyan-500/5 px-3 py-2">
                  <span className="font-mono text-xs text-cyan-400">{order.awbNumber}</span>
                  {order.trackingUrl && (
                    <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[10px] text-cyan-400 hover:underline">
                      Track <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  )}
                </div>
              )}

              <Link
                href={`/track?order=${encodeURIComponent(order.orderNumber)}`}
                className="flex items-center justify-between text-[11px] text-muted hover:text-on-background transition-colors"
              >
                Full order details <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Saved address section ─────────────────────────────────────────────────────

function AddressSection() {
  const { saved, loaded, save, clear } = useSavedAddress()
  const [editing, setEditing] = useState(false)
  const [form, setForm]       = useState<SavedAddress>({
    customerName: '', customerPhone: '', address: '', city: '', state: '', pincode: '',
  })
  const [errors, setErrors] = useState<Partial<SavedAddress>>({})

  function startEdit() {
    setForm(saved ?? { customerName: '', customerPhone: '', address: '', city: '', state: '', pincode: '' })
    setErrors({})
    setEditing(true)
  }

  function validate() {
    const e: Partial<SavedAddress> = {}
    if (!form.customerName.trim())  e.customerName  = 'Required'
    if (!form.customerPhone.trim()) e.customerPhone = 'Required'
    if (!form.address.trim())       e.address       = 'Required'
    if (!form.city.trim())          e.city          = 'Required'
    if (!form.pincode.trim())       e.pincode       = 'Required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSave() {
    if (!validate()) return
    save(form)
    setEditing(false)
  }

  const inp = (key: keyof SavedAddress) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(p => ({ ...p, [key]: e.target.value })),
  })

  const inputCls = (err?: string) =>
    `w-full border ${err ? 'border-red-500' : 'border-border'} bg-transparent px-3 py-2 text-sm text-on-background placeholder:text-muted outline-none focus:border-on-background transition-colors rounded`

  if (!loaded) return null

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary-light" />
          <h2 className="text-base font-semibold text-on-background">Saved Address</h2>
        </div>
        {saved && !editing && (
          <div className="flex items-center gap-1">
            <button
              onClick={startEdit}
              className="flex items-center gap-1 rounded px-2 py-1 text-xs text-muted hover:text-on-background hover:bg-surface-elevated transition-colors"
            >
              <Pencil className="h-3 w-3" /> Edit
            </button>
            <button
              onClick={clear}
              className="flex items-center gap-1 rounded px-2 py-1 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>

      {saved && !editing && (
        <div className="rounded-lg border border-border bg-surface-elevated p-4 space-y-1 text-sm">
          <p className="font-medium text-on-background">{saved.customerName}</p>
          <p className="text-muted text-xs">{saved.customerPhone}</p>
          <p className="text-muted text-xs pt-2 border-t border-border">
            {[saved.address, saved.city, saved.state, saved.pincode].filter(Boolean).join(', ')}
          </p>
        </div>
      )}

      {(!saved || editing) && (
        <div className="space-y-3">
          {!saved && (
            <p className="text-xs text-muted">Save your address here for one-tap checkout every time.</p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <input {...inp('customerName')} placeholder="Full Name *" className={inputCls(errors.customerName)} />
              {errors.customerName && <p className="mt-0.5 text-[10px] text-red-400">{errors.customerName}</p>}
            </div>
            <div className="col-span-2">
              <input {...inp('customerPhone')} type="tel" placeholder="Phone Number *" className={inputCls(errors.customerPhone)} />
              {errors.customerPhone && <p className="mt-0.5 text-[10px] text-red-400">{errors.customerPhone}</p>}
            </div>
            <div className="col-span-2">
              <input {...inp('address')} placeholder="House / Street / Area *" className={inputCls(errors.address)} />
              {errors.address && <p className="mt-0.5 text-[10px] text-red-400">{errors.address}</p>}
            </div>
            <div>
              <input {...inp('city')} placeholder="City *" className={inputCls(errors.city)} />
              {errors.city && <p className="mt-0.5 text-[10px] text-red-400">{errors.city}</p>}
            </div>
            <div>
              <input {...inp('pincode')} placeholder="Pincode *" className={inputCls(errors.pincode)} />
              {errors.pincode && <p className="mt-0.5 text-[10px] text-red-400">{errors.pincode}</p>}
            </div>
            <div className="col-span-2">
              <input {...inp('state')} placeholder="State (e.g. Kerala)" className={inputCls()} />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSave}
              className="flex flex-1 items-center justify-center gap-1.5 bg-primary py-2.5 text-xs font-semibold uppercase tracking-widest text-white hover:opacity-90 transition-opacity rounded"
            >
              <Save className="h-3.5 w-3.5" />
              {saved ? 'Update Address' : 'Save Address'}
            </button>
            {editing && (
              <button
                onClick={() => setEditing(false)}
                className="px-4 py-2.5 text-xs text-muted border border-border hover:text-on-background transition-colors rounded"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Track by order number ─────────────────────────────────────────────────────

function TrackSection() {
  const [orderNum, setOrderNum] = useState('')

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Truck className="h-4 w-4 text-primary-light" />
        <h2 className="text-base font-semibold text-on-background">Track an Order</h2>
      </div>
      <p className="text-xs text-muted mb-3">Enter your order number (e.g. VCW-260407-0001)</p>
      <div className="flex gap-2">
        <input
          type="text"
          value={orderNum}
          onChange={e => setOrderNum(e.target.value)}
          placeholder="VCW-XXXXXX-XXXX"
          className="flex-1 border border-border bg-transparent px-3 py-2.5 text-sm text-on-background placeholder:text-muted outline-none focus:border-on-background transition-colors rounded"
        />
        <Link
          href={orderNum.trim() ? `/track?order=${encodeURIComponent(orderNum.trim())}` : '/track'}
          className="flex items-center justify-center gap-1.5 bg-surface-elevated border border-border px-4 py-2 text-xs font-semibold text-muted hover:text-on-background hover:border-on-background transition-colors rounded"
        >
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  )
}

// ─── Profile page (Google-authenticated) ──────────────────────────────────────

export default function ProfilePage() {
  const user        = useCustomerAuthStore((s) => s.user)
  const token       = useCustomerAuthStore((s) => s.token)
  const openPrompt  = useCustomerAuthStore((s) => s.openPrompt)
  const logout      = useCustomerAuthStore((s) => s.logout)
  const authed      = !!user && !!token

  const [orders,   setOrders]   = useState<CustomerOrder[] | null>(null)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  // Auto-fetch orders once authenticated
  useEffect(() => {
    if (!authed) return
    let cancelled = false
    setLoading(true)
    setError(null)
    customerAuthApi.orders()
      .then((r) => { if (!cancelled) setOrders(r.orders) })
      .catch((err) => {
        if (cancelled) return
        if (err?.status === 401 || err?.status === 403) {
          logout()
        } else {
          setError('Could not load your orders. Please try again.')
        }
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [authed, logout])

  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MSG)}`

  // ── Signed-out state ──────────────────────────────────────────────────────
  if (!authed) {
    return (
      <div className="pt-24 min-h-screen">
        <div className="border-b border-border">
          <div className="mx-auto w-full px-4 sm:px-6 md:px-8 lg:px-10">
            <div className="py-10">
              <p className="mb-1 t-micro">Account</p>
              <h1 className="t-h1">My Profile</h1>
            </div>
          </div>
        </div>
        <div className="mx-auto flex max-w-md flex-col items-center px-6 py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-border">
            <LogIn className="h-5 w-5 text-primary-light" />
          </div>
          <h2 className="mt-6 font-display text-xl text-on-background">Sign in to view your profile</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Your orders, saved address, and cart are tied to your Google account. Sign in to continue.
          </p>
          <button
            onClick={() => openPrompt('Sign in to view your orders and profile.')}
            className="mt-7 inline-flex items-center gap-2 rounded-full border border-on-background bg-on-background px-7 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-white transition-opacity hover:opacity-90"
          >
            <LogIn className="h-3.5 w-3.5" /> Sign in with Google
          </button>
        </div>
      </div>
    )
  }

  // ── Authenticated profile ─────────────────────────────────────────────────
  return (
    <div className="pt-24 min-h-screen">
      <div className="border-b border-border">
        <div className="mx-auto w-full px-4 sm:px-6 md:px-8 lg:px-10">
          <div className="py-10 flex items-start gap-4">
            {user.picture && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.picture} alt={user.name}
                className="h-12 w-12 rounded-full border border-border object-cover" />
            )}
            <div className="flex-1 min-w-0">
              <p className="mb-1 t-micro">Account</p>
              <h1 className="t-h1 truncate">{user.name}</h1>
              <p className="mt-1 text-xs text-muted truncate">{user.email}</p>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted hover:text-on-background transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 md:px-8 lg:px-10 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">

          {/* ── Left: My Orders ── */}
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-primary-light" />
              <h2 className="text-base font-semibold text-on-background">My Orders</h2>
            </div>

            {loading && (
              <p className="text-xs text-muted">Loading your orders…</p>
            )}

            {error && <p className="text-xs text-red-400">{error}</p>}

            {!loading && orders !== null && (
              <div className="space-y-2">
                {orders.length === 0 ? (
                  <div className="rounded-lg border border-border p-6 text-center">
                    <Package className="h-8 w-8 text-muted opacity-20 mx-auto mb-2" />
                    <p className="text-xs text-muted">
                      No orders yet — your purchases will appear here.
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-[11px] text-muted">{orders.length} order{orders.length !== 1 ? 's' : ''}</p>
                    {orders.map(o => <OrderRow key={o.orderNumber} order={o as CustomerOrder} />)}
                  </>
                )}
              </div>
            )}
          </div>

          {/* ── Right: Address + Track + Help ── */}
          <div className="space-y-10">
            <AddressSection />

            <div className="border-t border-border pt-8">
              <TrackSection />
            </div>

            <div className="border-t border-border pt-8">
              <div className="flex items-center gap-2 mb-3">
                <MessageCircle className="h-4 w-4 text-primary-light" />
                <h2 className="text-base font-semibold text-on-background">Need Help?</h2>
              </div>
              <p className="text-xs text-muted mb-4">
                Chat with us on WhatsApp for order support, sizing queries, or anything else.
              </p>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2.5 w-full rounded-lg bg-[#25D366] py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                <svg viewBox="0 0 24 24" fill="white" className="h-4 w-4 shrink-0">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Chat on WhatsApp
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
