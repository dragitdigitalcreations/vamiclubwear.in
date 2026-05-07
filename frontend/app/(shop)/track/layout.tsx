import type { Metadata } from 'next'

// Order-tracking page is a client-rendered form keyed by order number — there
// is no public content for Google to index, so we mark it noindex to prevent
// Search Console flagging it as a Soft 404.
export const metadata: Metadata = {
  title: 'Track Your Order',
  robots: { index: false, follow: true, nocache: true },
}

export default function TrackLayout({ children }: { children: React.ReactNode }) {
  return children
}
