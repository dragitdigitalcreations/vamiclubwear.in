'use client'

// Mobile-first POS scanner — STAFF role's only landing page.
// Same backend endpoints as the desktop /admin/pos-scanner page; the UI is
// reworked for one-handed phone use (large tap targets, full-bleed layout,
// no sidebar, prominent scan input always-focused).

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { inventoryApi, authApi } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { RBACGuard } from '@/components/admin/RBACGuard'
import { Barcode, CheckCircle2, AlertTriangle, XCircle, ChevronRight, LogOut, Undo2, Trash2 } from 'lucide-react'
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

// ─── Audio feedback ───────────────────────────────────────────────────────────
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
  } catch { /* audio unavailable */ }
}

type Mode = 'scan' | 'pick' | 'processing'

function StaffScanner() {
  const router        = useRouter()
  const { user, logout } = useAuthStore()
  const inputRef      = useRef<HTMLInputElement>(null)
  const debounceRef   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastScanRef   = useRef<{ barcode: string; time: number }>({ barcode: '', time: 0 })

  const [mode,       setMode]       = useState<Mode>('scan')
  const [scanInput,  setScanInput]  = useState('')
  const [lookup,     setLookup]     = useState<ProductLookup | null>(null)
  const [lookupErr,  setLookupErr]  = useState<string | null>(null)
  const [processing, setProcessing] = useState<string | null>(null)
  const [session,    setSession]    = useState<ScanRecord[]>([])
  const [totalSold,  setTotalSold]  = useState(0)

  // Keep the scan input focused whenever we're in scan mode so a hardware
  // barcode scanner (which acts as a keyboard) always lands keystrokes here.
  useEffect(() => {
    if (mode === 'scan') setTimeout(() => inputRef.current?.focus(), 50)
  }, [mode])

  const cancelPick = useCallback(() => {
    setLookup(null); setLookupErr(null); setMode('scan'); setScanInput('')
  }, [])

  const handleBarcode = useCallback(async (barcode: string) => {
    const trimmed = barcode.trim()
    if (!trimmed) return
    const now = Date.now()
    if (trimmed === lastScanRef.current.barcode && now - lastScanRef.current.time < 800) return
    lastScanRef.current = { barcode: trimmed, time: now }

    setScanInput(''); setLookupErr(null); setMode('processing'); playBeep('scan')

    try {
      const result = await inventoryApi.getByBarcode(trimmed)
      setLookup(result); setMode('pick')
    } catch (err: any) {
      playBeep('error')
      setLookupErr(err.message ?? 'Barcode not found')
      setMode('scan')
      setSession(prev => [{
        id:          `err-${now}`,
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

  const handleVariantSelect = useCallback(async (variant: VariantOption) => {
    if (!lookup) return
    setProcessing(variant.id)
    const now = Date.now()
    const scanId = `${variant.id}-${now}`
    try {
      const result = await inventoryApi.reduce(variant.id, 1) as any
      const isLow  = result.newQuantity <= 5
      playBeep('success')
      setSession(prev => [{
        id:          scanId,
        productName: lookup.productName + (result.archived ? ' — ARCHIVED (sold out)' : ''),
        sku:         result.sku,
        size:        result.size,
        color:       result.color,
        newQuantity: result.newQuantity,
        timestamp:   new Date(),
        status:      (isLow ? 'low-stock' : 'ok') as ScanRecord['status'],
      }, ...prev].slice(0, 50))
      setTotalSold(n => n + 1)
      setLookup(null); setMode('scan')
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
    } finally { setProcessing(null) }
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

  async function handleLogout() {
    try { await authApi.logout() } catch {}
    logout()
    router.replace('/admin/login')
  }

  const successCount = session.filter(s => s.status !== 'error').length
  const errorCount   = session.filter(s => s.status === 'error').length

  return (
    <div className="flex h-full min-h-screen flex-col bg-background">

      {/* Header — sticky, slim, identifies who is signed in */}
      <header className="sticky top-0 z-20 border-b border-border bg-surface px-4 py-3 flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted">Vami · Shop POS</p>
          <p className="text-sm font-semibold text-on-background truncate">
            {user?.name ?? user?.email ?? 'Staff'}
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[11px] font-medium text-muted hover:text-on-background hover:border-on-background transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" /> Sign out
        </button>
      </header>

      {/* Main content — comfy phone padding, generous tap targets */}
      <div className="flex-1 px-4 pt-5 pb-32">

        {/* Scan input */}
        {mode !== 'pick' && (
          <div className={cn(
            'rounded-2xl border-2 transition-all',
            mode === 'processing' ? 'border-primary bg-primary/5' : 'border-border bg-surface',
          )}>
            <div className="flex items-center gap-3 px-4 py-5">
              <Barcode className={cn(
                'h-7 w-7 shrink-0',
                mode === 'processing' ? 'text-primary-light' : 'text-muted'
              )} />
              <input
                ref={inputRef}
                value={scanInput}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onBlur={() => { if (mode === 'scan') setTimeout(() => inputRef.current?.focus(), 100) }}
                placeholder={mode === 'processing' ? 'Looking up product…' : 'Scan or type barcode'}
                disabled={mode === 'processing'}
                className="flex-1 bg-transparent text-base text-on-background placeholder:text-muted outline-none disabled:opacity-50"
                autoComplete="off"
                spellCheck={false}
                inputMode="text"
                autoFocus
              />
              {mode === 'processing' && (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent shrink-0" />
              )}
            </div>
          </div>
        )}

        {lookupErr && mode === 'scan' && (
          <p className="mt-3 text-center text-sm text-red-400">{lookupErr}</p>
        )}
        {mode === 'scan' && !lookupErr && (
          <p className="mt-3 text-center text-xs text-muted">
            Scanner stays focused — point and scan, the sale deducts after you tap the variant.
          </p>
        )}

        {/* Pick mode — large, thumb-sized variant cards */}
        {mode === 'pick' && lookup && (
          <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-4 border-b border-border">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted font-medium">Pick variant sold</p>
                <p className="text-base font-semibold text-on-background truncate">{lookup.productName}</p>
                <p className="text-[11px] text-muted mt-0.5">
                  {lookup.variants.length} variant{lookup.variants.length !== 1 ? 's' : ''}
                </p>
              </div>
              <button
                onClick={cancelPick}
                className="rounded-full border border-border px-3 py-1.5 text-[11px] text-muted hover:text-on-background hover:border-on-background transition-colors shrink-0"
              >
                Cancel
              </button>
            </div>

            <div className="p-3 space-y-2 max-h-[60vh] overflow-y-auto">
              {lookup.variants.map(v => {
                const attrs = [v.size, v.color, v.fabric].filter(Boolean).join(' · ')
                const out   = v.availableQty <= 0
                const low   = v.availableQty > 0 && v.availableQty <= 5
                return (
                  <button
                    key={v.id}
                    onClick={() => handleVariantSelect(v)}
                    disabled={out || processing === v.id}
                    className={cn(
                      'w-full text-left rounded-xl border px-4 py-4 flex items-center justify-between gap-3 transition-all',
                      out
                        ? 'border-border bg-surface/40 opacity-40 cursor-not-allowed'
                        : 'border-border bg-surface hover:border-primary active:scale-[0.98]',
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-on-background text-base">{attrs || v.sku}</p>
                      <p className="mt-0.5 font-mono text-[11px] text-muted truncate">{v.sku}</p>
                      <p className={cn(
                        'mt-1 text-xs font-semibold',
                        out ? 'text-red-400' : low ? 'text-yellow-400' : 'text-green-400'
                      )}>
                        {out ? 'Out of stock' : `${v.availableQty} in stock${low ? ' — Low' : ''}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-base font-semibold text-on-background">
                        ₹{Number(v.price).toLocaleString('en-IN')}
                      </span>
                      {!out && <ChevronRight className="h-5 w-5 text-muted" />}
                    </div>
                  </button>
                )
              })}
            </div>

            {processing && (
              <div className="px-4 py-3 border-t border-border flex items-center gap-2 text-sm text-muted">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                Recording sale…
              </div>
            )}
          </div>
        )}

        {/* Stats */}
        {session.length > 0 && (
          <div className="mt-6 grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-border bg-surface px-3 py-3 text-center">
              <p className="text-2xl font-bold text-on-background">{totalSold}</p>
              <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted">Sold</p>
            </div>
            <div className="rounded-xl border border-green-500/20 bg-green-500/8 px-3 py-3 text-center">
              <p className="text-2xl font-bold text-green-400">{successCount}</p>
              <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted">OK</p>
            </div>
            <div className={cn(
              'rounded-xl border px-3 py-3 text-center',
              errorCount > 0 ? 'border-red-500/20 bg-red-500/8' : 'border-border bg-surface'
            )}>
              <p className={cn('text-2xl font-bold', errorCount > 0 ? 'text-red-400' : 'text-muted')}>{errorCount}</p>
              <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted">Errors</p>
            </div>
          </div>
        )}

        {/* Session list */}
        {session.length > 0 && (
          <div className="mt-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[10px] font-medium uppercase tracking-widest text-muted">This Session</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const first = session[0]
                    if (first) {
                      setSession(prev => prev.slice(1))
                      if (first.status !== 'error') setTotalSold(n => Math.max(0, n - 1))
                    }
                  }}
                  className="flex items-center gap-1 rounded-full border border-border px-2.5 py-1.5 text-[10px] text-muted hover:text-on-background hover:border-on-background"
                >
                  <Undo2 className="h-3 w-3" /> Undo
                </button>
                <button
                  onClick={() => { setSession([]); setTotalSold(0) }}
                  className="flex items-center gap-1 rounded-full border border-border px-2.5 py-1.5 text-[10px] text-muted hover:text-destructive hover:border-destructive"
                >
                  <Trash2 className="h-3 w-3" /> Clear
                </button>
              </div>
            </div>
            <div className="space-y-2">
              {session.map((item, i) => {
                const time = item.timestamp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                if (item.status === 'error') {
                  return (
                    <div key={item.id} className={cn(
                      'flex items-start gap-2 rounded-xl border px-3 py-3',
                      i === 0 ? 'border-red-500/40 bg-red-500/10' : 'border-border bg-surface'
                    )}>
                      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-red-400">{item.error}</p>
                        <p className="text-[10px] text-muted font-mono mt-0.5 truncate">{item.sku}</p>
                      </div>
                      <span className="shrink-0 text-[10px] text-muted">{time}</span>
                    </div>
                  )
                }
                return (
                  <div key={item.id} className={cn(
                    'flex items-start gap-2 rounded-xl border px-3 py-3',
                    i === 0 && item.status === 'ok'        ? 'border-green-500/40 bg-green-500/8'  : '',
                    i === 0 && item.status === 'low-stock' ? 'border-yellow-500/40 bg-yellow-500/8' : '',
                    i !== 0 ? 'border-border bg-surface' : ''
                  )}>
                    {item.status === 'low-stock'
                      ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-400" />
                      : <CheckCircle2  className="mt-0.5 h-4 w-4 shrink-0 text-green-400" />}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-on-background truncate">{item.productName}</p>
                      <p className="mt-0.5 text-[11px] text-muted">
                        {[item.size, item.color].filter(Boolean).join(' / ') || item.sku}
                        {' · '}
                        <span className={item.newQuantity <= 3 ? 'text-yellow-400 font-medium' : 'text-muted'}>
                          {item.newQuantity} left
                        </span>
                        {item.status === 'low-stock' && <span className="ml-1.5 text-yellow-400 font-medium">⚠ Low</span>}
                      </p>
                    </div>
                    <span className="shrink-0 text-[10px] text-muted">{time}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Empty state */}
        {session.length === 0 && mode === 'scan' && (
          <div className="mt-12 flex flex-col items-center gap-3 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full border border-dashed border-border">
              <Barcode className="h-9 w-9 text-muted" />
            </div>
            <p className="text-sm text-muted">No scans yet today</p>
            <p className="text-[11px] text-muted/60 px-8">
              Scan a product barcode to start. Each scan deducts one unit.
            </p>
          </div>
        )}

      </div>
    </div>
  )
}

export default function PosScannerMobilePage() {
  return (
    <RBACGuard section="pos-scanner-mobile" redirectTo="/admin/login">
      <StaffScanner />
    </RBACGuard>
  )
}
