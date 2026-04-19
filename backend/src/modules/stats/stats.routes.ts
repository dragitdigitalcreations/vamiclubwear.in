import { Router, Request, Response, NextFunction } from 'express'
import { prisma } from '../../lib/prisma'

const router = Router()

// GET /api/stats/summary
router.get('/summary', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const now       = new Date()
    const start30   = new Date(now); start30.setDate(now.getDate() - 30)
    const start60   = new Date(now); start60.setDate(now.getDate() - 60)

    const [
      activeProducts,
      totalOrders,
      revenueResult,
      prevRevenueResult,
      prevOrderCount,
      lowStockCount,
      pendingSyncs,
    ] = await Promise.all([
      prisma.product.count({ where: { isActive: true, deletedAt: null } }),
      prisma.order.count({
        where: { createdAt: { gte: start30 }, paymentStatus: 'PAID' },
      }),
      prisma.order.aggregate({
        _sum: { total: true },
        where: { createdAt: { gte: start30 }, paymentStatus: 'PAID' },
      }),
      prisma.order.aggregate({
        _sum: { total: true },
        where: { createdAt: { gte: start60, lt: start30 }, paymentStatus: 'PAID' },
      }),
      prisma.order.count({
        where: { createdAt: { gte: start60, lt: start30 }, paymentStatus: 'PAID' },
      }),
      prisma.inventory.count({ where: { quantity: { lte: 5 } } }),
      prisma.webhookLog.count({ where: { status: { in: ['PENDING', 'FAILED'] } } }).catch(() => 0),
    ])

    const totalRevenue = Number(revenueResult._sum.total ?? 0)
    const prevRevenue  = Number(prevRevenueResult._sum.total ?? 0)

    const pct = (curr: number, prev: number) =>
      prev === 0 ? 0 : Math.round(((curr - prev) / prev) * 1000) / 10

    res.json({
      activeProducts,
      totalOrders,
      totalRevenue,
      revenueChange: pct(totalRevenue, prevRevenue),
      ordersChange:  pct(totalOrders, prevOrderCount),
      lowStockItems: lowStockCount,
      pendingSyncs,
    })
  } catch (err) {
    next(err)
  }
})

// GET /api/stats/sales?days=30
router.get('/sales', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const days = Math.min(Number(req.query.days ?? 30), 365)
    const since = new Date()
    since.setDate(since.getDate() - days)

    const orders = await prisma.order.findMany({
      where: {
        createdAt: { gte: since },
        paymentStatus: 'PAID',
      },
      select: { createdAt: true, total: true },
      orderBy: { createdAt: 'asc' },
    })

    // Group by date
    const byDate = new Map<string, { revenue: number; orders: number }>()
    for (const o of orders) {
      const key = o.createdAt.toISOString().slice(0, 10)
      const existing = byDate.get(key) ?? { revenue: 0, orders: 0 }
      existing.revenue += Number(o.total)
      existing.orders  += 1
      byDate.set(key, existing)
    }

    const data = Array.from(byDate.entries()).map(([date, v]) => ({
      date,
      revenue: v.revenue,
      orders:  v.orders,
    }))

    res.json(data)
  } catch (err) {
    next(err)
  }
})

export default router
