'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Search, X } from 'lucide-react'
import { productsApi } from '@/lib/api'
import { ProductCard } from '@/components/shop/ProductCard'
import type { Product } from '@/types/product'

function SearchResults() {
  const searchParams = useSearchParams()
  const router       = useRouter()
  const q            = searchParams.get('q') ?? ''

  const [query,    setQuery]    = useState(q)
  const [results,  setResults]  = useState<Product[]>([])
  const [loading,  setLoading]  = useState(false)
  const [searched, setSearched] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setQuery(q)
    if (!q.trim()) { setResults([]); setSearched(false); return }
    doSearch(q)
  }, [q])

  async function doSearch(term: string) {
    if (!term.trim()) return
    setLoading(true)
    setSearched(true)
    try {
      const res = await productsApi.list({ search: term, limit: 24, isActive: 'true' })
      setResults(res.data as unknown as Product[])
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  function handleInput(val: string) {
    setQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!val.trim()) {
      router.replace('/search', { scroll: false })
      setResults([]); setSearched(false); return
    }
    debounceRef.current = setTimeout(() => {
      router.replace(`/search?q=${encodeURIComponent(val)}`, { scroll: false })
    }, 400)
  }

  return (
    <div className="mx-auto w-full px-4 sm:px-6 md:px-8 lg:px-10 pt-32 pb-24">
      <div className="mb-10">
        <h1 className="font-display text-3xl font-bold text-on-background mb-6">Search</h1>
        <div className="relative max-w-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <input
            type="text"
            value={query}
            onChange={e => handleInput(e.target.value)}
            placeholder="Search products, fabrics, styles…"
            autoFocus
            className="w-full border border-border bg-surface pl-11 pr-10 py-3 text-sm text-on-background placeholder:text-muted outline-none focus:border-on-background transition-colors"
          />
          {query && (
            <button
              onClick={() => handleInput('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-on-background"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {loading && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 md:gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] bg-surface-elevated animate-pulse" />
          ))}
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <div className="py-20 text-center">
          <p className="text-muted">No results for <span className="text-on-background">"{q}"</span></p>
          <p className="mt-2 text-xs text-muted">Try a different keyword or browse our collections.</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <>
          <p className="text-xs text-muted mb-6">
            {results.length} result{results.length !== 1 ? 's' : ''} for{' '}
            <span className="text-on-background">"{q}"</span>
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 md:gap-4">
            {results.map(p => (
              <ProductCard key={p.id} product={p as any} />
            ))}
          </div>
        </>
      )}

      {!searched && (
        <div className="py-20 text-center text-muted">
          <Search className="mx-auto h-10 w-10 opacity-20 mb-4" />
          <p className="text-sm">Start typing to search our collections</p>
        </div>
      )}
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchResults />
    </Suspense>
  )
}
