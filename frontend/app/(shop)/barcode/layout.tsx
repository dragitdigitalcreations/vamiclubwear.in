import type { Metadata } from 'next'

// In-store barcode lookup utility — not meant for public discovery.
export const metadata: Metadata = {
  title: 'Barcode Lookup',
  robots: { index: false, follow: false, nocache: true },
}

export default function BarcodeLayout({ children }: { children: React.ReactNode }) {
  return children
}
