'use client'

import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useCustomerAuthStore } from '@/stores/customerAuthStore'
import { customerAuthApi } from '@/lib/api'

/**
 * Google Sign-In modal. Opened via useCustomerAuthStore().openPrompt().
 * Loads the Google Identity Services script once, renders the official
 * button, and on credential callback exchanges the ID token with our
 * backend for a JWT session.
 */
export function CustomerAuthModal() {
  const promptOpen   = useCustomerAuthStore((s) => s.promptOpen)
  const promptReason = useCustomerAuthStore((s) => s.promptReason)
  const closePrompt  = useCustomerAuthStore((s) => s.closePrompt)
  const setSession   = useCustomerAuthStore((s) => s.setSession)

  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const btnRef = useRef<HTMLDivElement>(null)

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

  // Load the GIS script once.
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (document.getElementById('google-identity-script')) return
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.async = true
    s.defer = true
    s.id = 'google-identity-script'
    document.head.appendChild(s)
  }, [])

  // Initialise + render when the modal opens and clientId is set.
  useEffect(() => {
    if (!promptOpen || !clientId) return
    let cancelled = false

    const init = () => {
      const g = (window as any).google
      if (!g?.accounts?.id || !btnRef.current || cancelled) {
        setTimeout(init, 150)
        return
      }
      g.accounts.id.initialize({
        client_id: clientId,
        callback: async (response: { credential: string }) => {
          try {
            setLoading(true)
            setError(null)
            const { token, user } = await customerAuthApi.google(response.credential)
            setSession(user, token)
          } catch (err: any) {
            setError(err?.message ?? 'Sign-in failed. Please try again.')
          } finally {
            setLoading(false)
          }
        },
        ux_mode: 'popup',
        auto_select: false,
      })
      btnRef.current.innerHTML = ''
      g.accounts.id.renderButton(btnRef.current, {
        type:  'standard',
        theme: 'outline',
        size:  'large',
        text:  'signin_with',
        shape: 'rectangular',
        logo_alignment: 'left',
        width: 300,
      })
    }
    init()

    return () => { cancelled = true }
  }, [promptOpen, clientId, setSession])

  return (
    <AnimatePresence>
      {promptOpen && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closePrompt}
        >
          <motion.div
            className="relative w-full max-w-[400px] rounded-lg bg-[#121212] px-7 py-10 text-white shadow-2xl"
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0,  scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <button
              onClick={closePrompt}
              aria-label="Close"
              className="absolute right-4 top-4 text-white/50 transition-colors hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/50">
              Vami Clubwear
            </p>
            <h2 className="mt-2 font-display text-2xl">Sign in to continue</h2>
            <p className="mt-3 text-[13px] leading-relaxed text-white/65">
              {promptReason ?? 'Sign in with your Google account to save your cart, track orders, and personalize your profile.'}
            </p>

            <div className="mt-7 flex flex-col items-center gap-3">
              {clientId ? (
                <div ref={btnRef} className="flex min-h-[44px] items-center justify-center" />
              ) : (
                <p className="text-[12px] text-red-400">
                  Google Sign-In not configured. Set <code>NEXT_PUBLIC_GOOGLE_CLIENT_ID</code>.
                </p>
              )}
              {loading && <p className="text-[11px] text-white/60">Signing you in…</p>}
              {error   && <p className="text-[11px] text-red-400">{error}</p>}
            </div>

            <p className="mt-8 text-center text-[10px] leading-relaxed text-white/40">
              By continuing you agree to our Terms and acknowledge the Privacy Policy.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
