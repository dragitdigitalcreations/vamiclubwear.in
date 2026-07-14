// Blog content source — posts live in the database, managed from the admin
// panel (/admin/blog) and served by the backend at /api/blog. These helpers
// run server-side (listing page, per-post page, sitemap) with ISR; if the
// backend is unreachable (e.g. a cold build) they return empty results so
// pages render instead of failing the build.

export interface BlogPost {
  slug: string
  title: string
  description: string
  publishedAt: string  // ISO date
  updatedAt?: string
  author?: string
  category?: string | null
  coverImage?: string | null
  tags?: string[]
  featured?: boolean
  readMinutes?: number                // computed server-side (both list + single)
  body?: string                       // HTML — present on single-post fetches only
  relatedProductSlugs?: string[]      // single-post fetches only
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
// 10 min — matches the products-listing ISR convention (see memory:
// tighter revalidate = more backend hits/egress; don't lower pre-launch).
const REVALIDATE_SECONDS = 600

export async function getAllPosts(): Promise<BlogPost[]> {
  try {
    const res = await fetch(`${API_BASE}/api/blog`, {
      next: { revalidate: REVALIDATE_SECONDS },
    })
    if (!res.ok) return []
    const posts: BlogPost[] = await res.json()
    return posts.filter((p) => p.slug && p.publishedAt)
  } catch {
    return []
  }
}

export async function getPostBySlug(slug: string): Promise<BlogPost | undefined> {
  try {
    const res = await fetch(`${API_BASE}/api/blog/${encodeURIComponent(slug)}`, {
      next: { revalidate: REVALIDATE_SECONDS },
    })
    if (!res.ok) return undefined
    return await res.json()
  } catch {
    return undefined
  }
}

// Reading time from HTML body — strips tags, counts words at 200 wpm.
export function readingTime(html?: string): number {
  if (!html) return 1
  const words = html.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 200))
}
