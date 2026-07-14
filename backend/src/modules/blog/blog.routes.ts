import { Router, Request, Response, NextFunction } from 'express'
import { requireAuth } from '../../middleware/auth'
import { blogService } from './blog.service'

const router = Router()

// ── Admin (registered before /:slug so "admin" is never treated as a slug) ────

// GET /api/blog/admin/list — all posts including drafts
router.get('/admin/list', requireAuth, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await blogService.listAll())
  } catch (err) { next(err) }
})

// POST /api/blog/admin — create a post
router.post('/admin', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.status(201).json(await blogService.create(req.body))
  } catch (err) { next(err) }
})

// PATCH /api/blog/admin/:id — update / publish / unpublish
router.patch('/admin/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await blogService.update(req.params.id, req.body))
  } catch (err) { next(err) }
})

// DELETE /api/blog/admin/:id
router.delete('/admin/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await blogService.delete(req.params.id)
    res.json({ ok: true })
  } catch (err) { next(err) }
})

// ── Public ─────────────────────────────────────────────────────────────────────

// GET /api/blog — published posts for the storefront listing + sitemap
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await blogService.listPublished())
  } catch (err) { next(err) }
})

// GET /api/blog/:slug — one published post
router.get('/:slug', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const post = await blogService.getPublishedBySlug(req.params.slug)
    if (!post) {
      res.status(404).json({ error: 'Post not found' })
      return
    }
    res.json(post)
  } catch (err) { next(err) }
})

export default router
