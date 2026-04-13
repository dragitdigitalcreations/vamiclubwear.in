'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { SlidersHorizontal, X } from 'lucide-react'
import { useFilterStore } from '@/stores/filterStore'
import { Product } from '@/types/product'
import { ProductCard, ProductCardSkeleton } from '@/components/shop/ProductCard'
import { productsApi } from '@/lib/api'
import { toast } from '@/stores/toastStore'

const CATEGORIES = [
  { slug: '',                    label: 'All' },
  { slug: 'indo-western-fusion', label: 'Fusion Wear' },
  { slug: 'bridal-collection',   label: 'Bridal' },
  { slug: 'modest-wear',         label: 'Modest Fashion' },
  { slug: 'dupattas-drapes',     label: 'Dupattas' },
]

const SORT_OPTIONS = [
  { value: 'newest',     label: 'Newest First' },
  { value: 'price-asc',  label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
]

const fadeUp = {
  hidden:  { opacity: 0, y: 24 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: i * 0.06 },
  }),
}

function ProductsContent() {
  const searchParams = useSearchParams()
  const router       = useRouter()

  const categorySlug = searchParams.get('category') ?? ''
  const sortParam    = searchParams.get('sort') ?? 'newest'
  const pageParam    = Number(searchParams.get('page') ?? '1')

  const { openFilter } = useFilterStore()

  const [products,   setProducts]   = useState<Product[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [total,      setTotal]      = useState(0)
  const [loading,    setLoading]    = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await productsApi.list({
        page:     pageParam,
        limit:    12,
        category: categorySlug || undefined,
        isActive: 'true' as any,
        // Pass sort as a custom param — the service resolves it server-side
        ...(sortParam === 'price-asc'  && { sortBy: 'price',      sortDir: 'asc'  } as any),
        ...(sortParam === 'price-desc' && { sortBy: 'price',      sortDir: 'desc' } as any),
      })
      setProducts((result as any).data ?? [])
      setTotalPages((result as any).totalPages ?? 1)
      setTotal((result as any).total ?? 0)
    } catch {
      toast.error('Failed to load products. Is the backend running?')
      setProducts([])
    } finally {
      setLoading(false)
    }
  }, [categorySlug, sortParam, pageParam])

  useEffect(() => { load() }, [load])

  function setParam(key: string, value: string) {
    const p = new URLSearchParams(searchParams.toString())
    if (value) p.set(key, value); else p.delete(key)
    p.delete('page')
    router.push(`/products?${p}`)
  }

  function setPage(p: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(p))
    router.push(`/products?${params}`)
  }

  return (
    <div className="pt-16">
      {/* Header */}
      <div className="border-b border-border">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="flex items-end gap-6 py-10">
            <div>
              <p className="mb-1 t-micro">Vami</p>
              <h1 className="t-h1">Collections</h1>
            </div>
            {total > 0 && !loading && (
              <p className="mb-1 text-sm text-muted">{total} pieces</p>
            )}
          </div>

          {/* Category tabs */}
          <div className="flex items-center gap-6 overflow-x-auto no-scrollbar">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.slug}
                onClick={() => setParam('category', cat.slug)}
                className={`flex-shrink-0 pb-3 text-xs font-medium uppercase tracking-widest border-b-2 transition-colors ${
                  categorySlug === cat.slug
                    ? 'border-on-background text-on-background'
                    : 'border-transparent text-muted hover:text-on-background'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="sticky top-16 z-20 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-8">
          <button
            onClick={openFilter}
            className="flex items-center gap-2 text-xs text-muted transition-colors hover:text-on-background"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>{loading ? '…' : `${total} results`}</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted">Sort:</span>
            <select
              value={sortParam}
              onChange={(e) => setParam('sort', e.target.value)}
              className="bg-transparent text-xs font-medium text-on-background outline-none cursor-pointer"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-surface text-on-background">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {categorySlug && (
          <div className="mx-auto max-w-7xl px-4 pb-2 md:px-8">
            <button
              onClick={() => setParam('category', '')}
              className="inline-flex items-center gap-1.5 bg-surface px-3 py-1 text-[10px] font-medium uppercase tracking-widest text-on-background"
            >
              {CATEGORIES.find((c) => c.slug === categorySlug)?.label ?? categorySlug}
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>

      {/* Grid */}
      <div className="mx-auto max-w-7xl px-4 py-10 md:px-8">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="skeleton"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 md:gap-5"
            >
              {Array.from({ length: 8 }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </motion.div>
          ) : products.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-32 text-center"
            >
              <p className="font-display text-2xl font-semibold text-on-background">
                No pieces found
              </p>
              <p className="mt-2 text-sm text-muted">
                Try adjusting your filters or browse all collections.
              </p>
              <button
                onClick={() => setParam('category', '')}
                className="mt-6 text-xs font-medium uppercase tracking-widest text-on-background underline underline-offset-4"
              >
                Clear Filters
              </button>
            </motion.div>
          ) : (
            <motion.div
              key={`grid-${categorySlug}-${sortParam}-${pageParam}`}
              className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 md:gap-5"
            >
              {products.map((product, i) => (
                <motion.div
                  key={product.id}
                  variants={fadeUp}
                  initial="hidden"
                  animate="visible"
                  custom={i}
                >
                  <ProductCard product={product} priority={i < 4} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pagination */}
        {totalPages > 1 && !loading && (
          <div className="mt-16 flex items-center justify-center gap-2">
            <button
              onClick={() => setPage(pageParam - 1)}
              disabled={pageParam <= 1}
              className="px-4 py-2 text-xs font-medium uppercase tracking-widest border border-border text-muted transition-colors hover:border-on-background hover:text-on-background disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Prev
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`px-3.5 py-2 text-xs font-medium transition-colors ${
                  p === pageParam
                    ? 'bg-primary text-white'
                    : 'border border-border text-muted hover:border-on-background hover:text-on-background'
                }`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage(pageParam + 1)}
              disabled={pageParam >= totalPages}
              className="px-4 py-2 text-xs font-medium uppercase tracking-widest border border-border text-muted transition-colors hover:border-on-background hover:text-on-background disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ProductsPage() {
  return (
    <Suspense fallback={
      <div className="mx-auto max-w-7xl px-4 py-10 md:px-8">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 md:gap-5">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton aspect-[3/4] rounded" />)}
        </div>
      </div>
    }>
      <ProductsContent />
    </Suspense>
  )
}
