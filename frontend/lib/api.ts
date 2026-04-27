// Typed API client for the Vami Clubwear backend

// In the browser, use the Next.js rewrite proxy (/api → localhost:3001/api)
// so CORS is never an issue. In server-side contexts use the direct URL.
const BASE_URL = typeof window !== 'undefined'
  ? ''
  : (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001')

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// Read JWT token from Zustand persisted storage (localStorage)
function getToken(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem('vami-auth')
    if (!stored) return null
    const parsed = JSON.parse(stored)
    return parsed?.state?.token ?? null
  } catch {
    return null
  }
}

// Customer (storefront) token — Google-authenticated buyers
function getCustomerToken(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem('vami-customer-auth')
    if (!stored) return null
    const parsed = JSON.parse(stored)
    return parsed?.state?.token ?? null
  } catch {
    return null
  }
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken()

  const res = await fetch(`${BASE_URL}/api${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
    ...init,
  })

  if (res.status === 401 || res.status === 403) {
    // Token expired — clear auth and redirect
    if (typeof window !== 'undefined') {
      localStorage.removeItem('vami-auth')
      if (window.location.pathname.startsWith('/admin') &&
          !window.location.pathname.includes('/login')) {
        window.location.href = '/admin/login'
      }
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new ApiError(res.status, body.error ?? 'Request failed')
  }

  return res.json() as Promise<T>
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export const authApi = {
  login: (email: string, password: string) =>
    request<{ token: string; user: { id: string; name: string; email: string; role: 'ADMIN' | 'MANAGER' | 'STAFF' } }>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify({ email, password }) }
    ),

  me: () => request<{ user: { id: string; email: string; role: string } }>('/auth/me'),

  logout: () => request('/auth/logout', { method: 'POST' }),

  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ ok: boolean; message: string }>('/auth/change-password', {
      method: 'PATCH',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
}

// ── Products ─────────────────────────────────────────────────────────────────

export const productsApi = {
  listCategories: () =>
    request<Array<{ id: string; name: string; slug: string; _count: { products: number } }>>(
      '/products/categories'
    ),

  createCategory: (data: { name: string; slug: string; description?: string; parentId?: string }) =>
    request('/products/categories', { method: 'POST', body: JSON.stringify(data) }),

  list: (params: {
    page?: number
    limit?: number
    categoryId?: string
    category?: string   // slug shorthand
    isActive?: 'true' | 'false'
    isFeatured?: 'true' | 'false'
    search?: string
  } = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)])
    ).toString()
    return request<{
      data: import('@/types/admin').ProductListItem[]
      total: number
      page: number
      limit: number
      totalPages: number
    }>(`/products${qs ? `?${qs}` : ''}`)
  },

  get: (id: string) => request(`/products/${id}`),
  getBySlug: (slug: string) => request(`/products/slug/${slug}`),

  create: (payload: import('@/types/admin').ProductFormData) =>
    request('/products', { method: 'POST', body: JSON.stringify(payload) }),

  update: (id: string, payload: Partial<import('@/types/admin').ProductFormData>) =>
    request(`/products/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),

  delete: (id: string) =>
    request(`/products/${id}`, { method: 'DELETE' }),

  addVariant: (productId: string, variant: import('@/types/admin').VariantFormData) =>
    request(`/products/${productId}/variants`, {
      method: 'POST',
      body: JSON.stringify(variant),
    }),

  getVariantBySku:     (sku: string) => request(`/products/variants/sku/${sku}`),
  getProductByBarcode: (barcode: string) => request<{
    id: string; name: string; slug: string
    variants: Array<{
      id: string; sku: string; size: string | null; color: string | null
      fabric: string | null; style: string | null; price: number
      inventory: Array<{ quantity: number; reserved: number }>
    }>
  }>(`/products/barcode/${encodeURIComponent(barcode)}`),

  getShowcaseVideos: () =>
    request<Array<{
      id: string
      name: string
      slug: string
      basePrice: number
      lowestPrice: number
      media: Array<{ url: string }>
      thumbnail: string | null
    }>>('/products/showcase-videos'),
}

// ── Inventory ─────────────────────────────────────────────────────────────────

export const inventoryApi = {
  listLocations: () =>
    request<Array<{ id: string; name: string; address: string | null }>>('/inventory/locations'),

  createLocation: (data: { name: string; address?: string }) =>
    request('/inventory/locations', { method: 'POST', body: JSON.stringify(data) }),

  list: (page = 1, limit = 50) =>
    request<{ data: import('@/types/admin').InventoryRow[]; total: number }>(
      `/inventory?page=${page}&limit=${limit}`
    ),

  getByVariant: (variantId: string) => request(`/inventory/${variantId}`),

  search: (q: string) =>
    request<Array<{
      id: string
      quantity: number
      reserved: number
      variant: { id: string; sku: string; size: string | null; color: string | null; product: { name: string } }
      location: { id: string; name: string }
    }>>(`/inventory/search?q=${encodeURIComponent(q)}`),

  set: (variantId: string, quantity: number, locationId: string) =>
    request(`/inventory/${variantId}/set`, {
      method: 'PUT',
      body: JSON.stringify({ quantity, locationId }),
    }),

  adjust: (variantId: string, delta: number, locationId: string) =>
    request(`/inventory/${variantId}/adjust`, {
      method: 'POST',
      body: JSON.stringify({ delta, locationId }),
    }),

  syncAll: () =>
    request<{ synced: number; syncedAt: string }>('/inventory/sync-all', { method: 'POST' }),

  backfill: () =>
    request<{ created: number; locationName: string }>('/inventory/backfill', { method: 'POST' }),

  // Look up all variants of a product by its product barcode
  getByBarcode: (barcode: string) =>
    request<{
      productId:   string
      productName: string
      variants: Array<{
        id:           string
        sku:          string
        size:         string | null
        color:        string | null
        fabric:       string | null
        style:        string | null
        price:        number
        availableQty: number
      }>
    }>(`/inventory/by-barcode/${encodeURIComponent(barcode)}`),

  reduce: (variantId: string, quantity = 1) =>
    request<{
      ok: boolean; sku: string
      productName: string; size: string | null; color: string | null
      deducted: number; newQuantity: number
    }>('/inventory/reduce', {
      method: 'PATCH',
      body: JSON.stringify({ variantId, quantity }),
    }),

  listHistory: (variantId?: string, page = 1, limit = 50) => {
    const qs = new URLSearchParams({ page: String(page), limit: String(limit), ...(variantId ? { variantId } : {}) }).toString()
    return request<{
      data: Array<{
        id: string
        variantId: string
        locationId: string | null
        oldQuantity: number
        newQuantity: number
        delta: number
        action: string
        note: string | null
        performedBy: string | null
        createdAt: string
        variant: { sku: string; product: { name: string } }
      }>
      total: number
    }>(`/inventory/history?${qs}`)
  },
}

// ── Orders ────────────────────────────────────────────────────────────────────

export const ordersApi = {
  list: (params: { page?: number; limit?: number; status?: string } = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)])
    ).toString()
    return request<{
      data: Array<{
        id: string
        orderNumber: string
        invoiceNumber: string | null
        customerName: string | null
        status: string
        total: number
        createdAt: string
      }>
      total: number
    }>(`/orders${qs ? `?${qs}` : ''}`)
  },

  get: (id: string) => request(`/orders/${id}`),

  // Public checkout — no auth token, uses /api/public/orders
  // Public checkout — no auth token, uses /api/public/orders
  create: async (payload: {
    customerName?: string
    customerEmail?: string
    customerPhone?: string
    locationId?: string
    notes?: string
    items: Array<{ variantId: string; quantity: number }>
  }): Promise<{ orderNumber: string; total: number; status: string; itemCount: number }> => {
    const url = typeof window !== 'undefined'
      ? '/api/public/orders'
      : `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/api/public/orders`
    const res  = await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    })
    const data = await res.json()
    if (!res.ok) throw new ApiError(res.status, data.error ?? 'Order failed')
    return data
  },

  updateStatus: (id: string, status: string) =>
    request(`/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  // Public order tracking — no auth required
  track: (orderNumber: string) =>
    request<{
      orderNumber:    string
      status:         string
      shippingStatus: string
      awbNumber:      string | null
      trackingUrl:    string | null
      customerName:   string | null
      total:          number
      createdAt:      string
      items: Array<{ quantity: number; variant: { sku: string; product: { name: string } } }>
    }>(`/shipping/order-track/${encodeURIComponent(orderNumber)}`),

  // Customer My Orders — lookup by phone or email (no auth)
  lookup: async (by: { phone?: string; email?: string }): Promise<{
    orders: Array<{
      orderNumber:    string
      status:         string
      shippingStatus: string
      awbNumber:      string | null
      trackingUrl:    string | null
      total:          number
      createdAt:      string
      customerName:   string | null
      items: Array<{
        quantity:  number
        unitPrice: number
        variant: { sku: string; size: string | null; color: string | null; product: { name: string; slug: string } }
      }>
    }>
    count: number
  }> => {
    const qs = new URLSearchParams()
    if (by.phone) qs.set('phone', by.phone)
    if (by.email) qs.set('email', by.email)
    const url = typeof window !== 'undefined'
      ? `/api/public/orders/lookup?${qs}`
      : `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/api/public/orders/lookup?${qs}`
    const res = await fetch(url, { headers: { 'Content-Type': 'application/json' } })
    const data = await res.json()
    if (!res.ok) throw new ApiError(res.status, data.error ?? 'Lookup failed')
    return data
  },

  // Full order detail by order number — no auth
  getPublic: async (orderNumber: string) => {
    const url = typeof window !== 'undefined'
      ? `/api/public/orders/${encodeURIComponent(orderNumber)}`
      : `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/api/public/orders/${encodeURIComponent(orderNumber)}`
    const res = await fetch(url, { headers: { 'Content-Type': 'application/json' } })
    const data = await res.json()
    if (!res.ok) throw new ApiError(res.status, data.error ?? 'Order not found')
    return data as {
      orderNumber: string; status: string; paymentStatus: string
      shippingStatus: string; awbNumber: string | null; trackingUrl: string | null
      total: number; createdAt: string
      customerName: string | null; customerEmail: string | null; customerPhone: string | null
      shippingAddress: string | null; shippingCity: string | null
      shippingState: string | null; shippingPincode: string | null; notes: string | null
      items: Array<{
        quantity: number; unitPrice: number
        variant: { sku: string; size: string | null; color: string | null; product: { name: string; slug: string } }
      }>
    }
  },
}

// ── Shipping ──────────────────────────────────────────────────────────────────

export const shippingApi = {
  createShipment: (orderId: string) =>
    request<{ awbNumber: string; trackingUrl: string; status: string }>(
      `/shipping/${orderId}/create`, { method: 'POST' }
    ),

  trackShipment: (orderId: string) =>
    request<{ awbNumber: string; trackingUrl: string; liveData: any }>(
      `/shipping/${orderId}/track`
    ),

  // Re-send the "shipment booked" email — used when the original auto-send
  // failed (e.g. RESEND_API_KEY wasn't loaded), or when the customer reports
  // they didn't receive their tracking link.
  resendShipmentEmail: (orderId: string) =>
    request<{ ok: true; sentTo: string }>(
      `/shipping/${orderId}/resend-email`, { method: 'POST' }
    ),

  updateInvoice: (orderId: string, data: {
    invoiceNumber?: string
    invoicePdfUrl?: string
    invoiceStatus?: 'PENDING' | 'CREATED'
  }) =>
    request<{ invoiceStatus: string; invoiceNumber: string | null; invoicePdfUrl: string | null }>(
      `/shipping/${orderId}/invoice`,
      { method: 'PATCH', body: JSON.stringify(data) }
    ),

  // Force a Delhivery sync for every active shipment. The backend also runs
  // this on a schedule, so this is the manual "do it now" button.
  syncStatuses: () =>
    request<{
      checked:  number
      updated:  number
      skipped:  number
      errors:   Array<{ orderNumber: string; error: string }>
      changes:  Array<{ orderNumber: string; from: string; to: string }>
    }>('/shipping/sync-statuses', { method: 'POST' }),
}

// ── Uploads ───────────────────────────────────────────────────────────────────

export const uploadsApi = {
  upload: async (files: File[]): Promise<Array<{ url: string; publicId: string; type: 'IMAGE' | 'VIDEO' }>> => {
    const form = new FormData()
    files.forEach((f) => form.append('files', f))

    const token = getToken()
    const res = await fetch(`${BASE_URL}/api/uploads`, {
      method:  'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body:    form,
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: res.statusText }))
      throw new ApiError(res.status, body.error ?? 'Upload failed')
    }

    const data = await res.json()
    return data.uploads
  },
}

// ── Stats (dashboard) — served from the same Express backend ─────────────────

export const statsApi = {
  getSummary: () =>
    request<import('@/types/admin').DashboardStats>('/stats/summary'),
  getSalesChart: (days = 30) =>
    request<import('@/types/admin').SalesDataPoint[]>(`/stats/sales?days=${days}`),
}

// ── POS Webhook log ───────────────────────────────────────────────────────────

export const webhookLogApi = {
  list: (page = 1, limit = 50) =>
    request<{ data: import('@/types/admin').PosSyncEntry[]; total: number }>(
      `/webhooks/log?page=${page}&limit=${limit}`
    ),
}

// Keep legacy alias used in existing admin pages
export const posSyncApi = webhookLogApi

// ── Hero Banners ──────────────────────────────────────────────────────────────

export interface HeroBanner {
  id:           string
  sortOrder:    number
  isActive:     boolean
  eyebrow:      string | null
  titleLine1:   string | null
  titleLine2:   string | null
  subtitle:     string | null
  accentColor:  string
  darkTheme:    boolean
  ctaLabel:     string | null
  ctaHref:      string | null
  ctaAltLabel:  string | null
  ctaAltHref:   string | null
  imageDesktop: string | null
  imageTablet:  string | null
  imageMobile:  string | null
  createdAt:    string
  updatedAt:    string
}

// ── Return Requests ───────────────────────────────────────────────────────────

export type ReturnStatus = 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'RESOLVED'

export interface ReturnRequest {
  id:            string
  orderNumber:   string
  customerName:  string
  customerEmail: string
  customerPhone: string
  reason:        string
  description:   string
  status:        ReturnStatus
  adminNote:     string | null
  resolvedBy:    string | null
  createdAt:     string
  updatedAt:     string
}

export const returnsApi = {
  submit: (data: {
    orderNumber:   string
    customerName:  string
    customerEmail: string
    customerPhone: string
    description:   string
  }) =>
    request<{ id: string; status: string }>('/returns', {
      method: 'POST',
      body:   JSON.stringify(data),
    }),

  list: (params?: { status?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.status) qs.set('status', params.status)
    if (params?.page)   qs.set('page',   String(params.page))
    if (params?.limit)  qs.set('limit',  String(params.limit))
    return request<{ data: ReturnRequest[]; total: number; page: number; pages: number }>(
      `/returns${qs.toString() ? `?${qs}` : ''}`
    )
  },

  get: (id: string) => request<ReturnRequest>(`/returns/${id}`),

  update: (id: string, data: { status: ReturnStatus; adminNote?: string }) =>
    request<ReturnRequest>(`/returns/${id}`, {
      method: 'PATCH',
      body:   JSON.stringify(data),
    }),
}

// ── Customer Auth (Google Sign-In) ────────────────────────────────────────────

export interface CustomerProfile {
  id:      string
  email:   string
  name:    string
  picture: string | null
}

async function customerRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getCustomerToken()
  const res = await fetch(`${BASE_URL}/api${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
    ...init,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new ApiError(res.status, body.error ?? 'Request failed')
  }
  return res.json() as Promise<T>
}

export const customerAuthApi = {
  google: (credential: string) =>
    customerRequest<{ token: string; user: CustomerProfile }>('/customer/google', {
      method: 'POST',
      body:   JSON.stringify({ credential }),
    }),

  me: () => customerRequest<{ user: CustomerProfile }>('/customer/me'),

  orders: () =>
    customerRequest<{
      orders: Array<{
        orderNumber:    string
        status:         string
        paymentStatus:  string
        shippingStatus: string
        awbNumber:      string | null
        trackingUrl:    string | null
        total:          number
        createdAt:      string
        customerName:   string | null
        items: Array<{
          quantity:  number
          unitPrice: number
          variant: {
            sku:     string
            size:    string | null
            color:   string | null
            product: { name: string; slug: string }
          }
        }>
      }>
      count: number
    }>('/customer/orders'),
}

// ── Customer Reviews ──────────────────────────────────────────────────────────

export interface CustomerReview {
  id:           string
  customerName: string
  body:         string
  createdAt:    string
}

export const reviewsApi = {
  list: () => request<{ data: CustomerReview[] }>('/reviews'),

  submit: (data: { customerName: string; email: string; body: string }) =>
    request<CustomerReview>('/reviews', {
      method: 'POST',
      body:   JSON.stringify(data),
    }),

  listAll: () =>
    request<{ data: Array<CustomerReview & { email: string; isApproved: boolean }> }>('/reviews/admin'),

  setApproval: (id: string, isApproved: boolean) =>
    request<CustomerReview & { email: string; isApproved: boolean }>(`/reviews/${id}`, {
      method: 'PATCH',
      body:   JSON.stringify({ isApproved }),
    }),

  delete: (id: string) =>
    request<void>(`/reviews/${id}`, { method: 'DELETE' }),
}

// ── Hero Banners ──────────────────────────────────────────────────────────────

export const bannersApi = {
  // Public — active banners for storefront
  list: () => request<HeroBanner[]>('/banners'),

  // Admin — all banners
  listAll: () => request<HeroBanner[]>('/banners/admin'),

  create: (data: Partial<HeroBanner>) =>
    request<HeroBanner>('/banners', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: Partial<HeroBanner>) =>
    request<HeroBanner>(`/banners/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  delete: (id: string) =>
    request<{ ok: boolean }>(`/banners/${id}`, { method: 'DELETE' }),
}

// ── Coupons ───────────────────────────────────────────────────────────────────

export interface Coupon {
  id:               string
  code:             string
  description?:     string | null
  type:             'PERCENT' | 'FIXED'
  value:            string | number
  minOrderAmount:   string | number
  maxDiscount?:     string | number | null
  usageLimit:       number
  usageCount:       number
  perCustomerLimit: number
  startsAt?:        string | null
  expiresAt?:       string | null
  isActive:         boolean
  createdAt:        string
  updatedAt:        string
}

export interface CouponValidationResult {
  ok:          boolean
  code:        string
  type:        'PERCENT' | 'FIXED'
  value:       number
  discount:    number
  description?: string | null
}

export const couponsApi = {
  // Public — validate a code for the current cart subtotal (no redemption)
  validate: (code: string, subtotal: number, customerEmail?: string) =>
    request<CouponValidationResult>('/coupons/validate', {
      method: 'POST',
      body: JSON.stringify({ code, subtotal, customerEmail }),
    }),

  // Admin
  list: () => request<Coupon[]>('/coupons'),
  create: (data: Partial<Coupon>) =>
    request<Coupon>('/coupons', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Coupon>) =>
    request<Coupon>(`/coupons/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<{ ok: boolean }>(`/coupons/${id}`, { method: 'DELETE' }),
}

// ── Presence (admin live concurrent users) ────────────────────────────────────

export const presenceApi = {
  count: () => request<{ count: number; windowMs: number; ts: number }>('/presence/count'),
  heartbeat: (sessionId: string) =>
    fetch(`${BASE_URL}/api/presence/heartbeat`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ sessionId }),
      keepalive: true,
    }).catch(() => null),
}
