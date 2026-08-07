import type { MetadataRoute } from 'next'
import { CATEGORIES } from '@/lib/categories'
import {
  ApiNotFoundError,
  listAllActiveProducts,
  serverProductsApi,
  type CatalogProduct,
} from '@/lib/server-api'
import { getAllPosts } from '@/lib/blog/posts'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.vamiclubwear.in'

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
    { url: `${SITE_URL}/terms`,    lastModified: now, changeFrequency: 'yearly',  priority: 0.2 },
    { url: `${SITE_URL}/privacy`,  lastModified: now, changeFrequency: 'yearly',  priority: 0.2 },
    { url: `${SITE_URL}/blog`,     lastModified: now, changeFrequency: 'weekly',  priority: 0.6 },
  ]

  const blogPaths: MetadataRoute.Sitemap = (await getAllPosts()).map((p) => ({
    url: `${SITE_URL}/blog/${p.slug}`,
    lastModified: p.updatedAt ? new Date(p.updatedAt) : new Date(p.publishedAt),
    changeFrequency: 'monthly',
    priority: 0.5,
  }))

  const categoryPaths: MetadataRoute.Sitemap = CATEGORIES.map((c) => ({
    url: `${SITE_URL}/products?category=${c.slug}`,
    lastModified: now,
    changeFrequency: 'daily',
    priority: 0.8,
  }))

  let productPaths: MetadataRoute.Sitemap = []
  try {
    const candidates = await listAllActiveProducts(3600)

    // The listing and the detail page can be served by different catalog
    // sources (Retaqo vs the legacy Vami backend), and their slug sets have
    // drifted — /products/sharara-set was listed and linked here while the
    // detail endpoint 404'd it, which is where the Soft 404 in Search Console
    // came from. Confirm each slug actually resolves before advertising it;
    // the lookups share the same 1h fetch cache the product pages use, so
    // this costs one warm round-trip per product per revalidation.
    const resolved = await Promise.all(
      candidates.map(async (p) => {
        try {
          await serverProductsApi.getBySlug(p.slug)
          return p
        } catch (err) {
          // Only drop on a definite 404. A transient failure must not silently
          // shrink the sitemap and signal to Google that URLs were removed.
          return err instanceof ApiNotFoundError ? null : p
        }
      }),
    )

    productPaths = resolved
      .filter((p): p is CatalogProduct => p !== null)
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

  return [...staticPaths, ...categoryPaths, ...blogPaths, ...productPaths]
}
