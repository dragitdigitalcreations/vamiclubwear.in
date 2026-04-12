'use client'

import { useState } from 'react'
import { Eye, EyeOff, KeyRound, Loader2 } from 'lucide-react'
import { authApi } from '@/lib/api'

export default function SettingsPage() {
  const [current,  setCurrent]  = useState('')
  const [next,     setNext]     = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [showPwd,  setShowPwd]  = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [success,  setSuccess]  = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (next !== confirm) { setError('New passwords do not match'); return }
    if (next.length < 8)  { setError('New password must be at least 8 characters'); return }

    setLoading(true)
    try {
      await authApi.changePassword(current, next)
      setSuccess('Password updated successfully')
      setCurrent(''); setNext(''); setConfirm('')
    } catch (err: any) {
      setError(err.message ?? 'Failed to update password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 md:p-10 max-w-lg">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-on-background">Settings</h1>
        <p className="mt-1 text-sm text-muted">Manage your admin account</p>
      </div>

      <div className="border border-border bg-surface p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center bg-primary/10">
            <KeyRound className="h-4 w-4 text-primary-light" />
          </div>
          <div>
            <p className="text-sm font-semibold text-on-background">Change Password</p>
            <p className="text-xs text-muted">Use a strong password you haven't used elsewhere</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { label: 'Current Password', value: current, set: setCurrent },
            { label: 'New Password',     value: next,    set: setNext    },
            { label: 'Confirm New Password', value: confirm, set: setConfirm },
          ].map(({ label, value, set }) => (
            <div key={label}>
              <label className="block text-xs font-medium uppercase tracking-widest text-muted mb-1.5">
                {label}
              </label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  className="w-full border border-border bg-transparent px-3 py-2.5 pr-10 text-sm text-on-background placeholder:text-muted outline-none focus:border-on-background transition-colors"
                  disabled={loading}
                  required
                />
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={() => setShowPwd(!showPwd)}
            className="flex items-center gap-1.5 text-xs text-muted hover:text-on-background transition-colors"
          >
            {showPwd ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {showPwd ? 'Hide passwords' : 'Show passwords'}
          </button>

          {error   && <p className="text-xs text-red-400">{error}</p>}
          {success && <p className="text-xs text-green-400">{success}</p>}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 bg-primary py-2.5 text-xs font-semibold uppercase tracking-widest text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Updating…</> : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  )
}
