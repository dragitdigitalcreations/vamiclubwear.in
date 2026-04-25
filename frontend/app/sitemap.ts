import type { MetadataRoute } from 'next'
import { CATEGORIES } from '@/lib/categories'
import { serverProductsApi } from '@/lib/server-api'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.vamiclubwear.com'

export const revalidate = 3600 // refresh sitemap hourly

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  const staticPaths: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`,         lastModified: now, changeFrequency: 'daily',   priority: 1.0 },
    { url: `${SITE_URL}/products`, lastModified: now, changeFrequency: 'daily',   priority: 0.9 },
    { url: `${SITE_URL}/about`,    lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/contact`,  lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/shipping`, lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${SITE_URL}/returns`,  lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${SITE_URL}/sizing`,   lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
  ]

  const categoryPaths: MetadataRoute.Sitemap = CATEGORIES.map((c) => ({
    url: `${SITE_URL}/products?category=${c.slug}`,
    lastModified: now,
    changeFrequency: 'daily',
    priority: 0.8,
  }))

  let productPaths: MetadataRoute.Sitemap = []
  try {
    const result = await serverProductsApi.list({ limit: 500, isActive: 'true' }, 3600)
    const products = (result?.data ?? result ?? []) as Array<{ slug: string; updatedAt?: string }>
    productPaths = products
      .filter((p) => p?.slug)
      .map((p) => ({
        url: `${SITE_URL}/products/${p.slug}`,
        lastModified: p.updatedAt ? new Date(p.updatedAt) : now,
        changeFrequency: 'weekly',
        priority: 0.7,
      }))
  } catch {
    // Backend unreachable at build/ISR time — ship sitemap without product URLs
    // rather than failing the request entirely.
  }

  return [...staticPaths, ...categoryPaths, ...productPaths]
}
