/**
 * Blog auto-draft scheduler.
 *
 * Opt-in via env (all default OFF so nothing changes until the operator
 * flips it):
 *   BLOG_AUTO_DRAFT=true       — generate a post automatically
 *   BLOG_AUTO_DRAFT_DAYS=7     — minimum days between auto-generated posts
 *   BLOG_AUTO_PUBLISH=true     — publish immediately instead of saving a
 *                                DRAFT for review (review recommended)
 *
 * Checks once shortly after boot and then every 24h. "Due" is derived from
 * the newest aiGenerated post in the DB, so restarts/redeploys never cause
 * duplicate drafts and no scheduler state needs persisting.
 */

import { prisma } from '../../lib/prisma'
import { blogService } from './blog.service'

const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000 // daily check
const BOOT_DELAY_MS = 90 * 1000               // let the server settle first

async function runOnce(): Promise<void> {
  if (process.env.BLOG_AUTO_DRAFT !== 'true') return
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('[blog] BLOG_AUTO_DRAFT is on but ANTHROPIC_API_KEY is missing — skipping')
    return
  }

  const intervalDays = Number(process.env.BLOG_AUTO_DRAFT_DAYS) || 7
  const cutoff = new Date(Date.now() - intervalDays * 24 * 60 * 60 * 1000)

  const recent = await prisma.blogPost.findFirst({
    where:   { aiGenerated: true, createdAt: { gte: cutoff } },
    select:  { id: true, createdAt: true },
  })
  if (recent) return // not due yet

  const autoPublish = process.env.BLOG_AUTO_PUBLISH === 'true'
  console.log(`[blog] Auto-generating ${autoPublish ? 'and publishing' : 'a draft'} post…`)
  const post = await blogService.generate({ autoPublish })
  console.log(`[blog] Generated "${post.title}" (${post.status}) — /blog/${post.slug}`)
}

export function startBlogDraftScheduler(): void {
  if (process.env.BLOG_AUTO_DRAFT !== 'true') {
    console.log('[blog] Auto-draft scheduler off (set BLOG_AUTO_DRAFT=true to enable)')
    return
  }

  const tick = () => runOnce().catch((err) => console.error('[blog] Auto-draft failed:', err?.message ?? err))
  setTimeout(tick, BOOT_DELAY_MS)
  setInterval(tick, CHECK_INTERVAL_MS)
  console.log('[blog] Auto-draft scheduler ON — daily check, min gap ' +
    `${Number(process.env.BLOG_AUTO_DRAFT_DAYS) || 7} day(s), auto-publish: ${process.env.BLOG_AUTO_PUBLISH === 'true'}`)
}
