import type { Metadata } from 'next'

// User-specific page — empty for unauthenticated visitors. Keep out of index.
export const metadata: Metadata = {
  title: 'Cart',
  robots: { index: false, follow: false, nocache: true },
}

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return children
}
