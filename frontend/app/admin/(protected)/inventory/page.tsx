'use client'

import { useEffect, useRef, useState } from 'react'
import { Search, Save, History, RefreshCw, ChevronUp, ChevronDown, Upload, Wrench } from 'lucide-react'
import { AdminHeader } from '@/components/admin/AdminHeader'
import { RBACGuard } from '@/components/admin/RBACGuard'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { inventoryApi } from '@/lib/api'
import { toast } from '@/stores/toastStore'
import { cn } from '@/lib/utils'
import type { InventoryRow } from '@/types/admin'

type Tab = 'stock' | 'history'

// ── Helpers ───────────────────────────────────────────────────────────────────

function StockBadge({ available }: { available: number }) {
  if (available === 0) return <Badge variant="destructive" className="text-xs">Out of Stock</Badge>
  if (available <= 3)  return <Badge className="bg-amber-600/80 text-amber-100 text-xs">Low — {available}</Badge>
  return <Badge variant="secondary" className="text-xs">{available}</Badge>
}

function actionColor(action: string) {
  switch (action) {
    case 'MANUAL':     return 'text-blue-400'
    case 'RESTOCK':    return 'text-emerald-400'
    case 'ADJUSTMENT': return 'text-amber-400'
    case 'ORDER':      return 'text-red-400'
    case 'IMPORT':     return 'text-violet-400'
    default:           return 'text-muted'
  }
}

// ── Quick Stock Update panel ──────────────────────────────────────────────────

type SearchRow = Awaited<ReturnType<typeof inventoryApi.search>>[number]

function QuickUpdatePanel({ defaultLocationId }: { defaultLocationId: string }) {
  const [query,      setQuery]      = useState('')
  const [results,    setResults]    = useState<SearchRow[]>([])
  const [searching,  setSearching]  = useState(false)
  const [edits,      setEdits]      = useState<Record<string, string>>({})
  const [saving,     setSaving]     = useState<Record<string, boolean>>({})
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleQuery(v: string) {
    setQuery(v)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!v.trim()) { setResults([]); return }
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const rows = await inventoryApi.search(v)
        setResults(rows)
      } catch { toast.error('Search failed') }
      finally { setSearching(false) }
    }, 350)
  }

  async function save(row: SearchRow) {
    const raw = edits[row.id]
    if (raw === undefined) return
    const qty = parseInt(raw, 10)
    if (isNaN(qty) || qty < 0) { toast.error('Invalid quantity'); return }
    setSaving((s) => ({ ...s, [row.id]: true }))
    try {
      await inventoryApi.set(row.variant.id, qty, row.location.id)
      setResults((prev) => prev.map((r) => r.id === row.id ? { ...r, quantity: qty } : r))
      setEdits((e) => { const n = { ...e }; delete n[row.id]; return n })
      toast.success(`${row.variant.sku} updated to ${qty}`)
    } catch (err: any) {
      toast.error(err.message ?? 'Update failed')
    } finally {
      setSaving((s) => ({ ...s, [row.id]: false }))
    }
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <h2 className="text-sm font-semibold text-on-background mb-3">Quick Stock Update</h2>

      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted" />
        <input
          value={query}
          onChange={(e) => handleQuery(e.target.value)}
          placeholder="Search by SKU or product name…"
          className="w-full border border-border bg-transparent pl-9 pr-3 py-2 text-sm text-on-background placeholder:text-muted outline-none focus:border-on-background transition-colors"
        />
        {searching && <RefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted animate-spin" />}
      </div>

      {results.length > 0 && (
        <div className="space-y-1">
          {results.map((row) => {
            const val     = edits[row.id] ?? String(row.quantity)
            const isDirty = edits[row.id] !== undefined
            return (
              <div key={row.id} className="flex items-center gap-3 rounded border border-border px-3 py-2 text-sm">
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-xs text-muted">{row.variant.sku}</p>
                  <p className="truncate text-xs text-on-background">{row.variant.product.name}</p>
                  {row.variant.size  && <span className="text-xs text-muted">{row.variant.size}</span>}
                  {row.variant.color && <span className="ml-2 text-xs text-muted">{row.variant.color}</span>}
                </div>
                <span className="text-xs text-muted shrink-0">{row.location.name}</span>
                <input
                  type="number"
                  min="0"
                  value={val}
                  onChange={(e) => setEdits((prev) => ({ ...prev, [row.id]: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && save(row)}
                  className={cn(
                    'w-16 border bg-transparent px-2 py-1 text-sm text-center outline-none transition-colors',
                    isDirty ? 'border-primary text-on-background' : 'border-border text-muted'
                  )}
                />
                <button
                  onClick={() => save(row)}
                  disabled={!isDirty || saving[row.id]}
                  className="flex items-center gap-1 rounded bg-primary/10 px-2 py-1 text-xs text-primary-light hover:bg-primary/20 disabled:opacity-40 transition-colors"
                >
                  <Save className="h-3 w-3" />
                  {saving[row.id] ? 'Saving…' : 'Save'}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {query && !searching && results.length === 0 && (
        <p className="text-xs text-muted text-center py-4">No results for "{query}"</p>
      )}
    </div>
  )
}

// ── History tab ───────────────────────────────────────────────────────────────

type HistoryEntry = Awaited<ReturnType<typeof inventoryApi.listHistory>>['data'][number]

function HistoryTable() {
  const [entries, setEntries] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [page,    setPage]    = useState(1)
  const [total,   setTotal]   = useState(0)
  const limit = 50

  useEffect(() => {
    setLoading(true)
    inventoryApi.listHistory(undefined, page, limit)
      .then((r) => { setEntries(r.data); setTotal(r.total) })
      .catch(() => toast.error('Failed to load history'))
      .finally(() => setLoading(false))
  }, [page])

  return (
    <div className="rounded-lg border border-border bg-surface">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>SKU</TableHead>
            <TableHead>Product</TableHead>
            <TableHead>Action</TableHead>
            <TableHead className="text-right">Before</TableHead>
            <TableHead className="text-right">After</TableHead>
            <TableHead className="text-right">Delta</TableHead>
            <TableHead>By</TableHead>
            <TableHead>When</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading
            ? [...Array(8)].map((_, i) => (
                <TableRow key={i}>
                  {[...Array(8)].map((_, j) => (
                    <TableCell key={j}><div className="h-4 rounded bg-surface-elevated animate-pulse w-16" /></TableCell>
                  ))}
                </TableRow>
              ))
            : entries.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-mono text-xs">{e.variant.sku}</TableCell>
                  <TableCell className="text-xs">{e.variant.product.name}</TableCell>
                  <TableCell>
                    <span className={cn('text-xs font-medium', actionColor(e.action))}>{e.action}</span>
                  </TableCell>
                  <TableCell className="text-right text-sm">{e.oldQuantity}</TableCell>
                  <TableCell className="text-right text-sm">{e.newQuantity}</TableCell>
                  <TableCell className={cn('text-right text-sm font-medium', e.delta >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                    {e.delta >= 0 ? '+' : ''}{e.delta}
                  </TableCell>
                  <TableCell className="text-xs text-muted">{e.performedBy ?? '—'}</TableCell>
                  <TableCell className="text-xs text-muted whitespace-nowrap">
                    {new Date(e.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </TableCell>
                </TableRow>
              ))
          }
        </TableBody>
      </Table>
      {total > limit && (
        <div className="flex items-center justify-between border-t border-border px-4 py-2">
          <span className="text-xs text-muted">Page {page} of {Math.ceil(total / limit)}</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded p-1 text-muted hover:text-on-background disabled:opacity-40"
            ><ChevronUp className="h-4 w-4" /></button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= Math.ceil(total / limit)}
              className="rounded p-1 text-muted hover:text-on-background disabled:opacity-40"
            ><ChevronDown className="h-4 w-4" /></button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function InventoryPage() {
  const [tab,          setTab]          = useState<Tab>('stock')
  const [rows,         setRows]         = useState<InventoryRow[]>([])
  const [loading,      setLoading]      = useState(true)
  const [defaultLocId, setDefaultLocId] = useState('')
  const [syncing,      setSyncing]      = useState(false)
  const [backfilling,  setBackfilling]  = useState(false)

  useEffect(() => {
    Promise.all([
      inventoryApi.list(),
      inventoryApi.listLocations(),
    ]).then(([inv, locs]) => {
      setRows(inv.data)
      setDefaultLocId(locs[0]?.id ?? '')
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  async function handleBackfill() {
    setBackfilling(true)
    try {
      const r = await inventoryApi.backfill()
      if (r.created === 0) {
        toast.success('All variants already have inventory records')
      } else {
        toast.success(`Created ${r.created} missing inventory record${r.created !== 1 ? 's' : ''} at "${r.locationName}"`)
        // Reload inventory table
        const [inv, locs] = await Promise.all([inventoryApi.list(), inventoryApi.listLocations()])
        setRows(inv.data)
        setDefaultLocId(locs[0]?.id ?? '')
      }
    } catch (err: any) {
      toast.error(err.message ?? 'Backfill failed')
    } finally {
      setBackfilling(false)
    }
  }

  async function handleSyncAll() {
    setSyncing(true)
    try {
      const r = await inventoryApi.syncAll()
      toast.success(`${r.synced} item${r.synced !== 1 ? 's' : ''} synced to POS`)
    } catch (err: any) {
      toast.error(err.message ?? 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  const lowStock   = rows.filter((r) => r.available > 0 && r.available <= 3).length
  const outOfStock = rows.filter((r) => r.available === 0).length

  return (
    <RBACGuard section="inventory">
      <div className="flex items-center justify-between border-b border-border bg-surface px-6 h-16">
        <div>
          <h1 className="font-display text-lg font-semibold text-on-background">Inventory</h1>
          <p className="text-xs text-muted">{rows.length} SKUs · {outOfStock} out of stock · {lowStock} low stock</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleBackfill}
            disabled={backfilling}
            className="flex items-center gap-2 rounded border border-amber-600/50 px-3 py-2 text-xs font-medium text-amber-400 hover:border-amber-500 hover:text-amber-300 transition-colors disabled:opacity-50"
            title="Create inventory records for variants that are missing one"
          >
            {backfilling
              ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" />Fixing…</>
              : <><Wrench className="h-3.5 w-3.5" />Fix Missing Inventory</>
            }
          </button>
          <button
            onClick={handleSyncAll}
            disabled={syncing}
            className="flex items-center gap-2 rounded border border-border px-3 py-2 text-xs font-medium text-muted hover:text-on-background hover:border-on-background transition-colors disabled:opacity-50"
          >
            {syncing
              ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" />Syncing…</>
              : <><Upload className="h-3.5 w-3.5" />Update All to POS</>
            }
          </button>
        </div>
      </div>
      <div className="p-6 space-y-4">

        {/* Tab bar */}
        <div className="flex gap-1 border-b border-border">
          {(['stock', 'history'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 text-xs font-medium uppercase tracking-widest transition-colors border-b-2 -mb-px',
                tab === t
                  ? 'border-primary text-on-background'
                  : 'border-transparent text-muted hover:text-on-background'
              )}
            >
              {t === 'history' && <History className="h-3 w-3" />}
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {tab === 'stock' && (
          <>
            {/* Quick update panel */}
            <QuickUpdatePanel defaultLocationId={defaultLocId} />

            {/* Full inventory table */}
            <div className="rounded-lg border border-border bg-surface">
              {loading ? (
                <div className="space-y-2 p-4">
                  {[...Array(6)].map((_, i) => <div key={i} className="h-10 rounded bg-surface-elevated animate-pulse" />)}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Colour</TableHead>
                      <TableHead className="text-right">On Hand</TableHead>
                      <TableHead className="text-right">Reserved</TableHead>
                      <TableHead>Available</TableHead>
                      <TableHead className="hidden lg:table-cell">Last Sync</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow key={row.id} className={cn(row.available === 0 && 'opacity-60')}>
                        <TableCell className="font-mono text-xs">{row.sku}</TableCell>
                        <TableCell className="text-sm font-medium">{row.productName}</TableCell>
                        <TableCell className="text-sm">{row.size ?? '—'}</TableCell>
                        <TableCell className="text-sm">{row.color ?? '—'}</TableCell>
                        <TableCell className="text-right">{row.quantity}</TableCell>
                        <TableCell className="text-right text-muted">{row.reserved}</TableCell>
                        <TableCell><StockBadge available={row.available} /></TableCell>
                        <TableCell className="hidden lg:table-cell text-xs text-muted">
                          {row.lastSyncAt
                            ? new Date(row.lastSyncAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                            : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </>
        )}

        {tab === 'history' && <HistoryTable />}
      </div>
    </RBACGuard>
  )
}
