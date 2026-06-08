// Server-side API client — uses Next.js fetch caching for ISR
// Only for use in Server Components (no token, no browser APIs)

import { isRetaqoCatalogEnabled, retaqoList } from './retaqo-catalog'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

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
    throw new Error(body.error ?? `API error ${res.status}`)
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
