'use client'

import { Bell, Search } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { Badge } from '@/components/ui/badge'

interface AdminHeaderProps {
  title: string
  subtitle?: string
}

export function AdminHeader({ title, subtitle }: AdminHeaderProps) {
  const { isAdmin } = useAuthStore()

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-surface px-6">
      <div>
        <h1 className="font-display text-lg font-semibold text-on-background">{title}</h1>
        {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
          <input
            type="search"
            placeholder="Search products, orders..."
            className="h-8 w-64 rounded-md border border-border bg-input pl-9 pr-3 text-sm text-on-background placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {/* Notifications (admin only) */}
        {isAdmin() && (
          <button className="relative rounded-md p-2 text-muted hover:bg-surface-elevated hover:text-on-background transition-colors">
            <Bell className="h-4 w-4" />
            {/* Unread indicator */}
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" />
          </button>
        )}

        {/* Role indicator badge */}
        <Badge variant="outline" className="hidden md:flex text-xs">
          {useAuthStore.getState().user?.role?.toLowerCase() ?? 'guest'}
        </Badge>
      </div>
    </header>
  )
}
