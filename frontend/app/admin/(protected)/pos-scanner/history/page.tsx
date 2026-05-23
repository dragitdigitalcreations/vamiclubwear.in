'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, ChevronLeft, ChevronRight, Loader2, RotateCcw, Undo2, CheckCircle2, Archive,
  Barcode, X,
} from 'lucide-react'
import { AdminHeader } from '@/components/admin/AdminHeader'
import { RBACGuard }   from '@/components/admin/RBACGuard'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { inventoryApi } from '@/lib/api'
import { toast } from '@/stores/toastStore'
import { cn } from '@/lib/utils'

type PosSale = Awaited<ReturnType<typeof inventoryApi.listPosSales>>['data'][number]

type Filter = 'all' | 'restorable' | 'restored'

function fmtTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

function variantLabel(s: PosSale) {
  return [s.size, s.color].filter(Boolean).join(' / ') || s.sku
}

// Small audio cue for scanner-style feedback. Matches the POS scanner page.
function playBeep(type: 'success' | 'error' | 'scan') {
  try {
    const ctx  = new (window.AudioContext || (window as any).webkitAudioContext)()
    const osc  = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.value = type === 'success' ? 880 : type === 'scan' ? 660 : 300
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15)
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.15)
  } catch { /* audio not available */ }
}

export default function PosScannerHistoryPage() {
  const [rows,       setRows]       = useState<PosSale[]>([])
  const [total,      setTotal]      = useState(0)
  const [page,       setPage]       = useState(1)
  const [limit]                     = useState(50)
  const [loading,    setLoading]    = useState(true)
  const [restoring,  setRestoring]  = useState<string | null>(null)
  const [filter,     setFilter]     = useState<Filter>('all')

  // Barcode scanner state
  const [scanInput,    setScanInput]    = useState('')
  const [scannedFor,   setScannedFor]   = useState<string | null>(null) // barcode currently filtering the list
  const [scanError,    setScanError]    = useState<string | null>(null)
  const inputRef    = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastScanRef = useRef<{ barcode: string; time: number }>({ barcode: '', time: 0 })
  const autoPromptedRef = useRef<string | null>(null) // history.id we've already auto-prompted to avoid loops

  const load = useCallback(async (barcode: string | null) => {
    setLoading(true)
    try {
      const res = await inventoryApi.listPosSales({
        page,
        limit,
        days: 30,
        ...(barcode    ? { barcode, unreversed: true } : {}),
      })
      const data = Array.isArray(res?.data) ? res.data : []
      setRows(data)
      setTotal(typeof res?.total === 'number' ? res.total : 0)
      return data
    } catch (err: any) {
      setRows([])
      setTotal(0)
      if (barcode) {
        setScanError(err.message ?? 'Barcode not found')
        playBeep('error')
      } else {
        toast.error(err.message ?? 'Failed to load POS sales')
      }
      return [] as PosSale[]
    } finally {
      setLoading(false)
    }
  }, [page, limit])

  // Initial / page-change load — reloads whatever filter is active
  useEffect(() => { load(scannedFor) }, [load, scannedFor])

  // Keep the scanner input focused when no barcode is locked in
  useEffect(() => {
    if (!scannedFor) setTimeout(() => inputRef.current?.focus(), 50)
  }, [scannedFor])

  async function handleRestore(row: PosSale) {
    const label = `${row.productName} (${variantLabel(row)})`
    const ok = window.confirm(
      `Restore ${row.quantity} × ${label} back to stock?\n\nThis cannot be undone.`
    )
    if (!ok) return

    setRestoring(row.id)
    try {
      const result = await inventoryApi.reversePosSale(row.id)
      setRows(prev => prev.map(r =>
        r.id === row.id
          ? { ...r, reversedAt: new Date().toISOString(), reversedBy: 'you', archived: result.unarchived ? false : r.archived }
          : r
      ))
      playBeep('success')
      toast.success(
        result.unarchived
          ? `Restored ${result.restored} unit · product un-archived`
          : `Restored ${result.restored} unit · ${result.newQuantity} in stock`
      )
    } catch (err: any) {
      playBeep('error')
      toast.error(err.message ?? 'Restore failed')
    } finally {
      setRestoring(null)
    }
  }

  const handleBarcode = useCallback(async (barcode: string) => {
    const trimmed = barcode.trim()
    if (!trimmed) return

    const now = Date.now()
    if (trimmed === lastScanRef.current.barcode && now - lastScanRef.current.time < 800) return
    lastScanRef.current = { barcode: trimmed, time: now }

    setScanInput('')
    setScanError(null)
    setScannedFor(trimmed)   // triggers useEffect → load(trimmed)
    setPage(1)
    playBeep('scan')
  }, [])

  function clearScan() {
    setScannedFor(null)
    setScanError(null)
    setScanInput('')
    autoPromptedRef.current = null
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (debounceRef.current) clearTimeout(debounceRef.current)
      handleBarcode(scanInput)
    }
    if (e.key === 'Escape') clearScan()
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setScanInput(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (val.length >= 4) {
      debounceRef.current = setTimeout(() => handleBarcode(val), 400)
    }
  }

  // After a barcode load returns exactly one un-reversed row, auto-prompt
  // restore. Without this the cashier would have to scan AND click — the
  // whole point of scan-to-return is one motion.
  useEffect(() => {
    if (!scannedFor || loading) return
    const restorable = rows.filter(r => !r.reversedAt)
    if (restorable.length === 1 && autoPromptedRef.current !== restorable[0].id) {
      autoPromptedRef.current = restorable[0].id
      handleRestore(restorable[0])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, loading, scannedFor])

  const visible = scannedFor
    ? rows  // when filtering by barcode we already requested unreversed=true; show all returned rows
    : rows.filter(r => {
        if (filter === 'restorable') return !r.reversedAt
        if (filter === 'restored')   return !!r.reversedAt
        return true
      })

  const pages = Math.max(1, Math.ceil(total / limit))

  return (
    <RBACGuard section="pos-scanner">
      <div className="flex h-full flex-col overflow-hidden">
        <AdminHeader title="POS Scanner History" subtitle="Restore stock for returned items scanned at the counter (last 30 days)" />

        {/* Scanner input */}
        <div className="border-b border-border px-6 py-3">
          <div className={cn(
            'relative flex items-center gap-3 rounded-lg border-2 px-4 py-3 transition-all',
            scannedFor
              ? 'border-primary/40 bg-primary/5'
              : 'border-border bg-surface focus-within:border-primary/60'
          )}>
            <Barcode className={cn('h-5 w-5 shrink-0', scannedFor ? 'text-primary-light' : 'text-muted')} />
            {scannedFor ? (
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-widest text-muted">Filtering by barcode</p>
                <p className="font-mono text-sm text-on-background truncate">{scannedFor}</p>
              </div>
            ) : (
              <input
                ref={inputRef}
                value={scanInput}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onBlur={() => { if (!scannedFor) setTimeout(() => inputRef.current?.focus(), 100) }}
                placeholder="Scan returned item's barcode to find & restore — or browse list below"
                className="flex-1 bg-transparent text-sm text-on-background placeholder:text-muted outline-hidden"
                autoComplete="off"
                spellCheck={false}
              />
            )}
            {scannedFor && (
              <button
                onClick={clearScan}
                className="shrink-0 flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs text-muted hover:text-on-background hover:border-on-background transition-colors"
              >
                <X className="h-3 w-3" /> Clear
              </button>
            )}
          </div>
          {scanError && <p className="mt-2 text-xs text-red-400">{scanError}</p>}
          {!scannedFor && !scanError && (
            <p className="mt-1.5 text-[11px] text-muted">Point the scanner at the product the customer is returning — if exactly one restorable scan matches, a confirm dialog opens automatically.</p>
          )}
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-2 border-b border-border px-6 py-3">
          <Link
            href="/admin/pos-scanner"
            className="mr-2 flex items-center gap-1.5 text-xs text-muted hover:text-on-background transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to scanner
          </Link>
          <span className="mx-2 h-4 w-px bg-border" />
          {(['all', 'restorable', 'restored'] as Filter[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              disabled={!!scannedFor}
              className={cn(
                'px-3 py-1.5 text-xs font-medium border transition-colors capitalize',
                filter === f && !scannedFor
                  ? 'border-primary bg-primary/10 text-primary-light'
                  : 'border-border text-muted hover:border-on-background hover:text-on-background',
                scannedFor && 'opacity-40 cursor-not-allowed'
              )}
            >
              {f}
            </button>
          ))}
          <button onClick={() => load(scannedFor)} className="ml-auto p-1.5 text-muted hover:text-on-background transition-colors" title="Refresh">
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-muted" />
            </div>
          ) : visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Undo2 className="h-10 w-10 text-muted/40" />
              <p className="text-sm text-muted">
                {scannedFor                ? 'No restorable scans match this barcode in the last 30 days'
                 : filter === 'restored'   ? 'No restored sales yet'
                 : filter === 'restorable' ? 'Nothing to restore — every recent POS sale has either been restored or is older than 30 days'
                 :                           'No POS scanner deductions in the last 30 days'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Scanned at</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Variant</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead>By</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map(row => {
                  const isRestored = !!row.reversedAt
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="text-xs text-muted whitespace-nowrap">{fmtTime(row.createdAt)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm text-on-background">{row.productName}</span>
                          {row.archived && (
                            <span title="Product is archived (sold-out auto-hide)" className="inline-flex items-center gap-0.5 rounded bg-amber-600/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-400">
                              <Archive className="h-3 w-3" /> archived
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted">{variantLabel(row)}</TableCell>
                      <TableCell className="font-mono text-[11px] text-muted">{row.sku}</TableCell>
                      <TableCell className="text-right text-sm text-on-background tabular-nums">{row.quantity}</TableCell>
                      <TableCell className="text-xs text-muted truncate max-w-[140px]">{row.performedBy ?? '—'}</TableCell>
                      <TableCell>
                        {isRestored ? (
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-600/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
                            <CheckCircle2 className="h-3 w-3" /> Restored
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded bg-blue-600/15 px-2 py-0.5 text-[11px] font-semibold text-blue-400">
                            Sold
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <button
                          onClick={() => handleRestore(row)}
                          disabled={isRestored || restoring === row.id}
                          className={cn(
                            'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border transition-colors',
                            isRestored
                              ? 'border-border text-muted cursor-not-allowed opacity-50'
                              : 'border-primary text-primary-light hover:bg-primary/10'
                          )}
                          title={isRestored ? `Restored ${fmtTime(row.reversedAt!)}${row.reversedBy ? ' by ' + row.reversedBy : ''}` : 'Restore this unit back to stock'}
                        >
                          {restoring === row.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Undo2 className="h-3 w-3" />
                          )}
                          {isRestored ? 'Restored' : 'Restore'}
                        </button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Pagination — hidden during a barcode-filtered view */}
        {!scannedFor && pages > 1 && (
          <div className="flex items-center justify-center gap-3 border-t border-border py-3">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 text-muted hover:text-on-background disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs text-muted">Page {page} of {pages} · {total} total</span>
            <button
              onClick={() => setPage(p => Math.min(pages, p + 1))}
              disabled={page >= pages}
              className="p-1.5 text-muted hover:text-on-background disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </RBACGuard>
  )
}
