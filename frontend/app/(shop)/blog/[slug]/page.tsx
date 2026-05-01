// Per-post blog page — minimal scaffold with full Article + Breadcrumb JSON-LD.
// Visual layer is intentionally bare; fill in `body` rendering when the blog
// design is approved.

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getAllPosts, getPostBySlug } from '@/lib/blog/posts'

export const revalidate = 3600

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.vamiclubwear.in'

interface PageProps {
  params: { slug: string }
}

export function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const post = getPostBySlug(params.slug)
  if (!post) return { title: 'Post not found' }

  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `${SITE_URL}/blog/${post.slug}` },
    openGraph: {
      type: 'article',
      title: post.title,
      description: post.description,
      url: `${SITE_URL}/blog/${post.slug}`,
      publishedTime: post.publishedAt,
      ...(post.updatedAt && { modifiedTime: post.updatedAt }),
      ...(post.coverImage && { images: [{ url: post.coverImage, alt: post.title }] }),
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
      ...(post.coverImage && { images: [post.coverImage] }),
    },
  }
}

export default function BlogPostPage({ params }: PageProps) {
  const post = getPostBySlug(params.slug)
  if (!post) notFound()

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    datePublished: post.publishedAt,
    ...(post.updatedAt && { dateModified: post.updatedAt }),
    author: { '@type': 'Organization', name: post.author ?? 'Vami Clubwear' },
    publisher: {
      '@type': 'Organization',
      name: 'Vami Clubwear',
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/logo.svg` },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE_URL}/blog/${post.slug}` },
    ...(post.coverImage && { image: post.coverImage }),
    ...(post.tags && post.tags.length > 0 && { keywords: post.tags.join(', ') }),
  }

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home',          item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: 'Style Journal', item: `${SITE_URL}/blog` },
      { '@type': 'ListItem', position: 3, name: post.title,      item: `${SITE_URL}/blog/${post.slug}` },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <main className="mx-auto max-w-[760px] px-5 py-16" style={{ marginTop: '96px' }}>
        <nav className="mb-8 text-xs text-fg-3">
          <Link href="/blog" className="hover:underline">&larr; Style Journal</Link>
        </nav>

        <article>
          <header className="mb-8">
            <h1 className="text-fg-1 uppercase leading-[1.05]"
                style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif', fontWeight: 400, fontSize: 'clamp(28px, 4.5vw, 48px)', letterSpacing: '-0.01em' }}>
              {post.title}
            </h1>
            <p className="mt-3 text-fg-3 text-xs uppercase tracking-[0.18em]">
              {new Date(post.publishedAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </header>

          <div className="prose prose-invert max-w-none text-fg-2"
               style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif', fontSize: '16px', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
            {post.body}
          </div>
        </article>
      </main>
    </>
  )
}
