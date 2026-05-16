'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Search, Loader2, Plus, Trash2, Truck, Store, AlertTriangle } from 'lucide-react'
import { inventoryApi, ordersApi, ApiError } from '@/lib/api'
import { toast } from '@/stores/toastStore'

type FulfillmentType = 'DELIVERY' | 'PICKUP'

type VariantHit = {
  id: string
  quantity: number
  reserved: number
  variant: {
    id: string
    sku: string
    size: string | null
    color: string | null
    price: number
    product: { name: string }
  }
  location: { id: string; name: string }
}

type Line = {
  variantId:   string
  productName: string
  sku:         string
  size:        string | null
  color:       string | null
  unitPrice:   number
  available:   number
  quantity:    number
}

interface Props {
  open: boolean
  onClose: () => void
  onCreated: (orderNumber: string) => void
}

export function ManualOrderModal({ open, onClose, onCreated }: Props) {
  // ── Form state ───────────────────────────────────────────────────────────
  const [customerName,  setCustomerName]  = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [fulfillment,   setFulfillment]   = useState<FulfillmentType>('DELIVERY')
  const [address,       setAddress]       = useState('')
  const [city,          setCity]          = useState('')
  const [stateName,     setStateName]     = useState('')
  const [pincode,       setPincode]       = useState('')
  const [paymentRef,    setPaymentRef]    = useState('')
  const [notes,         setNotes]         = useState('')
  const [lines,         setLines]         = useState<Line[]>([])
  const [submitting,    setSubmitting]    = useState(false)

  // ── Product search state ─────────────────────────────────────────────────
  const [query,    setQuery]    = useState('')
  const [hits,     setHits]     = useState<VariantHit[]>([])
  const [searching, setSearching] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Reset on close so reopening starts fresh.
  useEffect(() => {
    if (open) return
    setCustomerName('');  setCustomerEmail(''); setCustomerPhone('')
    setFulfillment('DELIVERY')
    setAddress(''); setCity(''); setStateName(''); setPincode('')
    setPaymentRef(''); setNotes('')
    setLines([])
    setQuery(''); setHits([])
  }, [open])

  // Debounced inventory search — same endpoint the Inventory page uses, so
  // results carry live stock counts and the unit price for the variant.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) { setHits([]); return }
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const r = await inventoryApi.search(query.trim())
        setHits(r as VariantHit[])
      } catch (err: any) {
        toast.error(err?.message ?? 'Search failed')
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  function addLine(h: VariantHit) {
    setLines((prev) => {
      // Bump quantity if the variant is already in the cart instead of duplicating.
      const existing = prev.find((l) => l.variantId === h.variant.id)
      if (existing) {
        return prev.map((l) =>
          l.variantId === h.variant.id ? { ...l, quantity: l.quantity + 1 } : l
        )
      }
      return [...prev, {
        variantId:   h.variant.id,
        productName: h.variant.product.name,
        sku:         h.variant.sku,
        size:        h.variant.size,
        color:       h.variant.color,
        unitPrice:   Number(h.variant.price),
        available:   Math.max(0, h.quantity - h.reserved),
        quantity:    1,
      }]
    })
    setQuery('')
    setHits([])
  }

  function setLineQty(variantId: string, qty: number) {
    setLines((prev) => prev.map((l) =>
      l.variantId === variantId ? { ...l, quantity: Math.max(1, Math.min(qty, l.available || qty)) } : l
    ))
  }

  function removeLine(variantId: string) {
    setLines((prev) => prev.filter((l) => l.variantId !== variantId))
  }

  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0)

  async function handleSubmit() {
    if (lines.length === 0) {
      toast.error('Add at least one item')
      return
    }
    if (!paymentRef.trim()) {
      toast.error('Payment reference is required (Razorpay payment id, UPI ref, etc.)')
      return
    }
    if (!customerName.trim() && !customerPhone.trim()) {
      toast.error('Customer name or phone is required')
      return
    }
    if (fulfillment === 'DELIVERY') {
      if (!address.trim() || !city.trim() || !pincode.trim()) {
        toast.error('Delivery address, city, and pincode are required')
        return
      }
    }

    setSubmitting(true)
    try {
      const created = await ordersApi.createManual({
        customerName:    customerName.trim() || undefined,
        customerEmail:   customerEmail.trim() || undefined,
        customerPhone:   customerPhone.trim() || undefined,
        fulfillmentType: fulfillment,
        shippingAddress: fulfillment === 'DELIVERY' ? address.trim() : undefined,
        shippingCity:    fulfillment === 'DELIVERY' ? city.trim()    : undefined,
        shippingState:   fulfillment === 'DELIVERY' ? stateName.trim() || undefined : undefined,
        shippingPincode: fulfillment === 'DELIVERY' ? pincode.trim() : undefined,
        notes:           notes.trim() || undefined,
        paymentRef:      paymentRef.trim(),
        items: lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
      })
      toast.success(`Order ${created.orderNumber} created`)
      onCreated(created.orderNumber)
      onClose()
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : (err?.message ?? 'Failed to create order')
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-8 pointer-events-none"
          >
            <div className="pointer-events-auto w-full max-w-2xl bg-surface border border-border rounded-lg shadow-2xl">
              <div className="flex items-center justify-between border-b border-border px-5 py-4 sticky top-0 bg-surface z-10">
                <div>
                  <h2 className="text-base font-bold text-on-background">Create Manual Order</h2>
                  <p className="mt-0.5 text-xs text-muted">Records a paid order outside the storefront — use for orphan Razorpay payments or in-person sales.</p>
                </div>
                <button onClick={onClose} className="rounded p-1.5 text-muted hover:bg-surface-elevated hover:text-on-background transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-5 px-5 py-4">

                {/* Notice */}
                <div className="flex gap-2 border border-amber-500/30 bg-amber-500/5 p-3 rounded">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-400" />
                  <div className="text-[11px] text-amber-200 leading-relaxed">
                    The order lands as <strong>PAID</strong> and inventory is deducted immediately.
                    Customer confirmation email is sent if an address is provided.
                    Only use this when the customer has already paid by another channel.
                  </div>
                </div>

                {/* Customer */}
                <section className="space-y-3">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted">Customer</h3>
                  <input
                    value={customerName} onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Full name"
                    className="w-full bg-transparent border border-border px-3 py-2 text-sm text-on-background outline-none focus:border-on-background"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="Phone *"
                      className="bg-transparent border border-border px-3 py-2 text-sm text-on-background outline-none focus:border-on-background"
                    />
                    <input
                      value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)}
                      type="email" placeholder="Email (for confirmation)"
                      className="bg-transparent border border-border px-3 py-2 text-sm text-on-background outline-none focus:border-on-background"
                    />
                  </div>
                </section>

                {/* Fulfillment */}
                <section className="space-y-3">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted">Fulfillment</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { key: 'DELIVERY', icon: Truck, label: 'Home Delivery' },
                      { key: 'PICKUP',   icon: Store, label: 'Collect from Shop' },
                    ] as const).map(({ key, icon: Icon, label }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setFulfillment(key)}
                        className={`flex items-center gap-2 border p-3 text-left text-sm transition-colors ${
                          fulfillment === key
                            ? 'border-primary bg-primary/10 text-on-background'
                            : 'border-border text-muted hover:border-on-background/40'
                        }`}
                      >
                        <Icon className="h-4 w-4" />{label}
                      </button>
                    ))}
                  </div>

                  {fulfillment === 'DELIVERY' && (
                    <div className="space-y-2">
                      <input
                        value={address} onChange={(e) => setAddress(e.target.value)}
                        placeholder="House / Flat, Street, Area *"
                        className="w-full bg-transparent border border-border px-3 py-2 text-sm text-on-background outline-none focus:border-on-background"
                      />
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          value={city} onChange={(e) => setCity(e.target.value)}
                          placeholder="City *"
                          className="bg-transparent border border-border px-3 py-2 text-sm text-on-background outline-none focus:border-on-background"
                        />
                        <input
                          value={stateName} onChange={(e) => setStateName(e.target.value)}
                          placeholder="State"
                          className="bg-transparent border border-border px-3 py-2 text-sm text-on-background outline-none focus:border-on-background"
                        />
                        <input
                          value={pincode} onChange={(e) => setPincode(e.target.value)}
                          inputMode="numeric" maxLength={6}
                          placeholder="Pincode *"
                          className="bg-transparent border border-border px-3 py-2 text-sm text-on-background outline-none focus:border-on-background"
                        />
                      </div>
                    </div>
                  )}
                </section>

                {/* Items */}
                <section className="space-y-3">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted">Items</h3>

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted" />
                    <input
                      value={query} onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search products by name or SKU…"
                      className="w-full bg-transparent border border-border pl-9 pr-3 py-2 text-sm text-on-background outline-none focus:border-on-background"
                    />
                    {searching && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted" />
                    )}
                  </div>

                  {hits.length > 0 && (
                    <div className="border border-border rounded max-h-64 overflow-y-auto bg-surface-elevated">
                      {hits.map((h) => {
                        const available = Math.max(0, h.quantity - h.reserved)
                        const attrs = [h.variant.size, h.variant.color].filter(Boolean).join(' · ')
                        return (
                          <button
                            key={h.id}
                            type="button"
                            onClick={() => addLine(h)}
                            disabled={available <= 0}
                            className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left hover:bg-surface disabled:opacity-50 disabled:cursor-not-allowed transition-colors border-b border-border last:border-b-0"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-on-background truncate">{h.variant.product.name}</p>
                              <p className="text-[11px] text-muted truncate">
                                {h.variant.sku}{attrs ? ` · ${attrs}` : ''}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm font-medium text-on-background">₹{Number(h.variant.price).toLocaleString('en-IN')}</p>
                              <p className={`text-[11px] ${available > 0 ? 'text-muted' : 'text-red-400'}`}>
                                {available > 0 ? `${available} in stock` : 'Out of stock'}
                              </p>
                            </div>
                            <Plus className="h-3.5 w-3.5 text-muted shrink-0" />
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {lines.length === 0 ? (
                    <p className="text-xs text-muted py-2">No items added yet — search above and click to add.</p>
                  ) : (
                    <div className="border border-border rounded divide-y divide-border">
                      {lines.map((l) => {
                        const attrs = [l.size, l.color].filter(Boolean).join(' · ')
                        return (
                          <div key={l.variantId} className="flex items-center gap-3 px-3 py-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm text-on-background truncate">{l.productName}</p>
                              <p className="text-[11px] text-muted truncate">{l.sku}{attrs ? ` · ${attrs}` : ''}</p>
                            </div>
                            <input
                              type="number" min={1} max={l.available || undefined}
                              value={l.quantity}
                              onChange={(e) => setLineQty(l.variantId, Number(e.target.value) || 1)}
                              className="w-14 bg-transparent border border-border px-2 py-1 text-sm text-on-background text-center outline-none focus:border-on-background"
                            />
                            <p className="w-20 text-right text-sm text-on-background">
                              ₹{(l.unitPrice * l.quantity).toLocaleString('en-IN')}
                            </p>
                            <button
                              type="button"
                              onClick={() => removeLine(l.variantId)}
                              className="text-muted hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )
                      })}
                      <div className="flex justify-between px-3 py-2 bg-surface-elevated">
                        <span className="text-xs font-semibold uppercase tracking-widest text-muted">Subtotal</span>
                        <span className="text-sm font-bold text-on-background">₹{subtotal.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  )}
                </section>

                {/* Payment ref + notes */}
                <section className="space-y-3">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted">Payment Reference</h3>
                  <input
                    value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)}
                    placeholder="e.g. pay_Sq2EDiHTcA9hNW (Razorpay payment id) *"
                    className="w-full bg-transparent border border-border px-3 py-2 text-sm text-on-background outline-none focus:border-on-background font-mono"
                  />
                  <textarea
                    value={notes} onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    placeholder="Internal notes (optional)"
                    className="w-full bg-transparent border border-border px-3 py-2 text-sm text-on-background outline-none focus:border-on-background resize-none"
                  />
                </section>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3 sticky bottom-0 bg-surface">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  className="rounded border border-border px-4 py-2 text-xs font-medium text-muted hover:text-on-background hover:border-on-background disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting || lines.length === 0}
                  className="flex items-center gap-2 rounded bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  {submitting ? 'Creating…' : `Create Order · ₹${subtotal.toLocaleString('en-IN')}`}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
