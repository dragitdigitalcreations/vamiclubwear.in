// Shared TypeScript types for the Vami Clubwear admin dashboard

export type UserRole = 'ADMIN' | 'MANAGER' | 'STAFF'

export interface AdminUser {
  id: string
  name: string | null
  email: string
  role: UserRole
}

// Sections accessible per role
export type AdminSection =
  | 'dashboard'
  | 'products'
  | 'inventory'
  | 'orders'
  | 'pos-sync'
  | 'users'

export const SECTION_ROLES: Record<AdminSection, UserRole[]> = {
  dashboard: ['ADMIN', 'MANAGER', 'STAFF'],
  products:  ['ADMIN', 'MANAGER'],
  inventory: ['ADMIN', 'MANAGER'],
  orders:    ['ADMIN', 'MANAGER', 'STAFF'],
  'pos-sync': ['ADMIN'],
  users:     ['ADMIN'],
}

// ─── Product & Variant form types ───────────────────────────────────────────

export type FabricType =
  | 'Pure Silk'
  | 'Georgette'
  | 'Chiffon'
  | 'Velvet'
  | 'Crepe'
  | 'Cotton'
  | 'Net'
  | 'Organza'
  | 'Lycra Blend'

export type FabricWeight = 'Light' | 'Medium' | 'Heavy'

export type EmbroideryType =
  | 'Zari Work'
  | 'Thread Embroidery'
  | 'Mirror Work'
  | 'Sequin Work'
  | 'Aari Embroidery'
  | 'Block Print'
  | 'Digital Print'
  | 'Hand Painted'
  | 'Plain / Unembellished'

export type SizeOption =
  | 'XS'
  | 'S'
  | 'M'
  | 'L'
  | 'XL'
  | 'XXL'
  | 'Free Size'
  | 'Custom'

export interface CustomMeasurements {
  bust?: string
  waist?: string
  hip?: string
  length?: string
  unit: 'inches' | 'cm'
}

export interface VariantFormData {
  // Dim 1 — Size
  size: SizeOption | string
  customMeasurements?: CustomMeasurements

  // Dim 2 — Colour
  color: string
  colorHex?: string

  // Dim 3 — Fabric
  fabric: FabricType | string
  fabricWeight?: FabricWeight

  // Dim 4 — Embroidery
  embroideryType: EmbroideryType | string

  // Dim 5 — Set composition
  setPieces?: number
  setComponents?: string[]

  // Pricing & identity
  priceModifier: number
  sku: string
}

export interface ProductFormData {
  name: string
  slug: string
  description?: string
  care?: string
  basePrice: number
  categoryId: string
  isFeatured: boolean
  variants: VariantFormData[]
}

// ─── Dashboard stats ─────────────────────────────────────────────────────────

export interface DashboardStats {
  totalRevenue: number
  revenueChange: number   // % change vs previous period
  totalOrders: number
  ordersChange: number
  activeProducts: number
  lowStockItems: number   // inventory quantity < 5
  pendingSyncs: number    // POS syncs with status PENDING or FAILED
}

export interface SalesDataPoint {
  date: string            // 'YYYY-MM-DD'
  revenue: number
  orders: number
}

// ─── POS Sync ────────────────────────────────────────────────────────────────

export type SyncStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'SKIPPED'

export interface PosSyncEntry {
  id: string
  source: 'TALLY' | 'ZOHO'
  status: SyncStatus
  rowsAffected: number | null
  errorMessage: string | null
  createdAt: string
  processedAt: string | null
}

// ─── Inventory ───────────────────────────────────────────────────────────────

export interface InventoryRow {
  id: string
  sku: string
  productName: string
  size: string | null
  color: string | null
  quantity: number
  reserved: number
  available: number       // quantity - reserved
  posItemCode: string | null
  lastSyncAt: string | null
}

// ─── Product list ────────────────────────────────────────────────────────────

export interface ProductListItem {
  id: string
  name: string
  slug: string
  basePrice: number
  category: string
  variantCount: number
  isActive: boolean
  isFeatured: boolean
  createdAt: string
}
