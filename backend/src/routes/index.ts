// Central route aggregator
import { Router } from 'express'
import authRoutes        from '../modules/auth/auth.routes'
import productRoutes     from '../modules/product/product.routes'
import inventoryRoutes   from '../modules/inventory/inventory.routes'
import orderRoutes       from '../modules/order/order.routes'
import publicOrderRoutes from '../modules/order/public-order.routes'
import webhookRoutes     from '../modules/webhook/webhook.routes'
import uploadRoutes      from '../modules/upload/upload.routes'
import statsRoutes       from '../modules/stats/stats.routes'

const router = Router()

router.use('/auth',         authRoutes)
router.use('/products',     productRoutes)
router.use('/inventory',    inventoryRoutes)
router.use('/orders',       orderRoutes)
router.use('/public',       publicOrderRoutes)   // unauthenticated customer checkout
router.use('/webhooks',     webhookRoutes)
router.use('/uploads',      uploadRoutes)
router.use('/stats',        statsRoutes)

export default router
