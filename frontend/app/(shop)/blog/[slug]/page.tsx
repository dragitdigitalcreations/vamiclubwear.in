// Per-post Style Journal page — editorial reading layout with a cover hero,
// refined typography, a "Shop this Story" product strip (content→commerce),
// a WhatsApp size-help CTA, and a "Keep reading" strip. Full Article +
// Breadcrumb JSON-LD retained for SEO.

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, MessageCircle, ArrowRight } from 'lucide-react'
import { getAllPosts, getPostBySlug, readingTime } from '@/lib/blog/posts'
import { BlogCard } from '@/components/shop/BlogCard'
import { ShopThisStory } from '@/components/shop/ShopThisStory'
import type { Product } from '@/types/product'

export const revalidate = 600

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.vamiclubwear.in'
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
const WHATSAPP = '919061607608'

interface PageProps {
  params: Promise<{ slug: string }>
}

// Resolve related product slugs → live products (best-effort; skips missing).
async function getRelatedProducts(slugs: string[]): Promise<Product[]> {
  if (!slugs?.length) return []
  const results = await Promise.all(
    slugs.slice(0, 8).map(async (slug) => {
      try {
        const res = await fetch(`${API_BASE}/api/products/slug/${encodeURIComponent(slug)}`, {
          next: { revalidate: 600 },
        })
        if (!res.ok) return null
        return (await res.json()) as Product
      } catch {
        return null
      }
    }),
  )
  return results.filter((p): p is Product => !!p && !!p.id)
}

export async function generateStaticParams() {
  const posts = await getAllPosts()
  return posts.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const post = await getPostBySlug(slug)
  // notFound() here rather than a "Post not found" title: metadata resolves
  // before the HTML shell is flushed, so this is what makes Next return a real
  // 404 status instead of a 200 carrying the not-found body (a Soft 404).
  if (!post) notFound()

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

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params
  const post = await getPostBySlug(slug)
  if (!post) notFound()

  const [related, allPosts] = await Promise.all([
    getRelatedProducts(post.relatedProductSlugs ?? []),
    getAllPosts(),
  ])

  // "Keep reading" — same category first, then fill with recent, max 3.
  const others = allPosts.filter((p) => p.slug !== post.slug)
  const keepReading = [
    ...others.filter((p) => post.category && p.category === post.category),
    ...others.filter((p) => !post.category || p.category !== post.category),
  ].slice(0, 3)

  const mins = post.readMinutes ?? readingTime(post.body)
  const publishedLabel = new Date(post.publishedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    datePublished: post.publishedAt,
    ...(post.updatedAt && { dateModified: post.updatedAt }),
    ...(post.category && { articleSection: post.category }),
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <main className="pb-24 pt-28 sm:pt-32">
        {/* Header — kicker, headline, meta, centered */}
        <header className="mx-auto max-w-[760px] px-5 text-center">
          <nav className="mb-8">
            <Link href="/blog" className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted transition-colors hover:text-on-background">
              <ArrowLeft className="h-3.5 w-3.5" /> Style Journal
            </Link>
          </nav>
          {post.category && (
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand">{post.category}</p>
          )}
          <h1 className="mt-3 font-display uppercase leading-[1.05] text-on-background"
              style={{ fontSize: 'clamp(30px, 5vw, 52px)', letterSpacing: '-0.01em' }}>
            {post.title}
          </h1>
          <p className="mt-5 text-[11px] uppercase tracking-[0.14em] text-muted">
            {publishedLabel} · {mins} min read{post.author ? ` · ${post.author}` : ''}
          </p>
        </header>

        {/* Cover image — full-bleed-ish band */}
        {post.coverImage && (
          <div className="mx-auto mt-10 max-w-[1000px] px-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={post.coverImage} alt={post.title} className="aspect-16/9 w-full rounded-sm object-cover" />
          </div>
        )}

        {/* Body */}
        <article className="mx-auto mt-12 max-w-[680px] px-5">
          <div
            className="blog-article"
            dangerouslySetInnerHTML={{ __html: post.body ?? '' }}
          />

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="mt-10 flex flex-wrap gap-2 border-t border-border pt-6">
              {post.tags.map((t) => (
                <span key={t} className="rounded-full border border-border px-3 py-1 text-[11px] uppercase tracking-[0.1em] text-fg-3">{t}</span>
              ))}
            </div>
          )}

          {/* Shop this Story */}
          <ShopThisStory products={related} />

          {/* WhatsApp size-help CTA — high-AOV shoppers want reassurance */}
          <div className="mt-16 rounded-sm border border-border bg-surface-elevated/60 px-6 py-8 text-center">
            <h2 className="font-display text-2xl text-on-background">Need help with size or styling?</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-fg-2">
              Our team helps you pick the perfect fit up to XXXL and beyond. Message us on WhatsApp — we usually reply within the hour.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <a
                href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(`Hi Vami! I read "${post.title}" and need help choosing.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-on-background px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-white transition-opacity hover:opacity-90"
              >
                <MessageCircle className="h-4 w-4" /> Chat on WhatsApp
              </a>
              <Link href="/products" className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-on-background hover:text-brand">
                Browse the collection <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </article>

        {/* Keep reading */}
        {keepReading.length > 0 && (
          <section className="mx-auto mt-20 max-w-[1180px] border-t border-border px-5 pt-12">
            <h2 className="mb-8 font-display text-2xl text-on-background">Keep reading</h2>
            <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {keepReading.map((p) => <BlogCard key={p.slug} post={p} />)}
            </div>
          </section>
        )}
      </main>
    </>
  )
}
