// Server component — fetches the first page of products on the server so
// Googlebot receives real product cards in the initial HTML (avoids Soft 404).
// The interactive client component picks up filters/pagination after hydration.

import type { Metadata } from 'next'
import { serverProductsApi } from '@/lib/server-api'
import type { Product } from '@/types/product'
import ProductsPageClient from './ProductsPageClient'
import { CATEGORIES } from '@/lib/categories'

export const revalidate = 60

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.vamiclubwear.in'

const CATEGORY_LABELS: Record<string, string> = {
  ...Object.fromEntries(CATEGORIES.map((c) => [c.slug, c.label])),
  'big-size': 'Big Size',
}

interface PageProps {
  searchParams?: { category?: string; sort?: string; page?: string }
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const cat = searchParams?.category
  const label = (cat && CATEGORY_LABELS[cat]) || ''
  const title = label ? `${label} Collection` : 'All Collections'
  const description = label
    ? `Shop the ${label} collection at Vami Clubwear — premium Indo-Western fusion handcrafted in Manjeri, Kerala.`
    : 'Browse the complete Vami Clubwear catalog — Anarkalis, salwars, shararas, churidars, modest wear and bridal couture.'

  return {
    title,
    description,
    alternates: {
      canonical: cat ? `${SITE_URL}/products?category=${cat}` : `${SITE_URL}/products`,
    },
    openGraph: {
      type: 'website',
      title,
      description,
      url: cat ? `${SITE_URL}/products?category=${cat}` : `${SITE_URL}/products`,
    },
  }
}

export default async function ProductsPage({ searchParams }: PageProps) {
  const category = searchParams?.category ?? ''
  const sort     = searchParams?.sort     ?? 'newest'
  const page     = Number(searchParams?.page ?? '1') || 1

  let products: Product[] = []
  let total = 0
  let totalPages = 1
  try {
    const result = await serverProductsApi.list(
      {
        page,
        limit: 12,
        ...(category && { category }),
        isActive: 'true',
        ...(sort === 'price-asc'  && { sortBy: 'price', sortDir: 'asc'  }),
        ...(sort === 'price-desc' && { sortBy: 'price', sortDir: 'desc' }),
      },
      60,
    )
    products   = (result?.data ?? []) as Product[]
    total      = (result?.total      ?? products.length) as number
    totalPages = (result?.totalPages ?? 1) as number
  } catch {
    // Backend unreachable — client component will retry from the browser.
  }

  return (
    <ProductsPageClient
      initial={{ products, total, totalPages, category, sort, page }}
    />
  )
}
