'use client'

import { useEffect, useState, useCallback } from 'react'
import { ChevronLeft, ChevronRight, X, Loader2, RotateCcw } from 'lucide-react'
import { AdminHeader } from '@/components/admin/AdminHeader'
import { RBACGuard }   from '@/components/admin/RBACGuard'
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table'
import { returnsApi, ReturnRequest, ReturnStatus } from '@/lib/api'
import { toast }  from '@/stores/toastStore'
import { cn }     from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<ReturnStatus, string> = {
  PENDING:      'Pending',
  UNDER_REVIEW: 'Under Review',
  APPROVED:     'Approved',
  REJECTED:     'Rejected',
  RESOLVED:     'Resolved',
}

const STATUS_COLORS: Record<ReturnStatus, string> = {
  PENDING:      'bg-amber-600/20 text-amber-400',
  UNDER_REVIEW: 'bg-blue-600/20 text-blue-400',
  APPROVED:     'bg-emerald-600/20 text-emerald-400',
  REJECTED:     'bg-red-600/20 text-red-400',
  RESOLVED:     'bg-violet-600/20 text-violet-400',
}

const ALL_STATUSES: ReturnStatus[] = [
  'PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'RESOLVED',
]

function StatusBadge({ status }: { status: string }) {
  const s = status as ReturnStatus
  return (
    <span className={cn('inline-flex px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide rounded-sm', STATUS_COLORS[s] ?? 'bg-surface text-muted')}>
      {STATUS_LABELS[s] ?? s}
    </span>
  )
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ── Detail panel ──────────────────────────────────────────────────────────────

function ReturnDetail({
  r,
  onClose,
  onUpdated,
}: {
  r: ReturnRequest
  onClose: () => void
  onUpdated: (updated: ReturnRequest) => void
}) {
  const [status,    setStatus]    = useState<ReturnStatus>(r.status)
  const [adminNote, setAdminNote] = useState(r.adminNote ?? '')
  const [saving,    setSaving]    = useState(false)

  async function save() {
    setSaving(true)
    try {
      const updated = await returnsApi.update(r.id, { status, adminNote: adminNote || undefined })
      onUpdated(updated)
      toast.success('Return request updated')
    } catch (err: any) {
      toast.error(err.message ?? 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div
      key="detail"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      className="w-full max-w-sm shrink-0 border-l border-border bg-surface flex flex-col overflow-y-auto"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <p className="text-sm font-semibold text-on-background">Return #{r.id.slice(-6).toUpperCase()}</p>
        <button onClick={onClose} className="p-1 text-muted hover:text-on-background transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 p-5 space-y-6 text-sm">
        {/* Order */}
        <div>
          <p className="text-[11px] uppercase tracking-widest text-muted mb-1">Order Number</p>
          <p className="font-mono font-bold text-on-background">{r.orderNumber}</p>
        </div>

        {/* Customer */}
        <div className="space-y-1">
          <p className="text-[11px] uppercase tracking-widest text-muted">Customer</p>
          <p className="text-on-background font-medium">{r.customerName}</p>
          <p className="text-muted">{r.customerEmail}</p>
          <p className="text-muted">{r.customerPhone}</p>
        </div>

        {/* Description */}
        <div>
          <p className="text-[11px] uppercase tracking-widest text-muted mb-1">Damage Description</p>
          <p className="text-on-background leading-relaxed whitespace-pre-wrap">{r.description}</p>
        </div>

        {/* Submitted */}
        <div>
          <p className="text-[11px] uppercase tracking-widest text-muted mb-1">Submitted</p>
          <p className="text-on-background">{fmt(r.createdAt)}</p>
        </div>

        <hr className="border-border" />

        {/* Status update */}
        <div className="space-y-3">
          <p className="text-[11px] uppercase tracking-widest text-muted">Update Status</p>
          <div className="grid grid-cols-1 gap-1.5">
            {ALL_STATUSES.map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 text-xs font-medium border transition-colors text-left',
                  status === s
                    ? 'border-primary bg-primary/10 text-primary-light'
                    : 'border-border text-muted hover:border-on-background hover:text-on-background'
                )}
              >
                <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_COLORS[s].split(' ')[0])} />
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        {/* Admin note */}
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-widest text-muted">Admin Note</p>
          <textarea
            rows={4}
            value={adminNote}
            onChange={e => setAdminNote(e.target.value)}
            placeholder="Internal note (optional)"
            className="w-full border border-border bg-transparent px-3 py-2 text-sm text-on-background placeholder:text-muted outline-none focus:border-on-background transition-colors resize-none"
          />
        </div>

        {r.resolvedBy && (
          <p className="text-[11px] text-muted">Resolved by: {r.resolvedBy}</p>
        )}
      </div>

      {/* Save button */}
      <div className="border-t border-border p-4">
        <button
          onClick={save}
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 bg-primary py-2.5 text-xs font-semibold uppercase tracking-widest text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {saving ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Saving…</> : 'Save Changes'}
        </button>
      </div>
    </motion.div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminReturnsPage() {
  const [returns,    setReturns]    = useState<ReturnRequest[]>([])
  const [total,      setTotal]      = useState(0)
  const [page,       setPage]       = useState(1)
  const [pages,      setPages]      = useState(1)
  const [loading,    setLoading]    = useState(true)
  const [statusFilt, setStatusFilt] = useState<string>('')
  const [selected,   setSelected]   = useState<ReturnRequest | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await returnsApi.list({ status: statusFilt || undefined, page, limit: 20 })
      setReturns(res.data)
      setTotal(res.total)
      setPages(res.pages)
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to load returns')
    } finally {
      setLoading(false)
    }
  }, [statusFilt, page])

  useEffect(() => { load() }, [load])

  function handleUpdated(updated: ReturnRequest) {
    setReturns(prev => prev.map(r => r.id === updated.id ? updated : r))
    setSelected(updated)
  }

  return (
    <RBACGuard section="returns">
      <div className="flex h-full flex-col overflow-hidden">
        <AdminHeader title="Return Requests" subtitle={`${total} total`} />

        {/* Filter bar */}
        <div className="flex items-center gap-2 border-b border-border px-6 py-3">
          <button
            onClick={() => { setStatusFilt(''); setPage(1) }}
            className={cn('px-3 py-1.5 text-xs font-medium border transition-colors', !statusFilt ? 'border-primary bg-primary/10 text-primary-light' : 'border-border text-muted hover:border-on-background hover:text-on-background')}
          >
            All
          </button>
          {ALL_STATUSES.map(s => (
            <button
              key={s}
              onClick={() => { setStatusFilt(s); setPage(1) }}
              className={cn('px-3 py-1.5 text-xs font-medium border transition-colors', statusFilt === s ? 'border-primary bg-primary/10 text-primary-light' : 'border-border text-muted hover:border-on-background hover:text-on-background')}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
          <button onClick={load} className="ml-auto p-1.5 text-muted hover:text-on-background transition-colors">
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Table */}
          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-muted" />
              </div>
            ) : returns.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <RotateCcw className="h-10 w-10 text-muted/40" />
                <p className="text-sm text-muted">No return requests{statusFilt ? ` with status "${STATUS_LABELS[statusFilt as ReturnStatus]}"` : ''}</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {returns.map(r => (
                    <TableRow
                      key={r.id}
                      className={cn('cursor-pointer transition-colors', selected?.id === r.id ? 'bg-surface-elevated' : 'hover:bg-surface-elevated/60')}
                      onClick={() => setSelected(r)}
                    >
                      <TableCell className="font-mono text-xs font-medium text-on-background">{r.orderNumber}</TableCell>
                      <TableCell>
                        <p className="text-sm text-on-background">{r.customerName}</p>
                        <p className="text-[11px] text-muted">{r.customerPhone}</p>
                      </TableCell>
                      <TableCell><StatusBadge status={r.status} /></TableCell>
                      <TableCell className="text-xs text-muted">{fmt(r.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {/* Pagination */}
            {pages > 1 && (
              <div className="flex items-center justify-center gap-3 border-t border-border py-4">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-1.5 text-muted hover:text-on-background disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-xs text-muted">Page {page} of {pages}</span>
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

          {/* Detail panel */}
          <AnimatePresence>
            {selected && (
              <ReturnDetail
                key={selected.id}
                r={selected}
                onClose={() => setSelected(null)}
                onUpdated={handleUpdated}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </RBACGuard>
  )
}
