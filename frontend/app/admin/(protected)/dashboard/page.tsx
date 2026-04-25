'use client'

import { useEffect, useState } from 'react'
import { ShoppingBag, ShoppingCart, Package, AlertTriangle } from 'lucide-react'
import { AdminHeader } from '@/components/admin/AdminHeader'
import { StatsCard }   from '@/components/admin/StatsCard'
import { SalesChart }  from '@/components/admin/SalesChart'
import { LiveUsersCard } from '@/components/admin/LiveUsersCard'
import { statsApi }    from '@/lib/api'
import type { DashboardStats, SalesDataPoint } from '@/types/admin'

const EMPTY_STATS: DashboardStats = {
  totalRevenue: 0, revenueChange: 0,
  totalOrders:  0, ordersChange:  0,
  activeProducts: 0, lowStockItems: 0, pendingSyncs: 0,
}

export default function DashboardPage() {
  const [stats,     setStats]     = useState<DashboardStats>(EMPTY_STATS)
  const [salesData, setSalesData] = useState<SalesDataPoint[]>([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const [s, sales] = await Promise.all([
          statsApi.getSummary(),
          statsApi.getSalesChart(30),
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
  }, [])

  return (
    <>
      <AdminHeader title="Dashboard" subtitle="Website sales — last 30 days" />

      <div className="p-6 space-y-6">

        {error && (
          <div className="border border-red-700/40 bg-red-900/20 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <LiveUsersCard />
          <StatsCard
            title="Revenue (30d)"
            value={stats.totalRevenue}
            prefix="₹"
            change={stats.revenueChange}
            icon={ShoppingBag}
          />
          <StatsCard
            title="Orders (30d)"
            value={stats.totalOrders}
            change={stats.ordersChange}
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
