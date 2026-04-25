import { Router, Request, Response, NextFunction } from 'express'
import { requireAuth } from '../../middleware/auth'
import { couponService } from './coupon.service'

const router = Router()

// ── Public: validate a coupon for the current cart subtotal ──────────────────
// POST /api/coupons/validate { code, subtotal, customerEmail? }
router.post('/validate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code, subtotal, customerEmail } = req.body ?? {}
    if (!code || typeof subtotal !== 'number') {
      return res.status(400).json({ error: 'code and subtotal are required' })
    }
    const result = await couponService.validate({ code, subtotal, customerEmail })
    res.json({
      ok:           true,
      code:         result.coupon.code,
      type:         result.coupon.type,
      value:        Number(result.coupon.value),
      discount:     result.discount,
      description:  result.coupon.description,
    })
  } catch (err: any) {
    if (err?.code && typeof err.code === 'string' && err.code !== 'P2002') {
      return res.status(400).json({ ok: false, code: err.code, error: err.message })
    }
    next(err)
  }
})

// ── Admin CRUD ────────────────────────────────────────────────────────────────
router.get('/', requireAuth, async (_req, res, next) => {
  try { res.json(await couponService.list()) } catch (err) { next(err) }
})

router.post('/', requireAuth, async (req, res, next) => {
  try { res.status(201).json(await couponService.create(req.body)) } catch (err) { next(err) }
})

router.patch('/:id', requireAuth, async (req, res, next) => {
  try { res.json(await couponService.update(req.params.id, req.body)) } catch (err) { next(err) }
})

router.delete('/:id', requireAuth, async (req, res, next) => {
  try { await couponService.delete(req.params.id); res.json({ ok: true }) } catch (err) { next(err) }
})

export default router
