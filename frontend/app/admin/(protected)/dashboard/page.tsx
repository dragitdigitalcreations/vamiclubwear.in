'use client'

import { useEffect, useState } from 'react'
import { ShoppingBag, ShoppingCart, Package, AlertTriangle } from 'lucide-react'
import { AdminHeader } from '@/components/admin/AdminHeader'
import { StatsCard } from '@/components/admin/StatsCard'
import { SalesChart } from '@/components/admin/SalesChart'
import { PosSyncLog } from '@/components/admin/PosSyncLog'
import { statsApi, posSyncApi } from '@/lib/api'
import type { DashboardStats, SalesDataPoint, PosSyncEntry } from '@/types/admin'

// ── Mock data (replace with real API calls once backend routes are live) ─────
function mockStats(): DashboardStats {
  return {
    totalRevenue:   284500,
    revenueChange:  12.4,
    totalOrders:    38,
    ordersChange:   8.1,
    activeProducts: 24,
    lowStockItems:  3,
    pendingSyncs:   0,
  }
}

function mockSalesData(): SalesDataPoint[] {
  const days = 30
  return Array.from({ length: days }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (days - 1 - i))
    return {
      date: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      revenue: Math.floor(5000 + Math.random() * 15000),
      orders: Math.floor(1 + Math.random() * 6),
    }
  })
}

function mockSyncEntries(): PosSyncEntry[] {
  return [
    { id: '1', source: 'ZOHO',  status: 'SUCCESS', rowsAffected: 12, errorMessage: null, createdAt: new Date(Date.now() - 1000 * 60 * 8).toISOString(),  processedAt: new Date().toISOString() },
    { id: '2', source: 'TALLY', status: 'SUCCESS', rowsAffected: 5,  errorMessage: null, createdAt: new Date(Date.now() - 1000 * 60 * 65).toISOString(), processedAt: new Date().toISOString() },
    { id: '3', source: 'ZOHO',  status: 'FAILED',  rowsAffected: null, errorMessage: 'Invalid HMAC signature', createdAt: new Date(Date.now() - 1000 * 60 * 140).toISOString(), processedAt: null },
    { id: '4', source: 'TALLY', status: 'SKIPPED', rowsAffected: 0, errorMessage: null, createdAt: new Date(Date.now() - 1000 * 60 * 200).toISOString(), processedAt: new Date().toISOString() },
  ]
}
// ─────────────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [stats,       setStats]       = useState<DashboardStats | null>(null)
  const [salesData,   setSalesData]   = useState<SalesDataPoint[]>([])
  const [syncEntries, setSyncEntries] = useState<PosSyncEntry[]>([])
  const [loading,     setLoading]     = useState(true)

  useEffect(() => {
    // Try real API, fall back to mock data during dev
    const load = async () => {
      try {
        const [s, sales, syncs] = await Promise.all([
          statsApi.getSummary(),
          statsApi.getSalesChart(30),
          posSyncApi.list(1, 10),
        ])
        setStats(s)
        setSalesData(sales)
        setSyncEntries(syncs.data)
      } catch {
        setStats(mockStats())
        setSalesData(mockSalesData())
        setSyncEntries(mockSyncEntries())
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <>
      <AdminHeader title="Dashboard" subtitle="Vami Clubwear sales overview" />

      <div className="p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatsCard
            title="Revenue (30d)"
            value={stats?.totalRevenue ?? 0}
            prefix="₹"
            change={stats?.revenueChange}
            icon={ShoppingBag}
          />
          <StatsCard
            title="Orders (30d)"
            value={stats?.totalOrders ?? 0}
            change={stats?.ordersChange}
            icon={ShoppingCart}
          />
          <StatsCard
            title="Active Products"
            value={stats?.activeProducts ?? 0}
            icon={Package}
          />
          <StatsCard
            title="Low Stock Alerts"
            value={stats?.lowStockItems ?? 0}
            positiveIsGood={false}
            icon={AlertTriangle}
          />
        </div>

        {/* Sales Chart */}
        {!loading && <SalesChart data={salesData} />}

        {/* Recent POS Syncs */}
        <PosSyncLog entries={syncEntries} isLoading={loading} />
      </div>
    </>
  )
}
