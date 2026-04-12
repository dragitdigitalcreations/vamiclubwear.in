import { Router, Request, Response, NextFunction } from 'express'
import { requireAuth } from '../../middleware/auth'
import { bannerService } from './banner.service'

const router = Router()

// ── GET /api/banners — public, returns active banners for storefront ──────────
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const banners = await bannerService.listActive()
    res.json(banners)
  } catch (err) {
    next(err)
  }
})

// ── GET /api/banners/admin — admin: all banners including inactive ─────────────
router.get('/admin', requireAuth, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const banners = await bannerService.listAll()
    res.json(banners)
  } catch (err) {
    next(err)
  }
})

// ── POST /api/banners — create a new banner slide ─────────────────────────────
router.post('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const banner = await bannerService.create(req.body)
    res.status(201).json(banner)
  } catch (err) {
    next(err)
  }
})

// ── PATCH /api/banners/:id — update a banner slide ────────────────────────────
router.patch('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const banner = await bannerService.update(req.params.id, req.body)
    res.json(banner)
  } catch (err) {
    next(err)
  }
})

// ── DELETE /api/banners/:id ───────────────────────────────────────────────────
router.delete('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await bannerService.delete(req.params.id)
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

export default router
