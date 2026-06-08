// Product detail — Server Component with ISR (revalidates every hour)
// Data is fetched server-side → no loading spinner on first paint
// Client interactivity (gallery, variants, cart) handled in ProductDetailClient

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { serverProductsApi } from '@/lib/server-api'
import { getPrimaryDetailImage, mediaDetail, type Product } from '@/types/product'
import { ProductDetailClient } from './ProductDetailClient'

// ISR: revalidate every 30 min during pre-launch to keep Neon CU-hours under
// the free-tier ceiling. Checkout still re-validates inventory server-side,
// so stale ISR cannot cause overselling. Tighten to 30-60s post-launch.
export const revalidate = 1800

interface PageProps {
  params: Promise<{ slug: string }>
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.vamiclubwear.in'

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  try {
    const product = await serverProductsApi.getBySlug(slug)
    // Stage 50.2 — prefer Retaqo's pre-built `delivery.detail` (~1200px,
    // q_auto + f_auto) for OpenGraph + Twitter card images; falls back to
    // the raw url for legacy Vami-sourced products. OG images get scraped
    // and re-cached aggressively, so serving an already-optimized URL
    // cuts bandwidth without changing the link preview.
    const imageUrl = getPrimaryDetailImage(product as Pick<Product, 'media'>) ?? undefined
    const description =
      product.description ??
      `Shop ${product.name} at Vami Clubwear — premium Indo-Western fashion handcrafted in Manjeri, Kerala.`

    return {
      title: product.name,
      description,
      alternates: { canonical: `${SITE_URL}/products/${slug}` },
      openGraph: {
        type: 'website',
        title: product.name,
        description,
        url: `${SITE_URL}/products/${slug}`,
        ...(imageUrl && { images: [{ url: imageUrl, width: 900, height: 1200, alt: product.name }] }),
      },
      twitter: {
        card: 'summary_large_image',
        title: product.name,
        description,
        ...(imageUrl && { images: [imageUrl] }),
      },
    }
  } catch {
    return { title: 'Product Not Found' }
  }
}

function buildProductJsonLd(product: any) {
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
  const inStock = activeVariants.some((v: any) =>
    typeof v.availableStock === 'number'
      ? v.availableStock > 0
      : (v.stock ?? 0) - (v.reservedStock ?? 0) > 0
  )

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description ?? '',
    image: imageUrls,
    sku: activeVariants[0]?.sku,
    brand: { '@type': 'Brand', name: 'Vami Clubwear' },
    category: product.category?.name,
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'INR',
      lowPrice: minPrice,
      highPrice: maxPrice,
      offerCount: activeVariants.length || 1,
      availability: inStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      url: `${SITE_URL}/products/${product.slug}`,
    },
  }
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params
  let product: any

  try {
    product = await serverProductsApi.getBySlug(slug)
  } catch (err: any) {
    notFound()
  }

  if (!product) notFound()

  const jsonLd = buildProductJsonLd(product)

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
        name: product.name,
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
      <ProductDetailClient product={product} />
    </>
  )
}
