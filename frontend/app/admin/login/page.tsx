'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Loader2, Eye, EyeOff, Lock } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { authApi } from '@/lib/api'
import { toast } from '@/stores/toastStore'

export default function AdminLoginPage() {
  const router    = useRouter()
  const { setUser, setToken } = useAuthStore()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPwd,  setShowPwd]  = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!email || !password) { setError('Email and password are required'); return }

    setLoading(true)
    try {
      const { token, user } = await authApi.login(email, password)
      setToken(token)
      setUser({ id: user.id, name: user.name, email: user.email, role: user.role })
      router.replace('/admin/dashboard')
    } catch (err: any) {
      setError(err.message ?? 'Login failed')
      toast.error('Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="mb-10 text-center">
          <p className="font-display text-3xl font-bold tracking-[0.2em] text-on-background uppercase">
            Vami
          </p>
          <p className="mt-1 text-xs uppercase tracking-widest text-muted">Admin Panel</p>
        </div>

        <div className="border border-border bg-surface p-8">
          <div className="mb-6 flex h-10 w-10 items-center justify-center bg-primary/10">
            <Lock className="h-4 w-4 text-primary-light" />
          </div>

          <h1 className="font-display text-xl font-semibold text-on-background">Sign in</h1>
          <p className="mt-1 text-xs text-muted">Enter your admin credentials to continue</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-medium uppercase tracking-widest text-muted mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@vami.in"
                autoComplete="email"
                className="w-full border border-border bg-transparent px-3 py-2.5 text-sm text-on-background placeholder:text-muted outline-none focus:border-on-background transition-colors"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-widest text-muted mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full border border-border bg-transparent px-3 py-2.5 pr-10 text-sm text-on-background placeholder:text-muted outline-none focus:border-on-background transition-colors"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-on-background transition-colors"
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-400">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 bg-primary py-3 text-xs font-semibold uppercase tracking-widest text-white transition-opacity hover:opacity-90 disabled:opacity-50 mt-2"
            >
              {loading ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Signing in…</> : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-muted">
          Vami Clubwear · Manjeri, Kerala
        </p>
      </motion.div>
    </div>
  )
}
