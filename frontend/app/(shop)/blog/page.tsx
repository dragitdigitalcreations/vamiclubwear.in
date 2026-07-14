// Style Journal index — editorial magazine layout. Server component fetches
// published posts + emits SEO JSON-LD; the interactive masthead/hero/filter/
// grid lives in BlogIndexClient. Inherits the (shop) layout (Navbar/Footer).

import type { Metadata } from 'next'
import { getAllPosts } from '@/lib/blog/posts'
import { BlogIndexClient } from './BlogIndexClient'

// 10 min so a freshly published post shows up on the listing quickly
// (page-level revalidate caps the fetch-level one in lib/blog/posts.ts)
export const revalidate = 600

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.vamiclubwear.in'

export const metadata: Metadata = {
  title: "Style Journal — Women's Fashion Tips & Stories",
  description:
    "Style guides, plus-size styling inspiration and fashion stories from Vami Clubwear — Indo-Western fusion, modest wear and size-inclusive women's clothing (up to XXXL) in India.",
  alternates: { canonical: `${SITE_URL}/blog` },
  openGraph: {
    type: 'website',
    title: "Vami Clubwear Style Journal",
    description:
      "Style guides, plus-size styling inspiration and fashion stories from Vami Clubwear.",
    url: `${SITE_URL}/blog`,
  },
}

export default async function BlogIndexPage() {
  const posts = await getAllPosts()

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: 'Style Journal', item: `${SITE_URL}/blog` },
    ],
  }

  const blogJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'Vami Clubwear Style Journal',
    url: `${SITE_URL}/blog`,
    publisher: {
      '@type': 'Organization',
      name: 'Vami Clubwear',
      url: SITE_URL,
    },
    blogPost: posts.map((p) => ({
      '@type': 'BlogPosting',
      headline: p.title,
      url: `${SITE_URL}/blog/${p.slug}`,
      datePublished: p.publishedAt,
      ...(p.updatedAt && { dateModified: p.updatedAt }),
    })),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogJsonLd) }}
      />

      <BlogIndexClient posts={posts} />
    </>
  )
}
