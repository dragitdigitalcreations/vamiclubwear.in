import Link from 'next/link'
import type { BlogPost } from '@/lib/blog/posts'
import { readingTime } from '@/lib/blog/posts'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Editorial card for the /blog grid and the "Keep reading" strip on posts.
// Matches ProductCard's hover language (image scale 1.03, micro-labels) so the
// journal reads as part of the same store, not a bolted-on blog.
export function BlogCard({ post, priority = false }: { post: BlogPost; priority?: boolean }) {
  return (
    <Link href={`/blog/${post.slug}`} className="group block">
      <div className="relative aspect-4/5 overflow-hidden rounded-xs bg-surface-elevated">
        {post.coverImage ? (
          // Cover URLs are operator-pasted (Cloudinary or external) — a plain
          // <img> avoids next/image domain config for arbitrary hosts.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.coverImage}
            alt={post.title}
            loading={priority ? 'eager' : 'lazy'}
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="font-display text-4xl text-muted/30">Vami</span>
          </div>
        )}
      </div>

      <div className="mt-3.5">
        {post.category && (
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-brand">
            {post.category}
          </p>
        )}
        <h3 className="font-display text-lg leading-snug text-on-background transition-colors duration-200 group-hover:text-brand-dark">
          {post.title}
        </h3>
        {post.description && (
          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-fg-3">
            {post.description}
          </p>
        )}
        <p className="mt-2.5 text-[11px] uppercase tracking-[0.12em] text-muted">
          {formatDate(post.publishedAt)} · {post.readMinutes ?? readingTime(post.body)} min read
        </p>
      </div>
    </Link>
  )
}
