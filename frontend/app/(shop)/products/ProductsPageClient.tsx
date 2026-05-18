'use client'

import { useEffect, useState, useCallback, useMemo, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { SlidersHorizontal, X } from 'lucide-react'
import { Product } from '@/types/product'
import { ProductCard, ProductCardSkeleton } from '@/components/shop/ProductCard'
import { productsApi } from '@/lib/api'
import { toast } from '@/stores/toastStore'
import { CATEGORIES } from '@/lib/categories'


const CATEGORY_LABELS: Record<string, string> = {
  ...Object.fromEntries(CATEGORIES.map((c) => [c.slug, c.label])),
  'big-size':      'Big Size',
}

// Order matters — drives the chip row left to right.
const FILTER_CHIPS: Array<{ slug: string; label: string }> = [
  { slug: '',           label: 'All' },
  ...CATEGORIES.map((c) => ({ slug: c.slug, label: c.label })),
  { slug: 'big-size',   label: 'Big Size' },
]

const SORT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'newest',     label: 'Newest first'        },
  { value: 'price-asc',  label: 'Price: low to high'  },
  { value: 'price-desc', label: 'Price: high to low'  },
]

const fadeUp = {
  hidden:  { opacity: 0, y: 24 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const, delay: i * 0.06 },
  }),
}

interface InitialData {
  products: Product[]
  total: number
  totalPages: number
  category: string
  sort: string
  page: number
  sizes: string
  colors: string
}

type Facets = {
  sizes: string[]
  colors: Array<{ name: string; hex: string | null }>
}

// CSV ↔ array helpers — kept inline so the URL stays the source of truth and
// we never have to reconcile a separate `selectedSizes` state with searchParams.
function csvToArr(s: string): string[] {
  return s ? s.split(',').map((v) => v.trim()).filter(Boolean) : []
}
function toggleCsv(csv: string, value: string): string {
  const set = new Set(csvToArr(csv))
  if (set.has(value)) set.delete(value); else set.add(value)
  return Array.from(set).join(',')
}

function ProductsContent({ initial }: { initial?: InitialData }) {
  const searchParams = useSearchParams()
  const router       = useRouter()

  const categorySlug = searchParams.get('category') ?? ''
  const sortParam    = searchParams.get('sort') ?? 'newest'
  const pageParam    = Number(searchParams.get('page') ?? '1')
  const sizesParam   = searchParams.get('sizes')  ?? ''
  const colorsParam  = searchParams.get('colors') ?? ''

  const selectedSizes  = useMemo(() => csvToArr(sizesParam),  [sizesParam])
  const selectedColors = useMemo(() => csvToArr(colorsParam), [colorsParam])

  // Hydrate with SSR data when the URL matches the server-fetched query.
  const matchesInitial = !!initial
    && initial.category === categorySlug
    && initial.sort     === sortParam
    && initial.page     === pageParam
    && initial.sizes    === sizesParam
    && initial.colors   === colorsParam

  const [products,   setProducts]   = useState<Product[]>(matchesInitial ? initial!.products   : [])
  const [totalPages, setTotalPages] = useState(           matchesInitial ? initial!.totalPages : 1)
  const [total,      setTotal]      = useState(           matchesInitial ? initial!.total      : 0)
  const [loading,    setLoading]    = useState(!matchesInitial)
  const [hydrated,   setHydrated]   = useState(false)

  const [facets, setFacets] = useState<Facets>({ sizes: [], colors: [] })
  const [filtersOpen, setFiltersOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await productsApi.list({
        page:     pageParam,
        limit:    20,
        category: categorySlug || undefined,
        isActive: 'true' as any,
        // Pass sort as a custom param — the service resolves it server-side
        ...(sortParam === 'price-asc'  && { sortBy: 'price', sortDir: 'asc'  } as const),
        ...(sortParam === 'price-desc' && { sortBy: 'price', sortDir: 'desc' } as const),
        ...(sizesParam  && { sizes:  sizesParam  }),
        ...(colorsParam && { colors: colorsParam }),
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
  }, [categorySlug, sortParam, pageParam, sizesParam, colorsParam])

  useEffect(() => {
    // First mount with matching SSR data — skip the refetch to avoid flash.
    if (!hydrated && matchesInitial) {
      setHydrated(true)
      return
    }
    setHydrated(true)
    load()
  }, [load, hydrated, matchesInitial])

  // Refetch facets whenever the category changes so the chip row only shows
  // sizes/colours that exist in that collection. Big-size is a virtual filter
  // so we always fetch the global facet set there.
  useEffect(() => {
    let cancelled = false
    const cat = categorySlug && categorySlug !== 'big-size' ? categorySlug : undefined
    productsApi.facets(cat)
      .then((f) => { if (!cancelled) setFacets(f) })
      .catch(() => { if (!cancelled) setFacets({ sizes: [], colors: [] }) })
    return () => { cancelled = true }
  }, [categorySlug])

  function setParam(key: string, value: string) {
    const p = new URLSearchParams(searchParams.toString())
    if (value) p.set(key, value); else p.delete(key)
    p.delete('page')
    router.push(`/products?${p}`)
  }

  function toggleSize(size: string)  { setParam('sizes',  toggleCsv(sizesParam,  size))  }
  function toggleColor(color: string) { setParam('colors', toggleCsv(colorsParam, color)) }
  function clearAllVariantFilters() {
    const p = new URLSearchParams(searchParams.toString())
    p.delete('sizes'); p.delete('colors'); p.delete('page')
    router.push(`/products?${p}`)
  }

  function setPage(p: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(p))
    router.push(`/products?${params}`)
  }

  const activeFilterCount = selectedSizes.length + selectedColors.length

  return (
    <div className="pt-24">
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

      {/* Filters + sort toolbar */}
      <div className="border-b border-border bg-surface/40">
        <div className="mx-auto w-full px-4 sm:px-6 md:px-8 lg:px-10 py-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {/* Category chips — horizontal scroll on mobile */}
          <div
            role="tablist"
            aria-label="Filter by category"
            className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 md:flex-wrap md:overflow-visible"
          >
            {FILTER_CHIPS.map(({ slug, label }) => {
              const active = (categorySlug || '') === slug
              return (
                <button
                  key={slug || 'all'}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setParam('category', slug)}
                  className={`flex-shrink-0 rounded-full border px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors ${
                    active
                      ? 'border-on-background bg-on-background text-white'
                      : 'border-border text-muted hover:border-on-background hover:text-on-background'
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Filters toggle — opens size/colour panel below */}
            <button
              type="button"
              onClick={() => setFiltersOpen((v) => !v)}
              aria-expanded={filtersOpen}
              aria-controls="variant-filter-panel"
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors ${
                filtersOpen || activeFilterCount > 0
                  ? 'border-on-background text-on-background'
                  : 'border-border text-muted hover:border-on-background hover:text-on-background'
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="rounded-full bg-on-background text-white px-1.5 py-0.5 text-[10px] leading-none">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Sort dropdown */}
            <label className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
              <span>Sort</span>
              <select
                value={sortParam}
                onChange={(e) => setParam('sort', e.target.value === 'newest' ? '' : e.target.value)}
                className="rounded-full border border-border bg-transparent px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-on-background outline-none focus:border-on-background"
                aria-label="Sort products"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {/* Variant filter panel */}
        <AnimatePresence initial={false}>
          {filtersOpen && (
            <motion.div
              id="variant-filter-panel"
              key="variant-filter-panel"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] as const }}
              className="overflow-hidden border-t border-border"
            >
              <div className="mx-auto w-full px-4 sm:px-6 md:px-8 lg:px-10 py-5 grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Sizes */}
                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Size</p>
                  {facets.sizes.length === 0 ? (
                    <p className="text-xs text-muted">No sizes available in this collection.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {facets.sizes.map((s) => {
                        const active = selectedSizes.some((v) => v.toLowerCase() === s.toLowerCase())
                        return (
                          <button
                            key={s}
                            type="button"
                            aria-pressed={active}
                            onClick={() => toggleSize(s)}
                            className={`min-w-[2.5rem] rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors ${
                              active
                                ? 'border-on-background bg-on-background text-white'
                                : 'border-border text-muted hover:border-on-background hover:text-on-background'
                            }`}
                          >
                            {s}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Colours */}
                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Colour</p>
                  {facets.colors.length === 0 ? (
                    <p className="text-xs text-muted">No colours available in this collection.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {facets.colors.map(({ name, hex }) => {
                        const active = selectedColors.some((v) => v.toLowerCase() === name.toLowerCase())
                        return (
                          <button
                            key={name}
                            type="button"
                            aria-pressed={active}
                            onClick={() => toggleColor(name)}
                            className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors ${
                              active
                                ? 'border-on-background bg-on-background text-white'
                                : 'border-border text-muted hover:border-on-background hover:text-on-background'
                            }`}
                          >
                            <span
                              className="inline-block h-3 w-3 rounded-full border border-border"
                              style={hex ? { backgroundColor: hex } : undefined}
                              aria-hidden
                            />
                            <span>{name}</span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active filter pills — always visible when something is selected so
            shoppers can see and remove individual filters without opening the
            panel. */}
        {activeFilterCount > 0 && (
          <div className="border-t border-border">
            <div className="mx-auto w-full px-4 sm:px-6 md:px-8 lg:px-10 py-3 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Active</span>
              {selectedSizes.map((s) => (
                <button
                  key={`pill-size-${s}`}
                  type="button"
                  onClick={() => toggleSize(s)}
                  className="flex items-center gap-1.5 rounded-full border border-on-background bg-on-background/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-on-background"
                >
                  <span>Size: {s}</span>
                  <X className="h-3 w-3" aria-hidden />
                </button>
              ))}
              {selectedColors.map((c) => (
                <button
                  key={`pill-color-${c}`}
                  type="button"
                  onClick={() => toggleColor(c)}
                  className="flex items-center gap-1.5 rounded-full border border-on-background bg-on-background/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-on-background"
                >
                  <span>{c}</span>
                  <X className="h-3 w-3" aria-hidden />
                </button>
              ))}
              <button
                type="button"
                onClick={clearAllVariantFilters}
                className="ml-auto text-[11px] font-semibold uppercase tracking-[0.18em] text-muted hover:text-on-background"
              >
                Clear all
              </button>
            </div>
          </div>
        )}
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
              {Array.from({ length: 20 }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </motion.div>
          ) : products.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-32 text-center px-4"
            >
              <p className="font-display text-2xl font-semibold text-on-background">
                {categorySlug === 'big-size'
                  ? 'Our Big Size collection is being curated'
                  : 'No pieces found'}
              </p>
              <p className="mt-2 text-sm text-muted max-w-md">
                {categorySlug === 'big-size'
                  ? 'New plus-size pieces (XXL through XXXL) are stitched and added every few days. In the meantime, browse our full collection — most styles can be tailored to your size on request.'
                  : activeFilterCount > 0
                    ? 'Try clearing some filters or browse another category.'
                    : 'Try a different category or browse all collections.'}
              </p>
              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                {activeFilterCount > 0 && (
                  <button
                    onClick={clearAllVariantFilters}
                    className="rounded-full bg-on-background px-6 py-2.5 text-xs font-semibold uppercase tracking-widest text-white hover:opacity-90 transition-opacity"
                  >
                    Clear filters
                  </button>
                )}
                <button
                  onClick={() => setParam('category', '')}
                  className="rounded-full border border-border px-6 py-2.5 text-xs font-semibold uppercase tracking-widest text-on-background hover:border-on-background transition-colors"
                >
                  Browse All
                </button>
                {categorySlug === 'big-size' && (
                  <Link
                    href="/contact"
                    className="rounded-full border border-border px-6 py-2.5 text-xs font-semibold uppercase tracking-widest text-on-background hover:border-on-background transition-colors"
                  >
                    Request a Custom Fit
                  </Link>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={`grid-${categorySlug}-${sortParam}-${pageParam}-${sizesParam}-${colorsParam}`}
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

export default function ProductsPageClient({ initial }: { initial?: InitialData }) {
  return (
    <Suspense fallback={
      <div className="mx-auto w-full px-4 sm:px-6 md:px-8 lg:px-10 py-10">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 md:gap-4">
          {Array.from({ length: 20 }).map((_, i) => <div key={i} className="skeleton aspect-[3/4] rounded" />)}
        </div>
      </div>
    }>
      <ProductsContent initial={initial} />
    </Suspense>
  )
}
