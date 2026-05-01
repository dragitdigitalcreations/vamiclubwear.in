'use client'

// Per-section error boundary for the entire authenticated admin shell.
// Catches any render-time exception thrown by an admin page (e.g. an unguarded
// null deref, a thrown ApiError that escapes a missing try/catch, a bad import)
// and shows a clean retry panel with the error detail — so a single page crash
// never produces a blank screen or kicks the admin out of the dashboard.
//
// Why here (not just app/admin/error.tsx): scoping it inside (protected) means
// reset() re-runs only the page subtree, keeping the sidebar + auth state
// intact. The outer admin/error.tsx remains as the last-resort boundary for
// failures that occur higher up (layout, RBAC, auth check).

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RotateCw, Home } from 'lucide-react'

export default function ProtectedAdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[admin/protected] page exception:', error)
  }, [error])

  return (
    <div className="admin-theme flex min-h-full flex-1 items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-red-900/20">
          <AlertTriangle className="h-5 w-5 text-red-400" />
        </div>
        <h1 className="font-display text-xl font-semibold text-on-background">
          This page failed to load
        </h1>
        <p className="mt-2 text-sm text-muted">
          {error?.message || 'An unexpected error occurred while rendering this page.'}
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
            href="/admin/dashboard"
            className="inline-flex items-center gap-2 border border-border bg-surface px-5 py-2.5 text-xs font-semibold uppercase tracking-widest text-on-background transition-colors hover:bg-surface-elevated"
          >
            <Home className="h-3.5 w-3.5" />
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
