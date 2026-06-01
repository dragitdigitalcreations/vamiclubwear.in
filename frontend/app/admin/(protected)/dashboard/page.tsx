'use client'

import { useEffect, useState } from 'react'
import { ShoppingBag, ShoppingCart, Package, AlertTriangle } from 'lucide-react'
import { AdminHeader } from '@/components/admin/AdminHeader'
import { StatsCard }   from '@/components/admin/StatsCard'
import { SalesChart }  from '@/components/admin/SalesChart'
import { LiveUsersCard } from '@/components/admin/LiveUsersCard'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { statsApi }    from '@/lib/api'
import type { DashboardStats, SalesDataPoint, StatsRange } from '@/types/admin'

const EMPTY_STATS: DashboardStats = {
  totalRevenue: 0, revenueChange: 0,
  totalOrders:  0, ordersChange:  0,
  activeProducts: 0, lowStockItems: 0, pendingSyncs: 0,
}

const RANGE_OPTIONS: { value: StatsRange; label: string; cardSuffix: string; chartDays: number }[] = [
  { value: '7d',  label: 'Last 7 days',   cardSuffix: '(7d)',  chartDays: 7   },
  { value: '30d', label: 'Last 30 days',  cardSuffix: '(30d)', chartDays: 30  },
  { value: '90d', label: 'Last 90 days',  cardSuffix: '(90d)', chartDays: 90  },
  { value: '1y',  label: 'Last 12 months', cardSuffix: '(1y)', chartDays: 365 },
  { value: 'all', label: 'All time',      cardSuffix: '(all)', chartDays: 365 },
]

export default function DashboardPage() {
  const [range,     setRange]     = useState<StatsRange>('30d')
  const [stats,     setStats]     = useState<DashboardStats>(EMPTY_STATS)
  const [salesData, setSalesData] = useState<SalesDataPoint[]>([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState<string | null>(null)

  useEffect(() => {
    const opt = RANGE_OPTIONS.find((r) => r.value === range)!
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const [s, sales] = await Promise.all([
          statsApi.getSummary(range),
          statsApi.getSalesChart(opt.chartDays),
        ])
        setStats(s)
        setSalesData(sales)
      } catch (err: any) {
        setError(err.message ?? 'Failed to load dashboard data')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [range])

  const opt    = RANGE_OPTIONS.find((r) => r.value === range)!
  const suffix = opt.cardSuffix

  return (
    <>
      <AdminHeader title="Dashboard" subtitle={`Website sales — ${opt.label.toLowerCase()}`} />

      <div className="p-6 space-y-6">

        {error && (
          <div className="border border-red-700/40 bg-red-900/20 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Filter row */}
        <div className="flex items-center justify-end">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted">
              Time range
            </span>
            <Select value={range} onValueChange={(v) => setRange(v as StatsRange)}>
              <SelectTrigger className="h-9 w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RANGE_OPTIONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <LiveUsersCard />
          <StatsCard
            title={`Revenue ${suffix}`}
            value={stats.totalRevenue}
            prefix="₹"
            change={stats.revenueChange ?? undefined}
            icon={ShoppingBag}
          />
          <StatsCard
            title={`Orders ${suffix}`}
            value={stats.totalOrders}
            change={stats.ordersChange ?? undefined}
            icon={ShoppingCart}
          />
          <StatsCard
            title="Active Products"
            value={stats.activeProducts}
            icon={Package}
          />
          <StatsCard
            title="Low Stock Alerts"
            value={stats.lowStockItems}
            positiveIsGood={false}
            icon={AlertTriangle}
          />
        </div>

        {/* Sales Chart */}
        {!loading && <SalesChart data={salesData} />}

      </div>
    </>
  )
}
