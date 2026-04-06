'use client'

import { useEffect, useState, useCallback } from 'react'
import { AdminHeader } from '@/components/admin/AdminHeader'
import { PosSyncLog } from '@/components/admin/PosSyncLog'
import { RBACGuard } from '@/components/admin/RBACGuard'
import { StatsCard } from '@/components/admin/StatsCard'
import { posSyncApi } from '@/lib/api'
import type { PosSyncEntry } from '@/types/admin'
import { CheckCircle2, XCircle, RefreshCw } from 'lucide-react'

export default function PosSyncPage() {
  const [entries, setEntries] = useState<PosSyncEntry[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await posSyncApi.list(1, 100)
      setEntries(res.data)
    } catch {
      // Mock data fallback
      setEntries([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const successCount = entries.filter((e) => e.status === 'SUCCESS').length
  const failedCount  = entries.filter((e) => e.status === 'FAILED').length
  const pendingCount = entries.filter((e) => e.status === 'PENDING').length

  return (
    <RBACGuard section="pos-sync" redirectTo="/admin/dashboard">
      <AdminHeader
        title="POS Sync Monitor"
        subtitle="Tally & Zoho inventory webhook events"
      />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <StatsCard title="Successful Syncs" value={successCount} icon={CheckCircle2} />
          <StatsCard title="Failed Syncs" value={failedCount} positiveIsGood={false} icon={XCircle} />
          <StatsCard title="Pending" value={pendingCount} icon={RefreshCw} />
        </div>
        <PosSyncLog entries={entries} isLoading={loading} onRefresh={load} />
      </div>
    </RBACGuard>
  )
}
