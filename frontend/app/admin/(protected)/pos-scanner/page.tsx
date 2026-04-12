'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { productsApi, inventoryApi } from '@/lib/api'
import { Barcode, Trash2, Undo2, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScanResult {
  id:          string   // unique per scan event
  barcode:     string
  sku:         string
  productName: string
  size:        string | null
  color:       string | null
  newQuantity: number
  timestamp:   Date
  status:      'ok' | 'low-stock' | 'error'
  error?:      string
}

// ─── Sound feedback ───────────────────────────────────────────────────────────

function playBeep(type: 'success' | 'error') {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.value = type === 'success' ? 880 : 300
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.18)
  } catch { /* audio not available */ }
}

// ─── Session item row ─────────────────────────────────────────────────────────

function SessionRow({ item, isLatest }: { item: ScanResult; isLatest: boolean }) {
  const time = item.timestamp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  if (item.status === 'error') {
    return (
      <div className={cn(
        'flex items-start gap-3 rounded-lg border px-4 py-3 transition-all',
        isLatest ? 'border-red-500/40 bg-red-500/10' : 'border-border bg-surface'
      )}>
        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-red-400">{item.error}</p>
          <p className="mt-0.5 font-mono text-xs text-muted">{item.barcode}</p>
        </div>
        <span className="shrink-0 text-[10px] text-muted">{time}</span>
      </div>
    )
  }

  return (
    <div className={cn(
      'flex items-start gap-3 rounded-lg border px-4 py-3 transition-all',
      isLatest && item.status === 'ok'        ? 'border-green-500/40 bg-green-500/8' : '',
      isLatest && item.status === 'low-stock' ? 'border-yellow-500/40 bg-yellow-500/8' : '',
      !isLatest ? 'border-border bg-surface' : ''
    )}>
      {item.status === 'low-stock'
        ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-400" />
        : <CheckCircle2  className="mt-0.5 h-4 w-4 shrink-0 text-green-400" />
      }
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-on-background truncate">{item.productName}</p>
        <p className="mt-0.5 text-xs text-muted">
          {[item.size, item.color].filter(Boolean).join(' / ') || item.sku}
          {' · '}
          <span className={item.newQuantity <= 3 ? 'text-yellow-400 font-medium' : 'text-muted'}>
            {item.newQuantity} left
          </span>
          {item.status === 'low-stock' && (
            <span className="ml-1.5 text-yellow-400 font-medium">⚠ Low stock</span>
          )}
        </p>
      </div>
      <span className="shrink-0 text-[10px] text-muted">{time}</span>
    </div>
  )
}

// ─── POS Scanner page ─────────────────────────────────────────────────────────

export default function PosScannerPage() {
  const inputRef        = useRef<HTMLInputElement>(null)
  const debounceRef     = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastBarcodeRef  = useRef<string>('')
  const lastScanTimeRef = useRef<number>(0)

  const [scanInput,  setScanInput]  = useState('')
  const [scanning,   setScanning]   = useState(false)
  const [session,    setSession]    = useState<ScanResult[]>([])
  const [totalSold,  setTotalSold]  = useState(0)

  // Always keep input focused
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const processBarcode = useCallback(async (barcode: string) => {
    const trimmed = barcode.trim()
    if (!trimmed) return

    // Deduplicate rapid double-scans (within 800ms)
    const now = Date.now()
    if (trimmed === lastBarcodeRef.current && now - lastScanTimeRef.current < 800) return
    lastBarcodeRef.current  = trimmed
    lastScanTimeRef.current = now

    setScanning(true)
    setScanInput('')

    const scanId = `${trimmed}-${now}`

    try {
      const result = await inventoryApi.reduce(trimmed, 1)
      const isLow  = result.newQuantity <= 5

      playBeep('success')

      setSession((prev) => [{
        id:          scanId,
        barcode:     trimmed,
        sku:         result.sku,
        productName: result.productName,
        size:        result.size,
        color:       result.color,
        newQuantity: result.newQuantity,
        timestamp:   new Date(),
        status:      isLow ? 'low-stock' : 'ok',
      }, ...prev].slice(0, 50)) // keep last 50 scans

      setTotalSold((n) => n + 1)
    } catch (err: any) {
      playBeep('error')
      setSession((prev) => [{
        id:          scanId,
        barcode:     trimmed,
        sku:         '',
        productName: '',
        size:        null,
        color:       null,
        newQuantity: 0,
        timestamp:   new Date(),
        status:      'error',
        error:       err.message ?? 'Scan failed',
      }, ...prev].slice(0, 50))
    } finally {
      setScanning(false)
      // Re-focus after processing
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [])

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (debounceRef.current) clearTimeout(debounceRef.current)
      processBarcode(scanInput)
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setScanInput(val)
    // Auto-trigger after 300ms idle (some scanners don't send Enter)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (val.length >= 4) {
      debounceRef.current = setTimeout(() => processBarcode(val), 400)
    }
  }

  function undoLast() {
    setSession((prev) => prev.slice(1))
    if (session[0]?.status !== 'error') setTotalSold((n) => Math.max(0, n - 1))
  }

  const successCount = session.filter((s) => s.status !== 'error').length
  const errorCount   = session.filter((s) => s.status === 'error').length

  return (
    <div className="flex h-full flex-col p-4 md:p-8 max-w-2xl mx-auto">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-on-background">POS Scanner</h1>
        <p className="mt-1 text-sm text-muted">Scan product barcodes to deduct stock instantly</p>
      </div>

      {/* Scanner input */}
      <div className={cn(
        'relative rounded-xl border-2 transition-all duration-200',
        scanning    ? 'border-primary bg-primary/5' : 'border-border bg-surface',
      )}>
        <div className="flex items-center gap-3 px-4 py-4">
          <Barcode className={cn('h-6 w-6 shrink-0 transition-colors', scanning ? 'text-primary-light' : 'text-muted')} />
          <input
            ref={inputRef}
            value={scanInput}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onBlur={() => setTimeout(() => inputRef.current?.focus(), 100)}
            placeholder={scanning ? 'Processing…' : 'Scan barcode or type and press Enter…'}
            disabled={scanning}
            className="flex-1 bg-transparent text-base text-on-background placeholder:text-muted outline-none disabled:opacity-50"
            autoComplete="off"
            spellCheck={false}
          />
          {scanning && (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent shrink-0" />
          )}
        </div>
      </div>

      <p className="mt-2 text-center text-xs text-muted">
        Input is always active — just point your scanner and scan
      </p>

      {/* Stats bar */}
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
                onClick={undoLast}
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

          <div className="space-y-2 overflow-y-auto flex-1 pr-1 no-scrollbar">
            {session.map((item, i) => (
              <SessionRow key={item.id} item={item} isLatest={i === 0} />
            ))}
          </div>
        </div>
      )}

      {session.length === 0 && (
        <div className="mt-10 flex flex-col items-center justify-center gap-3 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-border">
            <Barcode className="h-7 w-7 text-muted" />
          </div>
          <p className="text-sm text-muted">No scans yet this session</p>
          <p className="text-xs text-muted/60">Scan a product barcode to start deducting stock</p>
        </div>
      )}
    </div>
  )
}
