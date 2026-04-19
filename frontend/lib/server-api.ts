// Server-side API client — uses Next.js fetch caching for ISR
// Only for use in Server Components (no token, no browser APIs)

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

  list: (params: Record<string, string | number | boolean> = {}, revalidate = 30) => {
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
