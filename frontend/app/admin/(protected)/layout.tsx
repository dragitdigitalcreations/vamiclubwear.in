'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import { authApi } from '@/lib/api'
import { AdminSidebar } from '@/components/admin/AdminSidebar'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { token, isAuthenticated, logout } = useAuthStore()
  const router = useRouter()
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

  if (checking || !isAuthenticated) return null

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AdminSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
