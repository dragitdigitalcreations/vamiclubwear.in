// Blog index — minimal SEO-ready scaffold. UI intentionally bare per project
// brief: prepare structure now, design the visual layer later. Inherits the
// (shop) route group layout (Navbar / Footer / CartDrawer).

import type { Metadata } from 'next'
import Link from 'next/link'
import { getAllPosts } from '@/lib/blog/posts'

export const revalidate = 3600

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

export default function BlogIndexPage() {
  const posts = getAllPosts()

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

      <main className="mx-auto max-w-[1100px] px-5 py-16" style={{ marginTop: '96px' }}>
        <h1 className="text-fg-1 uppercase leading-none mb-3"
            style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif', fontWeight: 400, fontSize: 'clamp(36px, 5vw, 60px)', letterSpacing: '-0.01em' }}>
          Style Journal
        </h1>
        <p className="text-fg-2 max-w-[640px] mb-12" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif', fontSize: '15px', lineHeight: 1.7 }}>
          Style guides, plus-size styling inspiration and fashion stories from
          the Vami Clubwear atelier in Manjeri, Kerala.
        </p>

        {posts.length === 0 ? (
          <p className="text-fg-3 text-sm">New stories coming soon.</p>
        ) : (
          <ul className="space-y-8">
            {posts.map((post) => (
              <li key={post.slug}>
                <article>
                  <h2 className="text-fg-1 mb-1"
                      style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif', fontWeight: 500, fontSize: '22px' }}>
                    <Link href={`/blog/${post.slug}`} className="hover:underline">
                      {post.title}
                    </Link>
                  </h2>
                  <p className="text-fg-3 text-xs mb-2">
                    {new Date(post.publishedAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                  <p className="text-fg-2 text-sm" style={{ lineHeight: 1.7 }}>{post.description}</p>
                </article>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  )
}
