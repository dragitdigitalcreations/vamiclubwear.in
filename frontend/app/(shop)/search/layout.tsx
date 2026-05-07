import type { Metadata } from 'next'

// Internal site-search results — never useful in the index, and the page
// renders client-side so Googlebot sees almost no HTML on first paint.
// Tagging it noindex eliminates a Soft 404 source in Search Console.
export const metadata: Metadata = {
  title: 'Search',
  robots: { index: false, follow: true, nocache: true },
}

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return children
}
