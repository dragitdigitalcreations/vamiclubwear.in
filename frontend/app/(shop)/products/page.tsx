'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Product } from '@/types/product'
import { ProductCard, ProductCardSkeleton } from '@/components/shop/ProductCard'
import { productsApi } from '@/lib/api'
import { toast } from '@/stores/toastStore'


const CATEGORY_LABELS: Record<string, string> = {
  'anarkali':      'Anarkali',
  'salwar':        'Salwar',
  'sharara-set':   'Sharara Set',
  'churidar-bit':  'Churidar Bit',
  'cotton-salwar': 'Cotton Salwar',
  'modest-wear':   'Modest Wear',
  'pants':         'Pants',
  'duppatta':      'Duppatta',
  'big-size':      'Big Size',
}

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
        <div className="mx-auto w-full px-4 sm:px-6 md:px-8 lg:px-10">
          <div className="flex items-end gap-6 py-10">
            <div>
              <p className="mb-1 t-micro">Vami</p>
              <h1 className="t-h1">Collections</h1>
              {categorySlug && CATEGORY_LABELS[categorySlug] && (
                <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                  {CATEGORY_LABELS[categorySlug]}
                </p>
              )}
            </div>
            {total > 0 && !loading && (
              <p className="mb-1 text-sm text-muted">{total} pieces</p>
            )}
          </div>

        </div>
      </div>

      {/* Grid */}
      <div className="mx-auto w-full px-4 sm:px-6 md:px-8 lg:px-10 py-10">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="skeleton"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 md:gap-4"
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
              className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 md:gap-4"
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
      <div className="mx-auto w-full px-4 sm:px-6 md:px-8 lg:px-10 py-10">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 md:gap-4">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton aspect-[3/4] rounded" />)}
        </div>
      </div>
    }>
      <ProductsContent />
    </Suspense>
  )
}
