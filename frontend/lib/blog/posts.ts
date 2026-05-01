// Single source of truth for /blog content.
// Add posts to this array as the blog grows — sitemap, listing page and
// per-post pages all read from here, so adding a post is a one-line change.

export interface BlogPost {
  slug: string
  title: string
  description: string
  publishedAt: string  // ISO date — "2026-05-01"
  updatedAt?: string
  author?: string
  coverImage?: string  // absolute or /public-relative URL
  tags?: string[]
  body: string         // plain text or HTML — rendered as-is by [slug]/page.tsx
}

export const BLOG_POSTS: BlogPost[] = []

export function getAllPosts(): BlogPost[] {
  return [...BLOG_POSTS].sort((a, b) =>
    b.publishedAt.localeCompare(a.publishedAt)
  )
}

export function getPostBySlug(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug)
}
