import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Page Not Found',
  robots: { index: false, follow: true },
}

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background text-on-background flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-primary-light">404</p>
        <h1 className="mt-3 font-display text-4xl font-bold">Page not found</h1>
        <p className="mt-4 text-sm text-muted">
          The page you were looking for has moved, sold out, or never existed.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            href="/"
            className="bg-primary px-5 py-3 text-xs font-semibold uppercase tracking-widest text-white"
          >
            Go home
          </Link>
          <Link
            href="/products"
            className="border border-border px-5 py-3 text-xs font-semibold uppercase tracking-widest text-on-background"
          >
            Browse collections
          </Link>
        </div>
      </div>
    </div>
  )
}
