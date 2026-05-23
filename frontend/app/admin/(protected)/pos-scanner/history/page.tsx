'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, ChevronLeft, ChevronRight, Loader2, RotateCcw, Undo2, CheckCircle2, Archive,
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

export default function PosScannerHistoryPage() {
  const [rows,       setRows]       = useState<PosSale[]>([])
  const [total,      setTotal]      = useState(0)
  const [page,       setPage]       = useState(1)
  const [limit]                     = useState(50)
  const [loading,    setLoading]    = useState(true)
  const [restoring,  setRestoring]  = useState<string | null>(null)
  const [filter,     setFilter]     = useState<Filter>('all')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await inventoryApi.listPosSales(page, limit, 30)
      // Defensive: backend might be running stale code (the /pos-sales route
      // not yet deployed) which falls through to /:variantId and returns a
      // plain array. Guard against the unexpected shape so the page renders
      // an empty state instead of crashing.
      setRows(Array.isArray(res?.data) ? res.data : [])
      setTotal(typeof res?.total === 'number' ? res.total : 0)
    } catch (err: any) {
      setRows([])
      setTotal(0)
      toast.error(err.message ?? 'Failed to load POS sales')
    } finally {
      setLoading(false)
    }
  }, [page, limit])

  useEffect(() => { load() }, [load])

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
      toast.success(
        result.unarchived
          ? `Restored ${result.restored} unit · product un-archived`
          : `Restored ${result.restored} unit · ${result.newQuantity} in stock`
      )
    } catch (err: any) {
      toast.error(err.message ?? 'Restore failed')
    } finally {
      setRestoring(null)
    }
  }

  const visible = rows.filter(r => {
    if (filter === 'restorable') return !r.reversedAt
    if (filter === 'restored')   return !!r.reversedAt
    return true
  })

  const pages = Math.max(1, Math.ceil(total / limit))

  return (
    <RBACGuard section="pos-scanner">
      <div className="flex h-full flex-col overflow-hidden">
        <AdminHeader title="POS Scanner History" subtitle="Restore stock for returned items scanned at the counter (last 30 days)" />

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
              className={cn(
                'px-3 py-1.5 text-xs font-medium border transition-colors capitalize',
                filter === f
                  ? 'border-primary bg-primary/10 text-primary-light'
                  : 'border-border text-muted hover:border-on-background hover:text-on-background'
              )}
            >
              {f}
            </button>
          ))}
          <button onClick={load} className="ml-auto p-1.5 text-muted hover:text-on-background transition-colors" title="Refresh">
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
                {filter === 'restored' ? 'No restored sales yet'
                  : filter === 'restorable' ? 'Nothing to restore — every recent POS sale has either been restored or is older than 30 days'
                  : 'No POS scanner deductions in the last 30 days'}
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

        {/* Pagination */}
        {pages > 1 && (
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
