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
import adminRoutes       from '../modules/admin/admin.routes'
import paymentRoutes     from '../modules/payment/payment.routes'
import shippingRoutes    from '../modules/shipping/shipping.routes'
import bannerRoutes      from '../modules/banner/banner.routes'
import returnsRoutes     from '../modules/returns/returns.routes'

const router = Router()

router.use('/auth',         authRoutes)
router.use('/admin',        adminRoutes)
router.use('/products',     productRoutes)
router.use('/inventory',    inventoryRoutes)
router.use('/orders',       orderRoutes)
router.use('/public',       publicOrderRoutes)   // unauthenticated customer checkout
router.use('/payment',      paymentRoutes)       // Razorpay checkout
router.use('/shipping',     shippingRoutes)      // Delhivery shipping + invoice
router.use('/webhooks',     webhookRoutes)
router.use('/uploads',      uploadRoutes)
router.use('/stats',        statsRoutes)
router.use('/banners',      bannerRoutes)
router.use('/returns',      returnsRoutes)       // damage return requests

export default router
