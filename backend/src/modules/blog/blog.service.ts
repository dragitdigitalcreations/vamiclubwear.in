/**
 * Blog service — Style Journal posts.
 *
 * Pure database CRUD, authored by hand from the admin panel. No external
 * APIs, no per-post cost — publishing and serving are plain DB reads/writes.
 */

import { z } from 'zod'
import { prisma } from '../../lib/prisma'
import { AppError } from '../../utils/errors'

// ─── Validation ────────────────────────────────────────────────────────────────

const postInputSchema = z.object({
  title:               z.string().min(3).max(200),
  slug:                z.string().min(3).max(200).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers and hyphens'),
  description:         z.string().min(10).max(500),
  body:                z.string().min(50),
  coverImage:          z.string().url().optional().nullable(),
  author:              z.string().max(100).optional(),
  category:            z.string().max(60).optional().nullable(),
  tags:                z.array(z.string().max(50)).max(10).optional(),
  featured:            z.boolean().optional(),
  relatedProductSlugs: z.array(z.string().max(200)).max(12).optional(),
  status:              z.enum(['DRAFT', 'PUBLISHED']).optional(),
})

export type BlogPostInput = z.infer<typeof postInputSchema>

// ─── Service ───────────────────────────────────────────────────────────────────

// Listing shape — omit the (large) body from the payload; the grid only needs
// the excerpt. We still read body server-side to derive reading time.
const listSelect = {
  slug: true, title: true, description: true, coverImage: true,
  author: true, category: true, tags: true, featured: true,
  publishedAt: true, updatedAt: true,
} as const

// Reading time from HTML — strip tags, ~200 wpm. Shown as an editorial cue on
// cards; computed server-side so the listing payload can drop the raw body.
function readMinutes(html: string): number {
  const words = html.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 200))
}

export const blogService = {
  // Public: published posts, featured first then newest.
  async listPublished() {
    const rows = await prisma.blogPost.findMany({
      where:   { status: 'PUBLISHED' },
      orderBy: [{ featured: 'desc' }, { publishedAt: 'desc' }],
      select:  { ...listSelect, body: true },
    })
    return rows.map(({ body, ...rest }) => ({ ...rest, readMinutes: readMinutes(body) }))
  },

  // Public: one published post with body + related product slugs
  async getPublishedBySlug(slug: string) {
    const post = await prisma.blogPost.findFirst({
      where:  { slug, status: 'PUBLISHED' },
      select: { ...listSelect, body: true, relatedProductSlugs: true },
    })
    return post ? { ...post, readMinutes: readMinutes(post.body) } : null
  },

  // Admin
  async listAll() {
    return prisma.blogPost.findMany({ orderBy: { createdAt: 'desc' } })
  },

  async create(input: unknown) {
    const data = postInputSchema.parse(input)
    return prisma.blogPost.create({
      data: {
        ...data,
        tags:                data.tags ?? [],
        relatedProductSlugs: data.relatedProductSlugs ?? [],
        publishedAt:         data.status === 'PUBLISHED' ? new Date() : null,
      },
    })
  },

  async update(id: string, input: unknown) {
    const data = postInputSchema.partial().parse(input)
    const existing = await prisma.blogPost.findUnique({ where: { id } })
    if (!existing) throw new AppError(404, 'Post not found')

    // First transition to PUBLISHED stamps publishedAt (kept on re-publish)
    const publishedAt =
      data.status === 'PUBLISHED' && !existing.publishedAt ? new Date() : undefined

    return prisma.blogPost.update({
      where: { id },
      data:  { ...data, ...(publishedAt ? { publishedAt } : {}) },
    })
  },

  async delete(id: string) {
    await prisma.blogPost.delete({ where: { id } }).catch(() => {
      throw new AppError(404, 'Post not found')
    })
  },
}
