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
      // F4b: token no longer persists to localStorage — the browser stores
      // it as an httpOnly cookie set by the backend, out of reach of any XSS.
      // We keep `user` cached so the UI doesn't flash "signed out" on every
      // reload while the cookie-backed session is still valid.
      partialize: (s) => ({ user: s.user, isAuthenticated: s.isAuthenticated }),
    }
  )
)
