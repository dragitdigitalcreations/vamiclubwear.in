'use client'

import Link from 'next/link'
import { useEffect, useState, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { ShoppingBag, Menu, X, Search, User, Heart, SlidersHorizontal, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useCartStore, selectTotalItems } from '@/stores/cartStore'
import { useWishlistStore, selectWishlistCount } from '@/stores/wishlistStore'
import { ProfileDrawer } from '@/components/shop/ProfileDrawer'
import { VamiLogo } from '@/components/shop/VamiLogo'

const NAV_LINKS = [
  { href: '/products',                 label: 'All Collections' },
  { href: '/products?category=fusion', label: 'Fusion Wear' },
  { href: '/products?category=bridal', label: 'Bridal' },
  { href: '/products?category=modest', label: 'Modest Fashion' },
]

const SORT_OPTIONS = [
  { value: 'newest',     label: 'Newest' },
  { value: 'price-asc',  label: 'Price ↑' },
  { value: 'price-desc', label: 'Price ↓' },
]

const CATEGORIES = [
  { slug: '',                    label: 'All' },
  { slug: 'indo-western-fusion', label: 'Fusion' },
  { slug: 'bridal-collection',   label: 'Bridal' },
  { slug: 'modest-wear',         label: 'Modest' },
  { slug: 'dupattas-drapes',     label: 'Dupattas' },
]

export function Navbar() {
  const [scrolled,     setScrolled]     = useState(false)
  const [mobileOpen,   setMobileOpen]   = useState(false)
  const [profileOpen,  setProfileOpen]  = useState(false)
  const [searchQuery,  setSearchQuery]  = useState('')

  // ── Filter dropdown state ──
  const [filterOpen,    setFilterOpen]    = useState(false)
  const [dropCategory,  setDropCategory]  = useState('')
  const [dropSort,      setDropSort]      = useState('newest')
  const filterBtnRef = useRef<HTMLDivElement>(null)

  const searchInputRef = useRef<HTMLInputElement>(null)
  const router         = useRouter()
  const pathname       = usePathname()

  const { toggleCart } = useCartStore()
  const totalItems     = useCartStore(selectTotalItems)
  const wishlistCount  = useWishlistStore(selectWishlistCount)

  // Close filter dropdown on route change
  useEffect(() => { setFilterOpen(false) }, [pathname])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Click-outside to close filter dropdown
  useEffect(() => {
    if (!filterOpen) return
    function handleOutside(e: MouseEvent) {
      if (filterBtnRef.current && !filterBtnRef.current.contains(e.target as Node)) {
        setFilterOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [filterOpen])

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!searchQuery.trim()) return
    router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
    setSearchQuery('')
    searchInputRef.current?.blur()
  }

  function applyFilter() {
    const p = new URLSearchParams()
    if (dropCategory) p.set('category', dropCategory)
    if (dropSort !== 'newest') p.set('sort', dropSort)
    router.push(`/products${p.toString() ? `?${p}` : ''}`)
    setFilterOpen(false)
  }

  return (
    <>
      {/* ═══════════════ HEADER ═══════════════ */}
      <header className="fixed top-0 left-0 right-0 z-50">
        {/* ── Row 1 : Logo | Search | Icons — background lives here only ── */}
        <div
          className={cn(
            'mx-auto flex h-14 max-w-7xl items-center px-4 md:px-8 gap-3 md:gap-5 transition-all duration-500',
            scrolled && 'bg-white/80 shadow-[0_1px_0_0_rgba(0,0,0,0.06)] rounded-b-xl backdrop-blur-sm'
          )}
        >

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 -ml-2 text-on-background flex-shrink-0"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          {/* Logo — frosted pill when transparent so it's legible over any hero */}
          <Link
            href="/"
            aria-label="Vami Clubwear — Home"
            className={cn(
              'flex-shrink-0 transition-all duration-300',
              scrolled
                ? 'rounded-none bg-transparent p-0 shadow-none'
                : 'rounded-full bg-white/75 px-3 py-1.5 shadow-[0_1px_12px_rgba(0,0,0,0.10)] backdrop-blur-md ring-1 ring-black/[0.05]'
            )}
          >
            <VamiLogo size="md" />
          </Link>

          {/* Search bar — desktop */}
          <form
            onSubmit={handleSearchSubmit}
            className="hidden md:flex flex-1 max-w-md mx-auto items-center gap-2 h-9 rounded-full border border-border bg-surface-elevated px-3 transition-all duration-200 focus-within:border-ring focus-within:bg-white focus-within:shadow-sm"
          >
            <Search className="h-3.5 w-3.5 flex-shrink-0 text-muted" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search styles, fabrics…"
              className="flex-1 bg-transparent text-xs text-on-background placeholder:text-muted outline-none min-w-0"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="flex-shrink-0 text-muted hover:text-on-background transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            )}

            {/* ── Filter dropdown trigger ── */}
            <span className="h-4 w-px bg-border flex-shrink-0" />
            <div ref={filterBtnRef} className="relative flex-shrink-0">
              <button
                type="button"
                onClick={() => setFilterOpen((o) => !o)}
                className={cn(
                  'flex items-center justify-center transition-colors',
                  filterOpen ? 'text-on-background' : 'text-muted hover:text-on-background'
                )}
                aria-label="Filter products"
                aria-expanded={filterOpen}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
              </button>

              {/* ── Dropdown panel ── */}
              <AnimatePresence>
                {filterOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.97 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className="absolute right-0 top-[calc(100%+12px)] z-50 w-64 rounded-xl border border-border bg-white shadow-z4 overflow-hidden"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted">Filters</span>
                      <button
                        onClick={() => setFilterOpen(false)}
                        className="text-muted hover:text-on-background transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="p-4 space-y-4">
                      {/* Sort */}
                      <div>
                        <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-muted">Sort by</p>
                        <div className="flex flex-wrap gap-1.5">
                          {SORT_OPTIONS.map((opt) => (
                            <button
                              key={opt.value}
                              onClick={() => setDropSort(opt.value)}
                              className={cn(
                                'inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-medium transition-all duration-150',
                                dropSort === opt.value
                                  ? 'bg-on-background text-white'
                                  : 'bg-surface-elevated text-fg-2 hover:bg-surface-overlay'
                              )}
                            >
                              {dropSort === opt.value && <Check className="h-2.5 w-2.5" />}
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Category */}
                      <div>
                        <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-muted">Category</p>
                        <div className="flex flex-wrap gap-1.5">
                          {CATEGORIES.map((cat) => (
                            <button
                              key={cat.slug}
                              onClick={() => setDropCategory(cat.slug)}
                              className={cn(
                                'inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-medium transition-all duration-150',
                                dropCategory === cat.slug
                                  ? 'bg-brand text-white'
                                  : 'bg-surface-elevated text-fg-2 hover:bg-surface-overlay'
                              )}
                            >
                              {dropCategory === cat.slug && <Check className="h-2.5 w-2.5" />}
                              {cat.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="border-t border-border p-3 flex gap-2">
                      <button
                        onClick={() => { setDropCategory(''); setDropSort('newest') }}
                        className="flex-1 rounded-lg py-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-fg-3 hover:text-fg-1 transition-colors"
                      >
                        Clear
                      </button>
                      <button
                        onClick={applyFilter}
                        className="flex-[2] rounded-lg bg-on-background py-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-white hover:bg-black transition-colors"
                      >
                        View Results
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </form>

          {/* Mobile: push icons right */}
          <div className="flex-1 md:hidden" />

          {/* ── Icons group ── */}
          <div className="flex items-center gap-2 flex-shrink-0">

            {/* Mobile search — outside pill, mobile only */}
            <button
              className="md:hidden p-2 text-muted hover:text-on-background transition-colors"
              aria-label="Search"
              onClick={() => router.push('/search')}
            >
              <Search className="h-4 w-4" />
            </button>

            {/* Wishlist + Profile + Cart — frosted pill matching the logo capsule */}
            <div
              className={cn(
                'flex items-center transition-all duration-300',
                scrolled
                  ? 'rounded-none bg-transparent shadow-none'
                  : 'rounded-full bg-white/75 px-2 py-1 shadow-[0_1px_12px_rgba(0,0,0,0.10)] backdrop-blur-md ring-1 ring-black/[0.05]'
              )}
            >
              {/* Wishlist */}
              <Link
                href="/wishlist"
                className="relative p-2 text-muted hover:text-on-background transition-colors"
                aria-label={`Wishlist (${wishlistCount})`}
              >
                <Heart className={`h-4 w-4 transition-colors ${wishlistCount > 0 ? 'text-primary-light fill-primary-light' : ''}`} />
                {wishlistCount > 0 && (
                  <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                    {wishlistCount > 9 ? '9+' : wishlistCount}
                  </span>
                )}
              </Link>

              {/* Profile */}
              <button
                onClick={() => setProfileOpen(true)}
                className="p-2 text-muted hover:text-on-background transition-colors"
                aria-label="My Profile"
              >
                <User className="h-4 w-4" />
              </button>

              {/* Cart */}
              <button
                onClick={toggleCart}
                className="relative p-2 text-muted hover:text-on-background transition-colors"
                aria-label={`Cart (${totalItems})`}
              >
                <ShoppingBag className="h-4 w-4" />
                {totalItems > 0 && (
                  <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                    {totalItems > 9 ? '9+' : totalItems}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ── Row 2 : Nav links — float freely, no background ── */}
        <div className="hidden md:flex justify-center items-center gap-2 py-2">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'whitespace-nowrap rounded-full px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] transition-all duration-200',
                'backdrop-blur-md border',
                scrolled
                  ? 'bg-black/[0.04] border-black/[0.07] text-fg-3 hover:bg-black/[0.08] hover:border-black/[0.12] hover:text-fg-1'
                  : 'bg-white/[0.65] border-black/[0.07] text-fg-2 hover:bg-white/[0.85] hover:border-black/[0.12] hover:text-fg-1'
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </header>

      {/* ═══════════════ MOBILE DRAWER ═══════════════ */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, x: '-100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '-100%' }}
            transition={{ duration: 0.28, ease: 'easeInOut' }}
            className="fixed inset-y-0 left-0 z-40 w-72 bg-surface pt-16 shadow-2xl"
          >
            {/* Mobile search */}
            <form
              onSubmit={handleSearchSubmit}
              className="mx-4 mt-4 mb-3 flex items-center gap-2 h-10 rounded-full border border-border bg-surface-elevated px-4"
            >
              <Search className="h-3.5 w-3.5 flex-shrink-0 text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search…"
                className="flex-1 bg-transparent text-xs text-on-background placeholder:text-muted outline-none"
              />
            </form>

            <nav className="flex flex-col px-6 pt-1">
              {NAV_LINKS.map((link, i) => (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                >
                  <Link
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="block border-b border-border py-4 text-sm font-medium uppercase tracking-widest text-on-surface hover:text-on-background transition-colors"
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}
              <motion.div
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: NAV_LINKS.length * 0.06 }}
              >
                <Link
                  href="/wishlist"
                  onClick={() => setMobileOpen(false)}
                  className="flex w-full items-center gap-2 border-b border-border py-4 text-sm font-medium uppercase tracking-widest text-on-surface hover:text-on-background transition-colors"
                >
                  <Heart className="h-4 w-4" />
                  Wishlist
                  {wishlistCount > 0 && (
                    <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-surface-elevated text-[10px] font-bold text-on-background">
                      {wishlistCount}
                    </span>
                  )}
                </Link>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: (NAV_LINKS.length + 1) * 0.06 }}
              >
                <button
                  onClick={() => { setMobileOpen(false); setProfileOpen(true) }}
                  className="flex w-full items-center gap-2 border-b border-border py-4 text-sm font-medium uppercase tracking-widest text-on-surface hover:text-on-background transition-colors"
                >
                  <User className="h-4 w-4" />
                  My Orders / Profile
                </button>
              </motion.div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile backdrop */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 bg-black/50 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Profile drawer */}
      <ProfileDrawer open={profileOpen} onClose={() => setProfileOpen(false)} />
    </>
  )
}
