import type { Metadata } from 'next'

// Per-order confirmation screen — content only exists for the buyer who just
// checked out, and the URL carries an order reference. It was previously
// indexable (index, follow) with a canonical pointing at the homepage.
export const metadata: Metadata = {
  title: 'Order Confirmed',
  robots: { index: false, follow: false, nocache: true },
}

export default function OrderConfirmedLayout({ children }: { children: React.ReactNode }) {
  return children
}
