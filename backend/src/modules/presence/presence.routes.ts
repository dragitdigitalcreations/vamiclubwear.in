import { Router, Request, Response } from 'express'
import { requireAuth } from '../../middleware/auth'

/**
 * Lightweight in-memory presence tracker.
 *
 * The storefront pings POST /api/presence/heartbeat every PING_MS. We bucket
 * each unique sessionId with its last-seen timestamp; the count endpoint
 * returns the number of sessions seen within WINDOW_MS. This is intentionally
 * not Redis-backed — single-instance deploys (Railway, Render free tier) get
 * an honest count without extra infra. To scale horizontally, swap this Map
 * for a Redis SET with EXPIRE.
 */

const SESSIONS = new Map<string, number>()
const WINDOW_MS = 60_000          // session counts as live for 60s after last ping

function sweep() {
  const cutoff = Date.now() - WINDOW_MS
  for (const [id, ts] of SESSIONS) {
    if (ts < cutoff) SESSIONS.delete(id)
  }
}

const router = Router()

// Public — storefront heartbeats here every ~20s
router.post('/heartbeat', (req: Request, res: Response) => {
  const sessionId = String(req.body?.sessionId ?? '').slice(0, 64)
  if (!sessionId) return res.status(400).json({ error: 'sessionId required' })
  SESSIONS.set(sessionId, Date.now())
  sweep()
  res.json({ ok: true })
})

// Admin — current concurrent count
router.get('/count', requireAuth, (_req: Request, res: Response) => {
  sweep()
  res.json({ count: SESSIONS.size, windowMs: WINDOW_MS, ts: Date.now() })
})

export default router
