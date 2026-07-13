/**
 * Blog service — Style Journal posts.
 *
 * CRUD for admin-authored posts plus AI draft generation via the Claude API.
 * Generation is the ONLY place the Anthropic key is used: publishing and
 * serving posts never touch it, so a missing/exhausted key degrades to
 * "generate button errors" while everything else keeps working.
 */

import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { prisma } from '../../lib/prisma'
import { AppError } from '../../utils/errors'

// ─── Validation ────────────────────────────────────────────────────────────────

const postInputSchema = z.object({
  title:       z.string().min(3).max(200),
  slug:        z.string().min(3).max(200).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers and hyphens'),
  description: z.string().min(10).max(500),
  body:        z.string().min(50),
  coverImage:  z.string().url().optional().nullable(),
  author:      z.string().max(100).optional(),
  tags:        z.array(z.string().max(50)).max(10).optional(),
  status:      z.enum(['DRAFT', 'PUBLISHED']).optional(),
})

export type BlogPostInput = z.infer<typeof postInputSchema>

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
}

// ─── AI generation ─────────────────────────────────────────────────────────────

// Evergreen topics rotated by the auto-draft scheduler when no topic is given.
const TOPIC_POOL = [
  'How to style an Anarkali for a wedding guest look',
  'Plus-size styling guide: silhouettes that flatter every body up to XXXL',
  'Georgette vs Chinon vs Crepe — choosing the right fabric for your occasion wear',
  'Modest fashion outfit ideas for festive season',
  'How to care for zari work and embroidered ethnic wear at home',
  'Sharara vs Palazzo sets — which suits your body type and occasion',
  'Building a capsule ethnic wardrobe: 6 pieces that mix and match',
  'What to wear to an engagement as a guest: Indo-Western fusion ideas',
  'Dupatta draping styles that transform a simple suit',
  'Kerala wedding guest outfits: tradition meets contemporary fusion wear',
]

const generatedPostSchema = z.object({
  title:       z.string(),
  slug:        z.string(),
  description: z.string(),
  tags:        z.array(z.string()),
  body:        z.string(),
})

function buildSystemPrompt(): string {
  return `You are the content writer for Vami Clubwear (vamiclubwear.in), a premium women's ethnic and Indo-Western fusion wear brand based in Manjeri, Kerala, India. The brand specialises in size-inclusive fashion — Anarkalis, salwars, shararas, churidars, gowns and dupattas tailored up to XXXL and beyond — plus modest fashion. Average product price is around ₹4,500 (premium positioning; customers research before buying).

Write blog posts for the brand's "Style Journal" that build trust and rank on search engines.

Rules:
- Write for Indian women shopping for ethnic/fusion wear online. Warm, knowledgeable, never salesy.
- 900–1300 words. British/Indian English.
- The body must be clean HTML using only these tags: <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>, <a>. No <h1> (the page renders the title), no inline styles, no scripts, no images.
- Naturally target long-tail search phrases (e.g. "plus size Anarkali for wedding", "modest fashion India") in headings and text — never keyword-stuff.
- When product links are provided, weave 2–4 of them in naturally as <a href="...">descriptive anchor text</a>. Only use URLs you were given — never invent URLs.
- End with a short paragraph inviting readers to explore the collection at <a href="/products">the Vami Clubwear collection</a> or reach out on WhatsApp for size guidance.
- The description field is a meta description: 140–160 characters, compelling, includes the main phrase.
- The slug is lowercase-hyphenated, max 8 words, contains the main phrase.
- 3–6 tags, short lowercase phrases.`
}

async function buildUserPrompt(topic: string): Promise<string> {
  // Real product URLs so the AI can internal-link (never invents URLs)
  const products = await prisma.product.findMany({
    where:   { isActive: true, deletedAt: null },
    orderBy: { createdAt: 'desc' },
    take:    8,
    select:  { name: true, slug: true, category: { select: { name: true } } },
  }).catch(() => [] as Array<{ name: string; slug: string; category: { name: string } | null }>)

  const productLines = products.length
    ? products.map((p) => `- ${p.name}${p.category ? ` (${p.category.name})` : ''}: /products/${p.slug}`).join('\n')
    : '(no product links available — skip product links, keep the /products collection link)'

  // Existing titles so consecutive posts don't overlap
  const existing = await prisma.blogPost.findMany({
    orderBy: { createdAt: 'desc' },
    take:    10,
    select:  { title: true },
  })
  const existingLines = existing.length
    ? existing.map((p) => `- ${p.title}`).join('\n')
    : '(none yet)'

  return `Write a Style Journal post on this topic:
"${topic}"

Products currently live on the store (use these exact URLs for internal links):
${productLines}

Already-published post titles (do not duplicate these angles):
${existingLines}`
}

export interface GenerateOptions {
  topic?: string
}

async function generateDraft(opts: GenerateOptions) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new AppError(
      503,
      'AI drafting is not configured yet. Add ANTHROPIC_API_KEY to the backend environment (console.anthropic.com → API keys; prepaid pay-per-use, no subscription).',
    )
  }

  const client = new Anthropic({ apiKey })
  const model = process.env.BLOG_AI_MODEL ?? 'claude-opus-4-8'
  const topic = opts.topic?.trim() || TOPIC_POOL[Math.floor(Math.random() * TOPIC_POOL.length)]

  let response: Anthropic.Message
  try {
    response = await client.messages.create({
      model,
      max_tokens: 16000,
      thinking: { type: 'adaptive' },
      system: buildSystemPrompt(),
      output_config: {
        format: {
          type: 'json_schema',
          schema: {
            type: 'object',
            properties: {
              title:       { type: 'string' },
              slug:        { type: 'string' },
              description: { type: 'string' },
              tags:        { type: 'array', items: { type: 'string' } },
              body:        { type: 'string' },
            },
            required: ['title', 'slug', 'description', 'tags', 'body'],
            additionalProperties: false,
          },
        },
      },
      messages: [{ role: 'user', content: await buildUserPrompt(topic) }],
    })
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      throw new AppError(503, 'The ANTHROPIC_API_KEY is invalid or was revoked. Check the key in the backend environment.')
    }
    if (err instanceof Anthropic.RateLimitError) {
      throw new AppError(503, 'Claude API rate limit hit — try again in a minute.')
    }
    if (err instanceof Anthropic.APIError) {
      throw new AppError(502, `Claude API error (${err.status}): ${err.message}`)
    }
    throw err
  }

  if (response.stop_reason === 'refusal') {
    throw new AppError(502, 'The model declined to generate this topic — try a different topic.')
  }

  const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text')
  if (!textBlock) {
    throw new AppError(502, 'Claude returned no content — try again.')
  }

  let parsed: z.infer<typeof generatedPostSchema>
  try {
    parsed = generatedPostSchema.parse(JSON.parse(textBlock.text))
  } catch {
    throw new AppError(502, 'Claude returned an unexpected format — try again.')
  }

  return { ...parsed, topic }
}

// ─── Service ───────────────────────────────────────────────────────────────────

const publicSelect = {
  slug: true, title: true, description: true, coverImage: true,
  author: true, tags: true, publishedAt: true, updatedAt: true,
} as const

export const blogService = {
  // Public: published posts, newest first (listing — body omitted)
  async listPublished() {
    return prisma.blogPost.findMany({
      where:   { status: 'PUBLISHED' },
      orderBy: { publishedAt: 'desc' },
      select:  publicSelect,
    })
  },

  // Public: one published post with body
  async getPublishedBySlug(slug: string) {
    return prisma.blogPost.findFirst({
      where:  { slug, status: 'PUBLISHED' },
      select: { ...publicSelect, body: true },
    })
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
        tags:        data.tags ?? [],
        publishedAt: data.status === 'PUBLISHED' ? new Date() : null,
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

  /**
   * Generate an AI draft and save it as a DRAFT post (or PUBLISHED when
   * autoPublish). Slug collisions get a numeric suffix so generation never
   * fails on a duplicate.
   */
  async generate(opts: GenerateOptions & { autoPublish?: boolean } = {}) {
    const draft = await generateDraft(opts)

    let slug = toSlug(draft.slug) || toSlug(draft.title) || `post-${Date.now()}`
    for (let n = 2; await prisma.blogPost.findUnique({ where: { slug } }); n++) {
      slug = `${toSlug(draft.slug)}-${n}`
    }

    const status = opts.autoPublish ? 'PUBLISHED' : 'DRAFT'
    return prisma.blogPost.create({
      data: {
        slug,
        title:       draft.title,
        description: draft.description.slice(0, 500),
        body:        draft.body,
        tags:        draft.tags.slice(0, 10),
        status,
        aiGenerated: true,
        publishedAt: status === 'PUBLISHED' ? new Date() : null,
      },
    })
  },
}
