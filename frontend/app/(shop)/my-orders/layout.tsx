import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'My Orders',
  robots: { index: false, follow: false, nocache: true },
}

export default function MyOrdersLayout({ children }: { children: React.ReactNode }) {
  return children
}
