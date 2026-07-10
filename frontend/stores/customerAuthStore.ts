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

// Non-sensitive "the browser thinks it's signed in" marker. The real JWT stays
// in localStorage; this cookie exists purely so middleware.ts can decide
// server-side whether to redirect gated routes to the login prompt instead
// of rendering an empty auth wall. Forging it grants zero access — all data
// APIs still verify the bearer token independently.
const SESSION_COOKIE = 'vami-cust-session'

function setSessionCookie() {
  if (typeof document === 'undefined') return
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  // 30 days matches typical session lifetime; refreshed on every setSession.
  document.cookie = `${SESSION_COOKIE}=1; Path=/; Max-Age=${60 * 60 * 24 * 30}; SameSite=Lax${secure}`
}

function clearSessionCookie() {
  if (typeof document === 'undefined') return
  document.cookie = `${SESSION_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`
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
        setSessionCookie()
        set({ user, token, promptOpen: false, promptReason: null })
      },
      logout:     ()            => {
        clearSessionCookie()
        set({ user: null, token: null })
      },

      isAuthenticated: () => !!get().token && !!get().user,
    }),
    {
      name: 'vami-customer-auth',
      partialize: (s) => ({ user: s.user, token: s.token }),
      // Rehydrate the presence cookie on page load so a returning visitor
      // whose localStorage token survived (but cookie expired / was cleared)
      // still gets past middleware without re-authing.
      onRehydrateStorage: () => (state) => {
        if (state?.token && state?.user) setSessionCookie()
      },
    },
  ),
)
