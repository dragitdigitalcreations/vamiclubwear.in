'use client'

import { useAuthStore } from '@/stores/authStore'
import { AdminSection, UserRole } from '@/types/admin'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

interface RBACGuardProps {
  children: React.ReactNode
  /** Required section — checks SECTION_ROLES mapping */
  section?: AdminSection
  /** Or pass explicit allowed roles directly */
  roles?: UserRole[]
  /** Where to redirect if access is denied (default: '/') */
  redirectTo?: string
  /** Render a fallback instead of redirecting */
  fallback?: React.ReactNode
}

/**
 * Wraps content that should only be visible to authorised roles.
 * Usage (route-level):  <RBACGuard section="pos-sync"> ... </RBACGuard>
 * Usage (inline):       <RBACGuard roles={['ADMIN']}><DeleteButton /></RBACGuard>
 */
export function RBACGuard({
  children,
  section,
  roles,
  redirectTo = '/',
  fallback = null,
}: RBACGuardProps) {
  const { isAuthenticated, canAccess, hasRole } = useAuthStore()
  const router = useRouter()

  const allowed = (() => {
    if (!isAuthenticated) return false
    if (section) return canAccess(section)
    if (roles) return hasRole(...roles)
    return true
  })()

  useEffect(() => {
    if (!allowed && !fallback) {
      router.replace(redirectTo)
    }
  }, [allowed, fallback, redirectTo, router])

  if (!allowed) return <>{fallback}</>
  return <>{children}</>
}
