// Product detail — Server Component with ISR (revalidates every hour)
// Data is fetched server-side → no loading spinner on first paint
// Client interactivity (gallery, variants, cart) handled in ProductDetailClient

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { serverProductsApi } from '@/lib/server-api'
import { ProductDetailClient } from './ProductDetailClient'

// ISR: revalidate every 30s so admin price edits + POS-driven stock changes
// surface across all pages in roughly half a minute.
export const revalidate = 30

interface PageProps {
  params: { slug: string }
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.vamiclubwear.com'

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    const product = await serverProductsApi.getBySlug(params.slug)
    const imageUrl = product.media?.find((m: any) => m.isPrimary && m.type === 'IMAGE')?.url
                  ?? product.media?.find((m: any) => m.type === 'IMAGE')?.url
    const description =
      product.description ??
      `Shop ${product.name} at Vami Clubwear — premium Indo-Western fashion handcrafted in Manjeri, Kerala.`

    return {
      title: product.name,
      description,
      alternates: { canonical: `${SITE_URL}/products/${params.slug}` },
      openGraph: {
        type: 'website',
        title: product.name,
        description,
        url: `${SITE_URL}/products/${params.slug}`,
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
  const imageUrls = (product.media ?? [])
    .filter((m: any) => m.type === 'IMAGE')
    .map((m: any) => m.url)

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
  let product: any

  try {
    product = await serverProductsApi.getBySlug(params.slug)
  } catch (err: any) {
    notFound()
  }

  if (!product) notFound()

  const jsonLd = buildProductJsonLd(product)

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProductDetailClient product={product} />
    </>
  )
}
