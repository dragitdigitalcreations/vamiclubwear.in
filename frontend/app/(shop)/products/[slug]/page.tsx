// Product detail — Server Component with ISR (revalidates every hour)
// Data is fetched server-side → no loading spinner on first paint
// Client interactivity (gallery, variants, cart) handled in ProductDetailClient

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { serverProductsApi } from '@/lib/server-api'
import { ProductDetailClient } from './ProductDetailClient'

// ISR: revalidate cached page every 60 minutes
export const revalidate = 3600

interface PageProps {
  params: { slug: string }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    const product = await serverProductsApi.getBySlug(params.slug)
    const imageUrl = product.media?.find((m: any) => m.isPrimary && m.type === 'IMAGE')?.url
                  ?? product.media?.find((m: any) => m.type === 'IMAGE')?.url

    return {
      title: product.name,
      description: product.description ?? `Shop ${product.name} at Vami Clubwear — Premium Indo-Western fashion from Manjeri, Kerala.`,
      openGraph: {
        title: product.name,
        description: product.description ?? '',
        ...(imageUrl && { images: [{ url: imageUrl, width: 900, height: 1200, alt: product.name }] }),
      },
    }
  } catch {
    return { title: 'Product Not Found' }
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

  return <ProductDetailClient product={product} />
}
