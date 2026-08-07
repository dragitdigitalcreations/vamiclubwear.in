// Product detail — Server Component with ISR (revalidates every hour)
// Data is fetched server-side → no loading spinner on first paint
// Client interactivity (gallery, variants, cart) handled in ProductDetailClient

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ApiNotFoundError, listAllActiveProducts, serverProductsApi } from '@/lib/server-api'
import { getAvailableStock, getPrimaryDetailImage, mediaDetail, type Product } from '@/types/product'
import {
  buildProductCopy,
  buildProductDescription,
  buildProductDisplayName,
  buildProductTitle,
  getProductFacets,
} from '@/lib/product-seo'
import { ProductDetailClient } from './ProductDetailClient'

// ISR: revalidate every 30 min during pre-launch to keep Neon CU-hours under
// the free-tier ceiling. Checkout still re-validates inventory server-side,
// so stale ISR cannot cause overselling. Tighten to 30-60s post-launch.
export const revalidate = 1800

interface PageProps {
  params: Promise<{ slug: string }>
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.vamiclubwear.in'

// Prerender the live catalog so Googlebot is served cache hits instead of a
// cold render per URL, and so `notFound()` on an unknown slug resolves to a
// real 404 rather than a 200 that Search Console files as a Soft 404.
// `dynamicParams` stays at its default (true), so products added after a
// deploy still render on demand and are picked up by the next revalidation.
export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  try {
    const products = await listAllActiveProducts(3600)
    return products.map((p) => ({ slug: p.slug }))
  } catch {
    // Backend unreachable at build time — fall back to fully on-demand
    // rendering rather than failing the build.
    return []
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params

  let product: Product
  try {
    product = await serverProductsApi.getBySlug(slug)
  } catch (err) {
    // A positive 404 from the backend means this product genuinely does not
    // exist. Calling notFound() here (rather than in the page body) is what
    // makes Next emit an actual 404 status: metadata is resolved before the
    // HTML shell is flushed, so the status line is still ours to set. Doing it
    // only in the page component produced a 200 + "Page not found" body, which
    // is exactly the Soft 404 Search Console was reporting.
    if (err instanceof ApiNotFoundError) notFound()
    // Anything else is a transient backend failure — rethrow so the request
    // 500s and Google retries, instead of permanently dropping a live URL.
    throw err
  }

  // Stage 50.2 — prefer Retaqo's pre-built `delivery.detail` (~1200px,
  // q_auto + f_auto) for OpenGraph + Twitter card images; falls back to
  // the raw url for legacy Vami-sourced products. OG images get scraped
  // and re-cached aggressively, so serving an already-optimized URL
  // cuts bandwidth without changing the link preview.
  const imageUrl = getPrimaryDetailImage(product as Pick<Product, 'media'>) ?? undefined

  // The POS supplies a bare garment type as `name` ("ANARKALI") and an empty
  // `description`, which used to yield a dozen identical titles and no meta
  // description at all. Derive both from the variant attributes instead.
  const title = buildProductTitle(product)
  const description = buildProductDescription(product)
  const displayName = buildProductDisplayName(product)

  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/products/${slug}` },
    openGraph: {
      type: 'website',
      title,
      description,
      url: `${SITE_URL}/products/${slug}`,
      ...(imageUrl && { images: [{ url: imageUrl, width: 900, height: 1200, alt: displayName }] }),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(imageUrl && { images: [imageUrl] }),
    },
  }
}

function buildProductJsonLd(product: any, displayName: string, description: string) {
  // Stage 50.2 — JSON-LD image array also prefers Retaqo's detail-size
  // delivery URL when available (Google's product-rich-result harvester
  // re-fetches these, so optimized URLs save bandwidth on the shared
  // db6tinunf Cloudinary cloud).
  const imageUrls = (product.media ?? [])
    .filter((m: any) => m.type === 'IMAGE')
    .map((m: any) => mediaDetail(m))

  const activeVariants = (product.variants ?? []).filter((v: any) => v.isActive)
  const prices = activeVariants.map((v: any) => Number(v.price)).filter((n: number) => Number.isFinite(n))
  const minPrice = prices.length ? Math.min(...prices) : Number(product.basePrice ?? 0)
  const maxPrice = prices.length ? Math.max(...prices) : Number(product.basePrice ?? 0)
  const inStock = activeVariants.some((v: any) => getAvailableStock(v) > 0)

  const facets = getProductFacets(product as Product)

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    // Derived name + description, matching the <title>/<h1> on the page —
    // a Product node whose name is "ANARKALI" on a dozen URLs is what made
    // Google treat these as duplicates in the first place.
    name: displayName,
    description,
    image: imageUrls,
    sku: activeVariants[0]?.sku,
    ...(product.barcode && { productID: String(product.barcode) }),
    brand: { '@type': 'Brand', name: 'Vami Clubwear' },
    category: product.category?.name,
    ...(facets.colors.length && { color: facets.colors.join(', ') }),
    ...(facets.fabrics.length && { material: facets.fabrics.join(', ') }),
    ...(facets.sizes.length && { size: facets.sizes }),
    audience: { '@type': 'PeopleAudience', suggestedGender: 'female' },
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'INR',
      lowPrice: minPrice,
      highPrice: maxPrice,
      offerCount: activeVariants.length || 1,
      availability: inStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      url: `${SITE_URL}/products/${product.slug}`,
    },
  }
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params
  let product: any

  try {
    product = await serverProductsApi.getBySlug(slug)
  } catch (err: unknown) {
    // Only a genuine "no such product" becomes a 404. A timeout or a 500 from
    // the backend must not be served as one, or Google drops a live product
    // URL out of the index over a transient blip.
    if (err instanceof ApiNotFoundError) notFound()
    throw err
  }

  if (!product) notFound()

  const displayName = buildProductDisplayName(product)
  const seoDescription = buildProductDescription(product)
  const bodyCopy = buildProductCopy(product)
  const jsonLd = buildProductJsonLd(product, displayName, seoDescription)

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home',        item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: 'Collections', item: `${SITE_URL}/products` },
      ...(product.category?.slug
        ? [{
            '@type': 'ListItem',
            position: 3,
            name: product.category.name,
            item: `${SITE_URL}/products?category=${product.category.slug}`,
          }]
        : []),
      {
        '@type': 'ListItem',
        position: product.category?.slug ? 4 : 3,
        name: displayName,
        item: `${SITE_URL}/products/${product.slug}`,
      },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <ProductDetailClient
        product={product}
        displayName={displayName}
        bodyCopy={bodyCopy}
      />
    </>
  )
}
