'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { AdminSection, SECTION_ROLES } from '@/types/admin'

export type UserRole = 'ADMIN' | 'MANAGER' | 'STAFF'

export interface AdminUser {
  id:    string
  name:  string
  email: string
  role:  UserRole
}

interface AuthState {
  user:            AdminUser | null
  token:           string | null
  isAuthenticated: boolean

  setUser:    (user: AdminUser | null) => void
  setToken:   (token: string | null)   => void
  logout:     () => void

  hasRole:    (...roles: UserRole[]) => boolean
  isAdmin:    () => boolean
  canAccess:  (section: AdminSection) => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user:            null,
      token:           null,
      isAuthenticated: false,

      setUser:  (user)  => set({ user, isAuthenticated: !!user }),
      setToken: (token) => set({ token }),

      logout: () => set({ user: null, token: null, isAuthenticated: false }),

      hasRole: (...roles) => {
        const { user } = get()
        return !!user && roles.includes(user.role)
      },

      isAdmin: () => get().user?.role === 'ADMIN',

      canAccess: (section) => {
        const { user } = get()
        if (!user) return false
        return SECTION_ROLES[section].includes(user.role)
      },
    }),
    {
      name: 'vami-auth',
      // F4b transitional: we prefer the httpOnly cookie set by the backend,
      // but also persist the raw token so the frontend can attach
      // Authorization: Bearer <token> as a fallback. This is what unbreaks
      // production while the backend F4b rollout is still stabilising —
      // once every backend replica reliably sets the vami_admin cookie we
      // can drop `token` from persistence again.
      partialize: (s) => ({ user: s.user, token: s.token, isAuthenticated: s.isAuthenticated }),
    }
  )
)
