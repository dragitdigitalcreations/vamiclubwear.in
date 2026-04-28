'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RotateCw } from 'lucide-react'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[admin] client exception:', error)
  }, [error])

  return (
    <div className="admin-theme flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-red-900/20">
          <AlertTriangle className="h-5 w-5 text-red-400" />
        </div>
        <h1 className="font-display text-xl font-semibold text-on-background">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm text-muted">
          {error?.message || 'An unexpected error occurred while loading the admin panel.'}
        </p>
        {error?.digest && (
          <p className="mt-1 text-[11px] text-muted/70">Ref: {error.digest}</p>
        )}

        <div className="mt-8 flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 bg-primary px-5 py-2.5 text-xs font-semibold uppercase tracking-widest text-white transition-opacity hover:opacity-90"
          >
            <RotateCw className="h-3.5 w-3.5" />
            Try again
          </button>
          <Link
            href="/admin/login"
            className="inline-flex items-center gap-2 border border-border bg-surface px-5 py-2.5 text-xs font-semibold uppercase tracking-widest text-on-background transition-colors hover:bg-surface-elevated"
          >
            Back to login
          </Link>
        </div>
      </div>
    </div>
  )
}
