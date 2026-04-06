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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
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
    request<{ token: string; user: { id: string; name: string; email: string; role: 'ADMIN' | 'MANAGER' } }>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify({ email, password }) }
    ),

  me: () => request<{ user: { id: string; email: string; role: string } }>('/auth/me'),

  logout: () => request('/auth/logout', { method: 'POST' }),
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

  addVariant: (productId: string, variant: import('@/types/admin').VariantFormData) =>
    request(`/products/${productId}/variants`, {
      method: 'POST',
      body: JSON.stringify(variant),
    }),

  getVariantBySku: (sku: string) => request(`/products/variants/sku/${sku}`),
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
