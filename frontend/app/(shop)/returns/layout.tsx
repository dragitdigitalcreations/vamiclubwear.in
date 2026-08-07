import type { Metadata } from 'next'

// Client component page — metadata has to live in the layout. See
// contact/layout.tsx for why the inherited root canonical was a problem.
export const metadata: Metadata = {
  title: 'Returns & Exchanges',
  description:
    'Request a return or exchange for a Vami Clubwear order. Eligibility, timelines, refund method and how to raise a request with your order number.',
  alternates: { canonical: '/returns' },
}

export default function ReturnsLayout({ children }: { children: React.ReactNode }) {
  return children
}
