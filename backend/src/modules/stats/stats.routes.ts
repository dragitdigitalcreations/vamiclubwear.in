import { Router, Request, Response, NextFunction } from 'express'
import { prisma } from '../../lib/prisma'
import { requireAuth } from '../../middleware/auth'
import { cache } from '../../lib/cache'

const router = Router()

// All stats endpoints require an authenticated admin/manager/staff session.
// Without this, revenue, order volume, and stock signals leak publicly.
router.use(requireAuth)

// Allowed time-window presets for the dashboard KPI cards.
// 'all' has no previous-period comparison (no baseline before launch).
const RANGE_DAYS: Record<string, number | null> = {
  '7d':  7,
  '30d': 30,
  '90d': 90,
  '1y':  365,
  'all': null,
}

// GET /api/stats/summary?range=30d — cached 60s; dashboard polls but doesn't need realtime
router.get('/summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawRange = String(req.query.range ?? '30d')
    const range    = rawRange in RANGE_DAYS ? rawRange : '30d'
    const days     = RANGE_DAYS[range]

    const summary = await cache.wrap(`stats:summary:${range}`, async () => {
      const now = new Date()

      // For finite ranges we compute curr (0..days) and prev (days..2*days).
      // For 'all' there is no prev baseline, so we aggregate every PAID order.
      const rangeAgg = days === null
        ? prisma.$queryRaw<Array<{
            bucket: 'curr' | 'prev'
            orders: bigint
            revenue: string | null
          }>>`
            SELECT
              'curr'::text         AS bucket,
              COUNT(*)::bigint     AS orders,
              SUM("total")::text   AS revenue
            FROM "Order"
            WHERE "paymentStatus" = 'PAID'
          `
        : (() => {
            const start = new Date(now); start.setDate(now.getDate() - days)
            const prev  = new Date(now); prev.setDate(now.getDate() - days * 2)
            return prisma.$queryRaw<Array<{
              bucket: 'curr' | 'prev'
              orders: bigint
              revenue: string | null
            }>>`
              SELECT
                CASE WHEN "createdAt" >= ${start} THEN 'curr' ELSE 'prev' END AS bucket,
                COUNT(*)::bigint                                              AS orders,
                SUM("total")::text                                            AS revenue
              FROM "Order"
              WHERE "paymentStatus" = 'PAID'
                AND "createdAt" >= ${prev}
              GROUP BY bucket
            `
          })()

      const [
        activeProducts,
        rangeRows,
        lowStockCount,
        pendingSyncs,
      ] = await Promise.all([
        prisma.product.count({ where: { isActive: true, deletedAt: null } }),
        rangeAgg,
        prisma.inventory.count({ where: { quantity: { lte: 5 } } }),
        prisma.webhookLog.count({ where: { status: { in: ['PENDING', 'FAILED'] } } }).catch(() => 0),
      ])

      const curr = rangeRows.find((r) => r.bucket === 'curr')
      const prev = rangeRows.find((r) => r.bucket === 'prev')
      const totalOrders     = Number(curr?.orders ?? 0)
      const totalRevenue    = Number(curr?.revenue ?? 0)
      const prevOrderCount  = Number(prev?.orders ?? 0)
      const prevRevenue     = Number(prev?.revenue ?? 0)

      const pct = (c: number, p: number) =>
        p === 0 ? 0 : Math.round(((c - p) / p) * 1000) / 10

      return {
        activeProducts,
        totalOrders,
        totalRevenue,
        revenueChange: days === null ? null : pct(totalRevenue, prevRevenue),
        ordersChange:  days === null ? null : pct(totalOrders, prevOrderCount),
        lowStockItems: lowStockCount,
        pendingSyncs,
        range,
      }
    }, 60)

    res.setHeader('Cache-Control', 'private, max-age=30')
    res.json(summary)
  } catch (err) {
    next(err)
  }
})

// GET /api/stats/sales?days=30 — cached 120s; chart doesn't need realtime
router.get('/sales', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const days = Math.min(Number(req.query.days ?? 30), 365)

    const data = await cache.wrap(`stats:sales:${days}`, async () => {
      const since = new Date()
      since.setDate(since.getDate() - days)

      // Aggregate in SQL instead of pulling every order row to Node memory.
      const rows = await prisma.$queryRaw<Array<{
        date: string
        revenue: string
        orders: bigint
      }>>`
        SELECT
          to_char("createdAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS date,
          SUM("total")::text                                    AS revenue,
          COUNT(*)::bigint                                      AS orders
        FROM "Order"
        WHERE "paymentStatus" = 'PAID'
          AND "createdAt" >= ${since}
        GROUP BY date
        ORDER BY date ASC
      `

      return rows.map((r) => ({
        date:    r.date,
        revenue: Number(r.revenue ?? 0),
        orders:  Number(r.orders ?? 0),
      }))
    }, 120)

    res.setHeader('Cache-Control', 'private, max-age=60')
    res.json(data)
  } catch (err) {
    next(err)
  }
})

export default router
