'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Customer {
  id:      string
  email:   string
  name:    string
  picture: string | null
}

interface CustomerAuthState {
  user:   Customer | null
  token:  string | null

  // login prompt (modal) — shown when a gated action is attempted unauthenticated
  promptOpen:    boolean
  promptReason:  string | null
  openPrompt:    (reason?: string) => void
  closePrompt:   () => void

  setSession:    (user: Customer, token: string) => void
  logout:        () => void

  isAuthenticated: () => boolean
}

export const useCustomerAuthStore = create<CustomerAuthState>()(
  persist(
    (set, get) => ({
      user:  null,
      token: null,

      promptOpen:   false,
      promptReason: null,
      openPrompt:   (reason) => set({ promptOpen: true, promptReason: reason ?? null }),
      closePrompt:  ()       => set({ promptOpen: false, promptReason: null }),

      setSession: (user, token) => set({ user, token, promptOpen: false, promptReason: null }),
      logout:     ()            => set({ user: null, token: null }),

      isAuthenticated: () => !!get().token && !!get().user,
    }),
    {
      name: 'vami-customer-auth',
      partialize: (s) => ({ user: s.user, token: s.token }),
    },
  ),
)
