'use client'

import { PosSyncEntry, SyncStatus } from '@/types/admin'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CheckCircle2, XCircle, Clock, SkipForward, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

const STATUS_CONFIG: Record<SyncStatus, { icon: React.ElementType; label: string; class: string }> = {
  SUCCESS:  { icon: CheckCircle2, label: 'Success',  class: 'text-success' },
  FAILED:   { icon: XCircle,      label: 'Failed',   class: 'text-destructive' },
  PENDING:  { icon: Clock,        label: 'Pending',  class: 'text-muted' },
  SKIPPED:  { icon: SkipForward,  label: 'Skipped',  class: 'text-muted' },
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

interface PosSyncLogProps {
  entries: PosSyncEntry[]
  isLoading?: boolean
  onRefresh?: () => void
}

export function PosSyncLog({ entries, isLoading, onRefresh }: PosSyncLogProps) {
  return (
    <div className="rounded-lg border border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h2 className="font-display text-sm font-semibold text-on-background">POS Webhook Log</h2>
          <p className="text-xs text-muted">Tally & Zoho inventory sync events</p>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-muted hover:bg-surface-elevated hover:text-on-background transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
            Refresh
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2 p-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="skeleton h-10 rounded" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">No sync events recorded yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Source</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">Rows Updated</TableHead>
              <TableHead className="hidden lg:table-cell">Received</TableHead>
              <TableHead className="hidden xl:table-cell">Error</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => {
              const { icon: StatusIcon, label, class: statusClass } = STATUS_CONFIG[entry.status]
              return (
                <TableRow key={entry.id}>
                  <TableCell>
                    <Badge variant={entry.source === 'TALLY' ? 'default' : 'secondary'} className="font-mono text-xs">
                      {entry.source}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className={cn('flex items-center gap-1.5 text-xs font-medium', statusClass)}>
                      <StatusIcon className="h-3.5 w-3.5 shrink-0" />
                      {label}
                    </span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-on-surface">
                    {entry.rowsAffected ?? '—'}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-xs text-muted">
                    {formatTime(entry.createdAt)}
                  </TableCell>
                  <TableCell className="hidden xl:table-cell max-w-xs">
                    {entry.errorMessage ? (
                      <span className="truncate block text-xs text-destructive" title={entry.errorMessage}>
                        {entry.errorMessage}
                      </span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
