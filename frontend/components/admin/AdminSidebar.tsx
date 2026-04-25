'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  ShoppingCart,
  RotateCcw,
  RefreshCw,
  Bell,
  Users,
  LogOut,
  Settings,
  ScanBarcode,
  Image,
  Ticket,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { authApi } from '@/lib/api'
import { AdminSection } from '@/types/admin'
import { VamiLogo } from '@/components/shop/VamiLogo'

interface NavItem {
  label:   string
  href:    string
  icon:    React.ElementType
  section: AdminSection
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',   href: '/admin/dashboard',   icon: LayoutDashboard, section: 'dashboard'   },
  { label: 'Products',    href: '/admin/products',    icon: ShoppingBag,     section: 'products'    },
  { label: 'Inventory',   href: '/admin/inventory',   icon: Package,         section: 'inventory'   },
  { label: 'Orders',      href: '/admin/orders',      icon: ShoppingCart,    section: 'orders'      },
  { label: 'Returns',       href: '/admin/returns',       icon: RotateCcw,  section: 'returns'   },
  { label: 'Notifications', href: '/admin/notifications', icon: Bell,       section: 'dashboard' },
  { label: 'Banners',       href: '/admin/banners',       icon: Image,      section: 'dashboard' },
  { label: 'Coupons',       href: '/admin/coupons',       icon: Ticket,     section: 'dashboard' },
  { label: 'POS Sync',    href: '/admin/pos-sync',    icon: RefreshCw,       section: 'pos-sync'    },
  { label: 'POS Scanner', href: '/admin/pos-scanner', icon: ScanBarcode,     section: 'pos-scanner' },
  { label: 'Users',       href: '/admin/users',       icon: Users,           section: 'users'       },
  { label: 'Settings',    href: '/admin/settings',    icon: Settings,        section: 'dashboard'   },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const router   = useRouter()
  const { user, canAccess, logout } = useAuthStore()

  const visibleItems = NAV_ITEMS.filter((item) => canAccess(item.section))

  async function handleLogout() {
    try { await authApi.logout() } catch { /* ignore */ }
    logout()
    router.replace('/admin/login')
  }

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-border bg-surface">

      {/* ── Brand ── */}
      <div className="flex h-14 items-center gap-3 border-b border-border px-5">
        <VamiLogo size="sm" />
        <div className="h-4 w-px bg-border" />
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">Admin</p>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto py-3">
        <ul className="space-y-0.5 px-3">
          {visibleItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'group flex items-center gap-2.5 rounded-[8px] px-3 py-2 text-sm font-medium transition-all duration-150',
                    isActive
                      ? 'bg-on-background text-white'
                      : 'text-muted hover:bg-surface-elevated hover:text-on-background'
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {isActive && (
                    <span className="h-1.5 w-1.5 rounded-full bg-primary-light" />
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* ── User + logout ── */}
      <div className="border-t border-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-elevated text-xs font-bold text-on-background border border-border">
            {user?.name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-on-background">{user?.name ?? 'Admin'}</p>
            <p className="truncate text-[11px] text-muted capitalize">{user?.role?.toLowerCase()}</p>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-[8px] p-1.5 text-muted hover:bg-surface-elevated hover:text-on-background transition-colors"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
