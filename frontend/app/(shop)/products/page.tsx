// Server component — fetches the first page of products on the server so
// Googlebot receives real product cards in the initial HTML (avoids Soft 404).
// The interactive client component picks up filters/pagination after hydration.

import type { Metadata } from 'next'
import { serverProductsApi } from '@/lib/server-api'
import type { Product } from '@/types/product'
import { getPrimaryImage } from '@/types/product'
import ProductsPageClient from './ProductsPageClient'
import { CATEGORIES } from '@/lib/categories'

export const revalidate = 60

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.vamiclubwear.in'

const CATEGORY_LABELS: Record<string, string> = {
  ...Object.fromEntries(CATEGORIES.map((c) => [c.slug, c.label])),
  'big-size': 'Big Size',
}

const CATEGORY_BLURBS: Record<string, string> = {
  'anarkali':       'Floor-grazing Anarkalis with intricate zari work, sheer dupattas and statement embroidery — handcrafted for festive evenings, mehndis and receptions, available up to XXXL.',
  'salwar':         'Festive salwar suits and salwar sets in maroon, navy, dark green velvet and Banarasi mul chanderi — sized L through XXXL.',
  'sharara-set':    'Three-piece sharara sets in georgette, chinon and mul cotton — modest, dramatic, designed to move.',
  'churidar-bit':   'Unstitched churidar fabric bits — premium Kerala-sourced cottons and silks, perfect for tailor-made fits.',
  'cotton-salwar':  'Everyday cotton salwars in modest cuts and breathable weaves — built for Kerala weather and full-day comfort.',
  'modest-wear':    'Floor-length gowns, short tops and abayas — modest silhouettes in lavender, off-white and timeless neutrals.',
  'pants':          'Indo-Western fusion pants — palazzos, shararas and tapered cuts in fabrics that drape beautifully.',
  'duppatta':       'Statement dupattas — sheer organza, hand-embroidered net, banarasi tissue — to elevate any salwar or anarkali.',
  'big-size':       'Plus-size Indo-Western fusion wear up to XXXL — Anarkalis, salwars, gowns and modest pieces designed to fit and flatter every body.',
}

const DEFAULT_BLURB =
  'Vami Clubwear is a Manjeri, Kerala–based label specialising in Indo-Western fusion wear, modest fashion and a dedicated big-size aesthetic collection for plus-size women. Every piece is handcrafted with attention to embroidery, fabric and fit — Anarkalis, salwars, shararas, churidars, gowns and dupattas, sized inclusively up to XXXL. Free shipping across India, online prepaid only.'

interface PageProps {
  searchParams?: { category?: string; sort?: string; page?: string }
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const cat = searchParams?.category
  const label = (cat && CATEGORY_LABELS[cat]) || ''
  const title = label ? `${label} Collection` : 'All Collections'
  const description = label
    ? `Shop the ${label} collection at Vami Clubwear — premium Indo-Western fusion handcrafted in Manjeri, Kerala.`
    : 'Browse the complete Vami Clubwear catalog — Anarkalis, salwars, shararas, churidars, modest wear and big-size aesthetic fashion for women up to XXXL.'

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
        limit: 15,
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

  const heading = (category && CATEGORY_LABELS[category]) || 'All Collections'
  const blurb   = (category && CATEGORY_BLURBS[category]) || DEFAULT_BLURB
  const canonicalUrl = category
    ? `${SITE_URL}/products?category=${category}`
    : `${SITE_URL}/products`

  // Breadcrumb structured data — helps Google show the page hierarchy in
  // search results and is a recognized fix for "Soft 404" on listing pages.
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home',     item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: 'Collections', item: `${SITE_URL}/products` },
      ...(category && CATEGORY_LABELS[category]
        ? [{ '@type': 'ListItem', position: 3, name: CATEGORY_LABELS[category], item: canonicalUrl }]
        : []),
    ],
  }

  // ItemList structured data — surfaces the listing as a real product list
  // so Google understands this isn't a "thin" page even when JS hasn't run.
  const itemListJsonLd = products.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: heading,
    numberOfItems: products.length,
    itemListElement: products.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${SITE_URL}/products/${p.slug}`,
      name: p.name,
      image: getPrimaryImage(p) ?? undefined,
    })),
  } : null

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      {itemListJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
        />
      )}

      {/* Server-rendered SEO copy — gives Googlebot crawlable text content
          even before client-side hydration. Hidden visually on the live page
          via `sr-only` so the visual design stays untouched. */}
      <div className="sr-only" aria-hidden="false">
        <h1>{heading} — Vami Clubwear</h1>
        <p>{blurb}</p>
        {products.length > 0 && (
          <ul>
            {products.map((p) => (
              <li key={p.id}>
                <a href={`${SITE_URL}/products/${p.slug}`}>
                  {p.name} — {p.category?.name} — ₹{Number(p.basePrice).toLocaleString('en-IN')}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ProductsPageClient
        initial={{ products, total, totalPages, category, sort, page }}
      />
    </>
  )
}
