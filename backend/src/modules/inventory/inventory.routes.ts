import { Router } from 'express'
import { inventoryController } from './inventory.controller'
import { validate } from '../../middleware/validateRequest'
import { requireAuth } from '../../middleware/auth'
import {
  setInventorySchema,
  adjustInventorySchema,
  createLocationSchema,
} from './inventory.schema'

const router = Router()

// ── Locations ──────────────────────────────────────────────────────────────
// GET  /api/inventory/locations
// POST /api/inventory/locations   [admin]

router.get('/locations', inventoryController.listLocations)
router.post(
  '/locations',
  requireAuth,
  validate(createLocationSchema),
  inventoryController.createLocation
)

// ── Inventory ──────────────────────────────────────────────────────────────
// GET  /api/inventory                          — all rows, paginated
// GET  /api/inventory/search?q=               — search by SKU or product name
// GET  /api/inventory/history                  — full change log
// GET  /api/inventory/:variantId               — by variant (all locations)
// PUT  /api/inventory/:variantId/set    [mgr]  — set absolute quantity
// POST /api/inventory/:variantId/adjust [mgr]  — +/- delta with optimistic lock

router.get('/',           inventoryController.listAll)
router.get('/search',     inventoryController.search)
router.get('/history',    requireAuth, inventoryController.listHistory)
router.post('/sync-all',  requireAuth, inventoryController.syncAll)
router.get('/:variantId', inventoryController.getByVariant)

router.put(
  '/:variantId/set',
  requireAuth,
  validate(setInventorySchema),
  inventoryController.setQuantity
)

router.post(
  '/:variantId/adjust',
  requireAuth,
  validate(adjustInventorySchema),
  inventoryController.adjustQuantity
)

export default router
