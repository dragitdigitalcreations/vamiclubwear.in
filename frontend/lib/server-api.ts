// Server-side API client — uses Next.js fetch caching for ISR
// Only for use in Server Components (no token, no browser APIs)

import { isRetaqoCatalogEnabled, retaqoList } from './retaqo-catalog'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

// Thrown only when the backend positively says the resource does not exist
// (HTTP 404). Callers use this to decide between `notFound()` (a real 404 that
// Google can drop from the index) and letting the error bubble into a 500 —
// a transient backend blip must never be served as a 404, because Google
// removes 404'd URLs from the index and re-discovering them is slow.
export class ApiNotFoundError extends Error {
  readonly status = 404
  constructor(message: string) {
    super(message)
    this.name = 'ApiNotFoundError'
  }
}

async function serverFetch<T>(
  path: string,
  revalidate: number | false = 3600,
): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    next: revalidate === false
      ? { revalidate: 0 }
      : { revalidate },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    const message = body.error ?? `API error ${res.status}`
    if (res.status === 404) throw new ApiNotFoundError(message)
    throw new Error(message)
  }
  return res.json()
}

export const serverProductsApi = {
  // 30s TTL — admin price/detail edits surface across SSR pages within half a minute.
  getBySlug: (slug: string) =>
    serverFetch<any>(`/products/slug/${encodeURIComponent(slug)}`, 30),

  // Stage 50 — when RETAQO_CATALOG_ENABLED=1 and the Retaqo env is fully
  // configured, route the listing through Retaqo's public catalog API
  // (giving us Stage 49A media.delivery URLs and Stage 49B category
  // filter + edge cache for free). On failure or when the flag is off
  // we fall through to the legacy Vami backend so the storefront keeps
  // serving normally during rollout.
  list: async (
    params: Record<string, string | number | boolean> = {},
    revalidate: number | false = 30,
  ) => {
    if (isRetaqoCatalogEnabled()) {
      const page = typeof params.page === 'number' ? params.page : Number(params.page ?? 1) || 1
      const limit = typeof params.limit === 'number' ? params.limit : Number(params.limit ?? 50) || 50
      const displayCategorySlug =
        typeof params.category === 'string' && params.category.length > 0 ? params.category : undefined
      const result = await retaqoList({
        page,
        limit,
        displayCategorySlug,
        revalidate,
      })
      if (result) return result
      // Fall through to the legacy backend on null (env incomplete, fetch
      // error, etc.). Keeps the storefront alive even if Retaqo blips.
    }

    const qs = new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)])
    ).toString()
    return serverFetch<any>(`/products${qs ? `?${qs}` : ''}`, revalidate)
  },

  listCategories: () =>
    serverFetch<any[]>('/products/categories', 3600),
}

// The backend rejects `limit` above 100 (zod: "Number must be less than or
// equal to 100"), so a single `list({ limit: 500 })` 400s. That failure used to
// be swallowed by the sitemap's catch block and ship a sitemap with zero
// product URLs — invisible, and fatal for indexing. Page through instead.
const MAX_PAGE_SIZE = 100
const MAX_PAGES = 25

export interface CatalogProduct {
  slug: string
  updatedAt?: string
}

/** Every active product, following pagination to the end of the catalog. */
export async function listAllActiveProducts(
  revalidate: number | false = 3600,
): Promise<CatalogProduct[]> {
  const collected: CatalogProduct[] = []
  const seen = new Set<string>()

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const result = await serverProductsApi.list(
      { page, limit: MAX_PAGE_SIZE, isActive: 'true' },
      revalidate,
    )
    const batch = (result?.data ?? result ?? []) as CatalogProduct[]
    if (!Array.isArray(batch) || batch.length === 0) break

    for (const item of batch) {
      // Slugs are not unique in the catalog today (23 products share the slug
      // "anarkali"), and only one of them can ever own the URL — de-duplicate
      // so the same URL is not advertised repeatedly.
      if (!item?.slug || seen.has(item.slug)) continue
      seen.add(item.slug)
      collected.push(item)
    }

    const totalPages = Number(result?.totalPages ?? 1)
    if (!Number.isFinite(totalPages) || page >= totalPages) break
  }

  return collected
}
