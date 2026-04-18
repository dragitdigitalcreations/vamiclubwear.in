'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Loader2, RotateCcw, ShoppingCart, AlertTriangle, Package, Bell, ExternalLink } from 'lucide-react'
import { AdminHeader } from '@/components/admin/AdminHeader'
import { RBACGuard }   from '@/components/admin/RBACGuard'
import { ordersApi, returnsApi, statsApi } from '@/lib/api'
import { toast } from '@/stores/toastStore'
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

interface NotificationItem {
  id:       string
  type:     'order' | 'return' | 'stock'
  title:    string
  subtitle: string
  href:     string
  time:     string
  urgent:   boolean
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const [items,   setItems]   = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [stats,   setStats]   = useState<{ lowStockItems: number; pendingSyncs: number } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [ordersRes, returnsRes, statsRes] = await Promise.allSettled([
        ordersApi.list({ limit: 20, page: 1 }),
        returnsApi.list({ status: 'PENDING', limit: 20 }),
        statsApi.getSummary(),
      ])

      const notifications: NotificationItem[] = []

      // New orders (last 48h)
      if (ordersRes.status === 'fulfilled') {
        const cutoff = Date.now() - 48 * 60 * 60 * 1000
        ordersRes.value.data
          .filter(o => new Date(o.createdAt).getTime() > cutoff)
          .forEach(o => {
            notifications.push({
              id:       `order-${o.id}`,
              type:     'order',
              title:    `New order ${o.orderNumber}`,
              subtitle: `${o.customerName ?? 'Customer'} · ₹${Number(o.total).toLocaleString('en-IN')} · ${o.status}`,
              href:     '/admin/orders',
              time:     o.createdAt,
              urgent:   o.status === 'PENDING',
            })
          })
      }

      // Pending return requests
      if (returnsRes.status === 'fulfilled') {
        returnsRes.value.data.forEach(r => {
          notifications.push({
            id:       `return-${r.id}`,
            type:     'return',
            title:    `Return request — ${r.orderNumber}`,
            subtitle: `${r.customerName} · ${r.customerPhone} · Awaiting review`,
            href:     '/admin/returns',
            time:     r.createdAt,
            urgent:   true,
          })
        })
      }

      // Stats for context
      if (statsRes.status === 'fulfilled') {
        setStats({ lowStockItems: statsRes.value.lowStockItems, pendingSyncs: statsRes.value.pendingSyncs })
        if (statsRes.value.lowStockItems > 0) {
          notifications.push({
            id:       'stock-alert',
            type:     'stock',
            title:    `${statsRes.value.lowStockItems} variant${statsRes.value.lowStockItems !== 1 ? 's' : ''} low on stock`,
            subtitle: 'Quantity ≤ 5 — consider restocking',
            href:     '/admin/inventory',
            time:     new Date().toISOString(),
            urgent:   statsRes.value.lowStockItems > 3,
          })
        }
      }

      // Sort: urgent first, then by time desc
      notifications.sort((a, b) => {
        if (a.urgent !== b.urgent) return a.urgent ? -1 : 1
        return new Date(b.time).getTime() - new Date(a.time).getTime()
      })

      setItems(notifications)
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const urgentCount = items.filter(i => i.urgent).length

  function iconFor(type: NotificationItem['type']) {
    switch (type) {
      case 'order':  return <ShoppingCart className="h-4 w-4" />
      case 'return': return <RotateCcw className="h-4 w-4" />
      case 'stock':  return <Package className="h-4 w-4" />
    }
  }

  function colorFor(type: NotificationItem['type'], urgent: boolean) {
    if (type === 'return' || urgent) return 'text-amber-400 bg-amber-900/20'
    if (type === 'order')  return 'text-blue-400 bg-blue-900/20'
    return 'text-muted bg-surface-elevated'
  }

  return (
    <RBACGuard section="dashboard">
      <div className="flex h-full flex-col">
        <AdminHeader
          title="Notifications"
          subtitle={urgentCount > 0 ? `${urgentCount} need${urgentCount === 1 ? 's' : ''} attention` : 'All caught up'}
        />

        {/* Summary cards */}
        {stats && (
          <div className="grid grid-cols-2 gap-4 border-b border-border px-6 py-4 sm:grid-cols-4">
            <div className="bg-surface-elevated border border-border p-3">
              <p className="text-[11px] uppercase tracking-widest text-muted">Low Stock SKUs</p>
              <p className={cn('mt-1 text-2xl font-bold', stats.lowStockItems > 0 ? 'text-amber-400' : 'text-on-background')}>
                {stats.lowStockItems}
              </p>
            </div>
            <div className="bg-surface-elevated border border-border p-3">
              <p className="text-[11px] uppercase tracking-widest text-muted">Pending Returns</p>
              <p className={cn('mt-1 text-2xl font-bold', items.filter(i => i.type === 'return').length > 0 ? 'text-amber-400' : 'text-on-background')}>
                {items.filter(i => i.type === 'return').length}
              </p>
            </div>
            <div className="bg-surface-elevated border border-border p-3">
              <p className="text-[11px] uppercase tracking-widest text-muted">New Orders (48h)</p>
              <p className="mt-1 text-2xl font-bold text-on-background">
                {items.filter(i => i.type === 'order').length}
              </p>
            </div>
            <div className="bg-surface-elevated border border-border p-3">
              <p className="text-[11px] uppercase tracking-widest text-muted">POS Sync Issues</p>
              <p className={cn('mt-1 text-2xl font-bold', stats.pendingSyncs > 0 ? 'text-red-400' : 'text-on-background')}>
                {stats.pendingSyncs}
              </p>
            </div>
          </div>
        )}

        {/* Notification feed */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted">
              {items.length} notification{items.length !== 1 ? 's' : ''}
            </p>
            <button
              onClick={load}
              className="flex items-center gap-1.5 text-xs text-muted hover:text-on-background transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-muted" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Bell className="h-10 w-10 text-muted/40" />
              <p className="text-sm text-muted">No notifications right now</p>
              <p className="text-xs text-muted/60">New orders, return requests, and stock alerts will appear here.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map(item => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="flex items-start gap-3 border border-border bg-surface hover:bg-surface-elevated transition-colors p-4 group"
                >
                  {/* Icon */}
                  <div className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full', colorFor(item.type, item.urgent))}>
                    {iconFor(item.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-on-background">{item.title}</p>
                      {item.urgent && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-amber-600/20 text-amber-400">
                          <AlertTriangle className="h-2.5 w-2.5" />
                          Action needed
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted truncate">{item.subtitle}</p>
                    <p className="mt-1 text-[11px] text-muted/60">{relativeTime(item.time)}</p>
                  </div>

                  {/* Arrow */}
                  <ExternalLink className="h-4 w-4 text-muted shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </RBACGuard>
  )
}
