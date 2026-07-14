'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { BlogPost } from '@/lib/blog/posts'
import { BlogCard } from '@/components/shop/BlogCard'
import { cn } from '@/lib/utils'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
}

// The big cover story at the top of the journal. Editorial split: image on one
// side, headline block on the other. Only shown in the unfiltered "All" view.
function FeaturedStory({ post }: { post: BlogPost }) {
  return (
    <Link href={`/blog/${post.slug}`} className="group mb-16 block">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-10">
        <div className="relative aspect-4/3 overflow-hidden rounded-sm bg-surface-elevated md:aspect-auto md:min-h-[420px]">
          {post.coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.coverImage}
              alt={post.title}
              className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <span className="font-display text-6xl text-muted/30">Vami</span>
            </div>
          )}
        </div>

        <div className="flex flex-col justify-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand">
            {post.category ? `Featured · ${post.category}` : 'Featured Story'}
          </p>
          <h2 className="mt-3 font-display text-3xl leading-[1.1] text-on-background sm:text-4xl">
            {post.title}
          </h2>
          <p className="mt-4 max-w-prose text-[15px] leading-relaxed text-fg-2">
            {post.description}
          </p>
          <span className="mt-6 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-on-background">
            Read the story
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1" />
          </span>
          <p className="mt-3 text-[11px] uppercase tracking-[0.12em] text-muted">
            {formatDate(post.publishedAt)} · {post.readMinutes ?? 5} min read
          </p>
        </div>
      </div>
    </Link>
  )
}

export function BlogIndexClient({ posts }: { posts: BlogPost[] }) {
  const [active, setActive] = useState<string>('All')

  // Categories that actually have posts (keeps the filter honest).
  const categories = useMemo(() => {
    const set = new Set<string>()
    posts.forEach((p) => { if (p.category) set.add(p.category) })
    return ['All', ...Array.from(set)]
  }, [posts])

  const featured = posts.find((p) => p.featured) ?? posts[0]
  const showHero = active === 'All' && !!featured

  const grid = useMemo(() => {
    const base = active === 'All'
      ? posts.filter((p) => p.slug !== featured?.slug)   // hero already shown
      : posts.filter((p) => p.category === active)
    return base
  }, [posts, active, featured])

  return (
    <main className="mx-auto max-w-[1180px] px-5 pb-24 pt-28 sm:pt-32">
      {/* Masthead */}
      <header className="mb-12 border-b border-border pb-10 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-brand">The Vami Clubwear Journal</p>
        <h1 className="mt-3 font-display uppercase leading-none text-on-background"
            style={{ fontSize: 'clamp(40px, 6vw, 72px)', letterSpacing: '-0.01em' }}>
          Style Journal
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-fg-2">
          Styling guides, size-inclusive inspiration and fabric stories from our
          atelier in Manjeri — dressing every woman for every occasion.
        </p>
      </header>

      {posts.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted">New stories are on the way. Check back soon.</p>
      ) : (
        <>
          {showHero && <FeaturedStory post={featured!} />}

          {/* Category filter */}
          {categories.length > 1 && (
            <div className="mb-10 flex flex-wrap items-center justify-center gap-2">
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setActive(c)}
                  className={cn(
                    'rounded-full border px-4 py-1.5 text-xs font-medium uppercase tracking-[0.1em] transition-colors',
                    active === c
                      ? 'border-on-background bg-on-background text-white'
                      : 'border-border text-fg-3 hover:border-on-background hover:text-on-background',
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          )}

          {/* Grid */}
          {grid.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted">No stories in this section yet.</p>
          ) : (
            <div className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {grid.map((post, i) => (
                <BlogCard key={post.slug} post={post} priority={i < 3} />
              ))}
            </div>
          )}
        </>
      )}
    </main>
  )
}
