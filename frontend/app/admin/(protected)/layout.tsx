'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import { authApi } from '@/lib/api'
import { AdminSidebar } from '@/components/admin/AdminSidebar'

const STAFF_HOME = '/admin/pos-scanner-mobile'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { token, user, isAuthenticated, logout } = useAuthStore()
  const router   = useRouter()
  const pathname = usePathname()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    if (!token) {
      router.replace('/admin/login')
      setChecking(false)
      return
    }

    authApi.me()
      .then(() => setChecking(false))
      .catch(() => {
        logout()
        router.replace('/admin/login')
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // STAFF accounts may only see the mobile POS scanner. If they hit any other
  // admin URL, bounce them. Runs after auth is verified so we don't ping-pong.
  useEffect(() => {
    if (checking || !isAuthenticated) return
    if (user?.role === 'STAFF' && pathname !== STAFF_HOME) {
      router.replace(STAFF_HOME)
    }
  }, [checking, isAuthenticated, user?.role, pathname, router])

  if (checking || !isAuthenticated) return null

  // Sidebar-less, full-bleed shell for STAFF — no nav, no chrome competing
  // with the scan input on a small phone screen.
  if (user?.role === 'STAFF') {
    return (
      <div className="admin-theme h-screen overflow-hidden bg-background">
        <main className="h-full overflow-y-auto">{children}</main>
      </div>
    )
  }

  return (
    <div className="admin-theme flex h-screen overflow-hidden bg-background">
      <AdminSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
