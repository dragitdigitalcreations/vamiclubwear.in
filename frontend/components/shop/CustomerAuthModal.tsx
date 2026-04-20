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
        theme: 'filled_black',
        size:  'large',
        text:  'continue_with',
        shape: 'rectangular',
        logo_alignment: 'left',
        width: 320,
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
            className="relative w-full max-w-[420px] rounded-2xl bg-[#121212] px-8 py-12 text-white shadow-[0_24px_64px_rgba(0,0,0,0.55)]"
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0,  scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <button
              onClick={closePrompt}
              aria-label="Close"
              className="absolute right-5 top-5 text-white/40 transition-colors hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Logo — gold, via CSS mask */}
            <div className="flex justify-center" aria-label="Vami Clubwear">
              <span
                role="img"
                aria-label="Vami Clubwear"
                className="block h-14 w-32"
                style={{
                  backgroundColor: '#C4956A',
                  WebkitMaskImage: 'url(/logo.svg)',
                  maskImage: 'url(/logo.svg)',
                  WebkitMaskRepeat: 'no-repeat',
                  maskRepeat: 'no-repeat',
                  WebkitMaskPosition: 'center',
                  maskPosition: 'center',
                  WebkitMaskSize: 'contain',
                  maskSize: 'contain',
                }}
              />
            </div>

            {/* Heading */}
            <h2 className="mt-7 text-center font-display text-[30px] font-bold leading-tight tracking-tight text-white">
              Welcome Back!
            </h2>
            <p className="mt-3 text-center text-[14px] leading-relaxed text-white/65">
              {promptReason ?? 'Sign in to add items to your cart and complete your purchase'}
            </p>

            {/* Google button */}
            <div className="mt-8 flex flex-col items-center gap-3">
              {clientId ? (
                <div ref={btnRef} className="flex min-h-[44px] w-full items-center justify-center [&>div]:w-full [&_iframe]:!w-full" />
              ) : (
                <p className="text-[12px] text-red-400">
                  Google Sign-In not configured. Set <code>NEXT_PUBLIC_GOOGLE_CLIENT_ID</code>.
                </p>
              )}
              {loading && <p className="text-[11px] text-white/60">Signing you in…</p>}
              {error   && <p className="text-[11px] text-red-400">{error}</p>}
            </div>

            {/* Maybe later */}
            <button
              onClick={closePrompt}
              className="mt-5 w-full text-center text-[13px] text-white/60 transition-colors hover:text-white"
            >
              Maybe later
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
