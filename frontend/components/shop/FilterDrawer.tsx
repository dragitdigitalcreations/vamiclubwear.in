'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { X, SlidersHorizontal, RotateCcw } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useFilterStore } from '@/stores/filterStore'

const CATEGORIES = [
  { slug: '',                    label: 'All Pieces' },
  { slug: 'indo-western-fusion', label: 'Fusion Wear' },
  { slug: 'bridal-collection',   label: 'Bridal' },
  { slug: 'modest-wear',         label: 'Modest Fashion' },
  { slug: 'dupattas-drapes',     label: 'Dupattas' },
]

const SORT_OPTIONS = [
  { value: 'newest',     label: 'Newest First' },
  { value: 'price-asc',  label: 'Price: Low → High' },
  { value: 'price-desc', label: 'Price: High → Low' },
]

const PRICE_PRESETS = [
  { label: 'Under ₹1,500',   min: '',     max: '1500' },
  { label: '₹1,500 – ₹3,000', min: '1500', max: '3000' },
  { label: '₹3,000 – ₹6,000', min: '3000', max: '6000' },
  { label: 'Above ₹6,000',   min: '6000', max: '' },
]

export function FilterDrawer() {
  const router     = useRouter()

  const {
    isOpen, closeFilter,
    category, sort, priceMin, priceMax,
    setCategory, setSort, setPriceMin, setPriceMax, reset,
  } = useFilterStore()

  function applyFilters() {
    const p = new URLSearchParams()
    if (category) p.set('category', category)
    if (sort && sort !== 'newest') p.set('sort', sort)
    if (priceMin) p.set('minPrice', priceMin)
    if (priceMax) p.set('maxPrice', priceMax)
    p.delete('page')
    router.push(`/products${p.toString() ? `?${p}` : ''}`)
    closeFilter()
  }

  function handleReset() {
    reset()
    router.push('/products')
    closeFilter()
  }

  const activeCount = [
    category !== '',
    sort !== 'newest',
    priceMin !== '',
    priceMax !== '',
  ].filter(Boolean).length

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="filter-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-50 bg-black/50"
            onClick={closeFilter}
          />

          {/* Drawer — slides from left */}
          <motion.div
            key="filter-drawer"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ duration: 0.32, ease: [0.32, 0.72, 0, 1] }}
            className="fixed left-0 top-0 bottom-0 z-50 flex w-80 flex-col bg-surface shadow-z5"
          >

            {/* ── Header ── */}
            <div className="flex items-center justify-between border-b border-border px-6 py-5">
              <div className="flex items-center gap-2.5">
                <SlidersHorizontal className="h-4 w-4 text-primary-light" />
                <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-on-background">
                  Filter & Sort
                </h2>
                {activeCount > 0 && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                    {activeCount}
                  </span>
                )}
              </div>
              <button
                onClick={closeFilter}
                className="rounded-full p-1.5 text-muted transition-colors hover:bg-surface-elevated hover:text-on-background"
                aria-label="Close filters"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* ── Scrollable body ── */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">

              {/* Sort */}
              <div>
                <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.3em] text-muted">Sort By</p>
                <div className="flex flex-col gap-1.5">
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setSort(opt.value)}
                      className={`flex items-center justify-between rounded-[8px] px-4 py-2.5 text-sm transition-all duration-150 ${
                        sort === opt.value
                          ? 'bg-on-background text-white font-medium'
                          : 'bg-surface-elevated text-on-background hover:bg-border'
                      }`}
                    >
                      {opt.label}
                      {sort === opt.value && (
                        <span className="h-1.5 w-1.5 rounded-full bg-primary-light" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Divider */}
              <div className="h-px bg-border" />

              {/* Category */}
              <div>
                <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.3em] text-muted">Category</p>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.slug}
                      onClick={() => setCategory(cat.slug)}
                      className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all duration-150 ${
                        category === cat.slug
                          ? 'bg-on-background text-white'
                          : 'border border-border text-on-background hover:border-on-background'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Divider */}
              <div className="h-px bg-border" />

              {/* Price range */}
              <div>
                <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.3em] text-muted">Price Range</p>

                {/* Preset chips */}
                <div className="mb-4 flex flex-wrap gap-2">
                  {PRICE_PRESETS.map((preset) => {
                    const active = priceMin === preset.min && priceMax === preset.max
                    return (
                      <button
                        key={preset.label}
                        onClick={() => {
                          if (active) { setPriceMin(''); setPriceMax('') }
                          else { setPriceMin(preset.min); setPriceMax(preset.max) }
                        }}
                        className={`rounded-full px-3 py-1 text-[11px] font-medium transition-all duration-150 ${
                          active
                            ? 'bg-primary-light text-white'
                            : 'border border-border text-muted hover:border-primary-light hover:text-primary-light'
                        }`}
                      >
                        {preset.label}
                      </button>
                    )
                  })}
                </div>

                {/* Manual inputs */}
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="Min ₹"
                    value={priceMin}
                    onChange={(e) => setPriceMin(e.target.value)}
                    className="w-full rounded-[8px] border border-border bg-surface-elevated px-3 py-2 text-sm text-on-background placeholder:text-muted outline-none focus:border-ring transition-colors"
                  />
                  <span className="shrink-0 text-xs text-muted">–</span>
                  <input
                    type="number"
                    placeholder="Max ₹"
                    value={priceMax}
                    onChange={(e) => setPriceMax(e.target.value)}
                    className="w-full rounded-[8px] border border-border bg-surface-elevated px-3 py-2 text-sm text-on-background placeholder:text-muted outline-none focus:border-ring transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* ── Footer actions ── */}
            <div className="border-t border-border px-6 py-4 space-y-2">
              <button
                onClick={applyFilters}
                className="w-full rounded-[10px] bg-on-background py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white transition-colors hover:bg-primary-dark"
              >
                Apply Filters
                {activeCount > 0 && ` (${activeCount})`}
              </button>
              {activeCount > 0 && (
                <button
                  onClick={handleReset}
                  className="flex w-full items-center justify-center gap-1.5 py-2 text-xs font-medium text-muted transition-colors hover:text-on-background"
                >
                  <RotateCcw className="h-3 w-3" />
                  Clear all filters
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
