'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { inventoryApi } from '@/lib/api'
import { Barcode, Trash2, Undo2, CheckCircle2, AlertTriangle, XCircle, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface VariantOption {
  id:           string
  sku:          string
  size:         string | null
  color:        string | null
  fabric:       string | null
  style:        string | null
  price:        number
  availableQty: number
}

interface ProductLookup {
  productId:   string
  productName: string
  variants:    VariantOption[]
}

interface ScanRecord {
  id:          string
  productName: string
  sku:         string
  size:        string | null
  color:       string | null
  newQuantity: number
  timestamp:   Date
  status:      'ok' | 'low-stock' | 'error'
  error?:      string
}

// ─── Sound feedback ───────────────────────────────────────────────────────────

function playBeep(type: 'success' | 'error' | 'scan') {
  try {
    const ctx  = new (window.AudioContext || (window as any).webkitAudioContext)()
    const osc  = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.value  = type === 'success' ? 880 : type === 'scan' ? 660 : 300
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15)
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.15)
  } catch { /* audio not available */ }
}

// ─── Variant picker card ──────────────────────────────────────────────────────

function VariantCard({
  variant,
  isProcessing,
  onClick,
}: {
  variant:      VariantOption
  isProcessing: boolean
  onClick:      () => void
}) {
  const attrs = [variant.size, variant.color, variant.fabric].filter(Boolean).join(' · ')
  const outOfStock = variant.availableQty <= 0
  const lowStock   = variant.availableQty > 0 && variant.availableQty <= 5

  return (
    <button
      onClick={onClick}
      disabled={outOfStock || isProcessing}
      className={cn(
        'w-full text-left rounded-xl border px-4 py-4 transition-all',
        'flex items-center justify-between gap-3',
        outOfStock
          ? 'border-border bg-surface/40 opacity-40 cursor-not-allowed'
          : 'border-border bg-surface hover:border-primary hover:bg-primary/5 active:scale-[0.98] cursor-pointer',
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="font-medium text-on-background text-sm">{attrs || variant.sku}</p>
        <p className="mt-0.5 font-mono text-xs text-muted">{variant.sku}</p>
        <p className={cn(
          'mt-1 text-xs font-semibold',
          outOfStock ? 'text-red-400' : lowStock ? 'text-yellow-400' : 'text-green-400'
        )}>
          {outOfStock ? 'Out of stock' : `${variant.availableQty} in stock${lowStock ? ' — Low' : ''}`}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-sm font-semibold text-on-background">
          ₹{Number(variant.price).toLocaleString('en-IN')}
        </span>
        {!outOfStock && <ChevronRight className="h-4 w-4 text-muted" />}
      </div>
    </button>
  )
}

// ─── Session row ──────────────────────────────────────────────────────────────

function SessionRow({ item, isLatest }: { item: ScanRecord; isLatest: boolean }) {
  const time = item.timestamp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  if (item.status === 'error') {
    return (
      <div className={cn(
        'flex items-start gap-3 rounded-lg border px-4 py-3',
        isLatest ? 'border-red-500/40 bg-red-500/10' : 'border-border bg-surface'
      )}>
        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-red-400">{item.error}</p>
        </div>
        <span className="shrink-0 text-[10px] text-muted">{time}</span>
      </div>
    )
  }
  return (
    <div className={cn(
      'flex items-start gap-3 rounded-lg border px-4 py-3',
      isLatest && item.status === 'ok'        ? 'border-green-500/40 bg-green-500/8'  : '',
      isLatest && item.status === 'low-stock' ? 'border-yellow-500/40 bg-yellow-500/8' : '',
      !isLatest ? 'border-border bg-surface' : ''
    )}>
      {item.status === 'low-stock'
        ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-400" />
        : <CheckCircle2  className="mt-0.5 h-4 w-4 shrink-0 text-green-400" />}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-on-background truncate">{item.productName}</p>
        <p className="mt-0.5 text-xs text-muted">
          {[item.size, item.color].filter(Boolean).join(' / ') || item.sku}
          {' · '}
          <span className={item.newQuantity <= 3 ? 'text-yellow-400 font-medium' : 'text-muted'}>
            {item.newQuantity} left
          </span>
          {item.status === 'low-stock' && <span className="ml-1.5 text-yellow-400 font-medium">⚠ Low stock</span>}
        </p>
      </div>
      <span className="shrink-0 text-[10px] text-muted">{time}</span>
    </div>
  )
}

// ─── POS Scanner page ─────────────────────────────────────────────────────────

type Mode = 'scan' | 'pick' | 'processing'

export default function PosScannerPage() {
  const inputRef       = useRef<HTMLInputElement>(null)
  const debounceRef    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastScanRef    = useRef<{ barcode: string; time: number }>({ barcode: '', time: 0 })

  const [mode,       setMode]       = useState<Mode>('scan')
  const [scanInput,  setScanInput]  = useState('')
  const [lookup,     setLookup]     = useState<ProductLookup | null>(null)
  const [lookupErr,  setLookupErr]  = useState<string | null>(null)
  const [processing, setProcessing] = useState<string | null>(null) // variantId being processed
  const [session,    setSession]    = useState<ScanRecord[]>([])
  const [totalSold,  setTotalSold]  = useState(0)

  // Keep input focused in scan mode
  useEffect(() => {
    if (mode === 'scan') setTimeout(() => inputRef.current?.focus(), 50)
  }, [mode])

  const cancelPick = useCallback(() => {
    setLookup(null)
    setLookupErr(null)
    setMode('scan')
    setScanInput('')
  }, [])

  // Step 1 — barcode scan → look up product + all variants
  const handleBarcode = useCallback(async (barcode: string) => {
    const trimmed = barcode.trim()
    if (!trimmed) return

    // Deduplicate within 800ms
    const now = Date.now()
    if (trimmed === lastScanRef.current.barcode && now - lastScanRef.current.time < 800) return
    lastScanRef.current = { barcode: trimmed, time: now }

    setScanInput('')
    setLookupErr(null)
    setMode('processing')
    playBeep('scan')

    try {
      const result = await inventoryApi.getByBarcode(trimmed)
      setLookup(result)
      setMode('pick')
    } catch (err: any) {
      playBeep('error')
      setLookupErr(err.message ?? 'Barcode not found')
      setMode('scan')
      const scanId = `err-${now}`
      setSession(prev => [{
        id:          scanId,
        productName: '',
        sku:         trimmed,
        size:        null,
        color:       null,
        newQuantity: 0,
        timestamp:   new Date(),
        status:      'error' as ScanRecord['status'],
        error:       err.message ?? 'Barcode not found',
      }, ...prev].slice(0, 50))
    }
  }, [])

  // Step 2 — staff picks a variant → deduct
  const handleVariantSelect = useCallback(async (variant: VariantOption) => {
    if (!lookup) return
    setProcessing(variant.id)

    const now = Date.now()
    const scanId = `${variant.id}-${now}`

    try {
      const result = await inventoryApi.reduce(variant.id, 1)
      const isLow  = result.newQuantity <= 5
      playBeep('success')

      setSession(prev => [{
        id:          scanId,
        productName: lookup.productName,
        sku:         result.sku,
        size:        result.size,
        color:       result.color,
        newQuantity: result.newQuantity,
        timestamp:   new Date(),
        status:      (isLow ? 'low-stock' : 'ok') as ScanRecord['status'],
      }, ...prev].slice(0, 50))

      setTotalSold(n => n + 1)
      setLookup(null)
      setMode('scan')
    } catch (err: any) {
      playBeep('error')
      setSession(prev => [{
        id:          scanId,
        productName: lookup.productName,
        sku:         variant.sku,
        size:        variant.size,
        color:       variant.color,
        newQuantity: 0,
        timestamp:   new Date(),
        status:      'error' as ScanRecord['status'],
        error:       err.message ?? 'Sale failed',
      }, ...prev].slice(0, 50))
    } finally {
      setProcessing(null)
    }
  }, [lookup])

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (debounceRef.current) clearTimeout(debounceRef.current)
      handleBarcode(scanInput)
    }
    if (e.key === 'Escape') cancelPick()
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setScanInput(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (val.length >= 4) {
      debounceRef.current = setTimeout(() => handleBarcode(val), 400)
    }
  }

  const successCount = session.filter(s => s.status !== 'error').length
  const errorCount   = session.filter(s => s.status === 'error').length

  return (
    <div className="flex h-full flex-col p-4 md:p-8 max-w-2xl mx-auto">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-on-background">POS Scanner</h1>
        <p className="mt-1 text-sm text-muted">Scan product barcode → select variant sold → stock deducts</p>
      </div>

      {/* ── SCAN MODE ── */}
      {mode !== 'pick' && (
        <div className={cn(
          'relative rounded-xl border-2 transition-all duration-200',
          mode === 'processing' ? 'border-primary bg-primary/5' : 'border-border bg-surface',
        )}>
          <div className="flex items-center gap-3 px-4 py-4">
            <Barcode className={cn('h-6 w-6 shrink-0 transition-colors', mode === 'processing' ? 'text-primary-light' : 'text-muted')} />
            <input
              ref={inputRef}
              value={scanInput}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onBlur={() => { if (mode === 'scan') setTimeout(() => inputRef.current?.focus(), 100) }}
              placeholder={mode === 'processing' ? 'Looking up product…' : 'Scan barcode or type and press Enter…'}
              disabled={mode === 'processing'}
              className="flex-1 bg-transparent text-base text-on-background placeholder:text-muted outline-none disabled:opacity-50"
              autoComplete="off"
              spellCheck={false}
            />
            {mode === 'processing' && (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent shrink-0" />
            )}
          </div>
        </div>
      )}

      {/* Scan error */}
      {lookupErr && mode === 'scan' && (
        <p className="mt-2 text-center text-sm text-red-400">{lookupErr}</p>
      )}

      {mode === 'scan' && !lookupErr && (
        <p className="mt-2 text-center text-xs text-muted">Input is always active — just point your scanner and scan</p>
      )}

      {/* ── PICK MODE — variant selector ── */}
      {mode === 'pick' && lookup && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 overflow-hidden">
          {/* Product header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted font-medium mb-0.5">Select Variant Sold</p>
              <p className="text-base font-semibold text-on-background">{lookup.productName}</p>
              <p className="text-xs text-muted mt-0.5">{lookup.variants.length} variant{lookup.variants.length !== 1 ? 's' : ''}</p>
            </div>
            <button
              onClick={cancelPick}
              className="rounded-md border border-border px-3 py-1.5 text-xs text-muted hover:text-on-background hover:border-on-background transition-colors"
            >
              Cancel
            </button>
          </div>

          {/* Variant list */}
          <div className="p-4 space-y-2 max-h-[50vh] overflow-y-auto">
            {lookup.variants.map(v => (
              <VariantCard
                key={v.id}
                variant={v}
                isProcessing={processing === v.id}
                onClick={() => handleVariantSelect(v)}
              />
            ))}
          </div>

          {processing && (
            <div className="px-5 py-3 border-t border-border flex items-center gap-2 text-sm text-muted">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Recording sale…
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      {session.length > 0 && (
        <div className="mt-5 grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-border bg-surface px-4 py-3 text-center">
            <p className="text-2xl font-bold text-on-background">{totalSold}</p>
            <p className="mt-0.5 text-xs text-muted">Total sold</p>
          </div>
          <div className="rounded-lg border border-green-500/20 bg-green-500/8 px-4 py-3 text-center">
            <p className="text-2xl font-bold text-green-400">{successCount}</p>
            <p className="mt-0.5 text-xs text-muted">Successful</p>
          </div>
          <div className={cn(
            'rounded-lg border px-4 py-3 text-center',
            errorCount > 0 ? 'border-red-500/20 bg-red-500/8' : 'border-border bg-surface'
          )}>
            <p className={cn('text-2xl font-bold', errorCount > 0 ? 'text-red-400' : 'text-muted')}>{errorCount}</p>
            <p className="mt-0.5 text-xs text-muted">Errors</p>
          </div>
        </div>
      )}

      {/* Session list */}
      {session.length > 0 && (
        <div className="mt-5 flex-1 overflow-hidden flex flex-col">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-widest text-muted">This Session</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const first = session[0]
                  if (first) {
                    setSession(prev => prev.slice(1))
                    if (first.status !== 'error') setTotalSold(n => Math.max(0, n - 1))
                  }
                }}
                className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs text-muted hover:text-on-background hover:border-on-background transition-colors"
              >
                <Undo2 className="h-3 w-3" /> Undo last
              </button>
              <button
                onClick={() => { setSession([]); setTotalSold(0) }}
                className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs text-muted hover:text-destructive hover:border-destructive transition-colors"
              >
                <Trash2 className="h-3 w-3" /> Clear
              </button>
            </div>
          </div>
          <div className="space-y-2 overflow-y-auto flex-1 pr-1">
            {session.map((item, i) => (
              <SessionRow key={item.id} item={item} isLatest={i === 0} />
            ))}
          </div>
        </div>
      )}

      {session.length === 0 && mode === 'scan' && (
        <div className="mt-10 flex flex-col items-center justify-center gap-3 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-border">
            <Barcode className="h-7 w-7 text-muted" />
          </div>
          <p className="text-sm text-muted">No scans yet this session</p>
          <p className="text-xs text-muted/60">Scan a product barcode to start</p>
        </div>
      )}
    </div>
  )
}
