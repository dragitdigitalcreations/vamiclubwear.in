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
  token:  string | null   // volatile; not persisted — see partialize

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

      setSession: (user, token) => {
        // token is retained in-memory for the current tab only. On refresh
        // it's gone from JS but the httpOnly cookie the backend set carries
        // the session forward — the store rehydrates `user` from
        // localStorage and calls that "signed in".
        set({ user, token, promptOpen: false, promptReason: null })
      },
      logout:     ()            => set({ user: null, token: null }),

      // The httpOnly session cookie is the source of truth for "is signed
      // in"; the UI trusts the persisted `user` as a hint until a request
      // 401s and clears it.
      isAuthenticated: () => !!get().user,
    }),
    {
      name: 'vami-customer-auth',
      // F4b transitional: prefer the httpOnly cookie the backend sets, but
      // also persist the raw JWT so lib/api.ts customerRequest() can attach
      // Authorization: Bearer as a fallback. Once every backend replica is
      // reliably setting the vami_customer cookie we can drop `token` from
      // persistence again.
      partialize: (s) => ({ user: s.user, token: s.token }),
    },
  ),
)
