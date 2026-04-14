'use client'

import Link from 'next/link'
import { useEffect, useState, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { ShoppingBag, Menu, X, Search, User, Heart, SlidersHorizontal, Check, ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useCartStore, selectTotalItems } from '@/stores/cartStore'
import { useWishlistStore, selectWishlistCount } from '@/stores/wishlistStore'
import { ProfileDrawer } from '@/components/shop/ProfileDrawer'
import { VamiLogo } from '@/components/shop/VamiLogo'

const BRAND = '#AE3535'

const SORT_OPTIONS = [
  { value: 'newest',     label: 'Newest' },
  { value: 'price-asc',  label: 'Price ↑' },
  { value: 'price-desc', label: 'Price ↓' },
]

const CATEGORIES = [
  { slug: '',              label: 'All' },
  { slug: 'anarkali',      label: 'Anarkali' },
  { slug: 'salwar',        label: 'Salwar' },
  { slug: 'sharara-set',   label: 'Sharara Set' },
  { slug: 'churidar-bit',  label: 'Churidar Bit' },
  { slug: 'cotton-salwar', label: 'Cotton Salwar' },
  { slug: 'modest-wear',   label: 'Modest Wear'  },
  { slug: 'pants',         label: 'Pants' },
  { slug: 'duppatta',      label: 'Duppatta' },
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

  // ── Category nav dropdown ──
  const [catDropOpen, setCatDropOpen] = useState(false)
  const catDropRef = useRef<HTMLDivElement>(null)

  // ── Adaptive background detection ──
  // Samples the pixel colour directly beneath Row 2 to decide pill style
  const [darkBg, setDarkBg] = useState(false)

  const searchInputRef = useRef<HTMLInputElement>(null)
  const router         = useRouter()
  const pathname       = usePathname()

  const { toggleCart } = useCartStore()
  const totalItems     = useCartStore(selectTotalItems)
  const wishlistCount  = useWishlistStore(selectWishlistCount)

  // Close dropdowns on route change
  useEffect(() => { setFilterOpen(false); setCatDropOpen(false) }, [pathname])

  // Sample the background colour at the Row-2 position and set darkBg
  useEffect(() => {
    let rafId = 0
    const sample = () => {
      const x = window.innerWidth / 2
      const y = 88 // just below both nav rows
      const els = document.elementsFromPoint(x, y)
      for (const el of els) {
        const node = el as HTMLElement
        const cs = window.getComputedStyle(node)
        if (cs.position === 'fixed' || cs.position === 'sticky') continue
        if (node === document.documentElement || node === document.body) continue
        const bg = cs.backgroundColor
        if (!bg || bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent') continue
        const m = bg.match(/[\d.]+/g)
        if (m && m.length >= 3) {
          const lum = (0.299 * +m[0] + 0.587 * +m[1] + 0.114 * +m[2]) / 255
          setDarkBg(lum < 0.5)
          return
        }
      }
    }
    const onScroll = () => {
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(sample)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    sample()
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(rafId) }
  }, [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Click-outside — filter dropdown
  useEffect(() => {
    if (!filterOpen) return
    function handleOutside(e: MouseEvent) {
      if (filterBtnRef.current && !filterBtnRef.current.contains(e.target as Node)) setFilterOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [filterOpen])

  // Click-outside — category dropdown
  useEffect(() => {
    if (!catDropOpen) return
    function handleOutside(e: MouseEvent) {
      if (catDropRef.current && !catDropRef.current.contains(e.target as Node)) setCatDropOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [catDropOpen])

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

  // ── Derived style helpers ──────────────────────────────────────────────────
  // At top: solid brand colour. On scroll: frosted white.
  const onBrand = !scrolled

  return (
    <>
      {/* ═══════════════ HEADER ═══════════════ */}
      <header className="fixed top-0 left-0 right-0 z-50">

        {/* ── Row 1 : Logo | Search | Icons ── */}
        <div
          className="mx-auto flex h-14 max-w-7xl items-center px-4 md:px-8 gap-3 md:gap-5 transition-all duration-500"
          style={scrolled
            ? { background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', boxShadow: '0 1px 0 0 rgba(0,0,0,0.06)', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }
            : { backgroundColor: BRAND, borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}
        >

          {/* Mobile hamburger */}
          <button
            className={cn('md:hidden p-2 -ml-2 flex-shrink-0 transition-colors', onBrand ? 'text-white' : 'text-on-background')}
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          {/* Logo — no capsule; gold logo reads on both red and white */}
          <Link href="/" aria-label="Vami Clubwear — Home" className="flex-shrink-0">
            <VamiLogo size="md" />
          </Link>

          {/* Search bar — desktop */}
          <form
            onSubmit={handleSearchSubmit}
            className={cn(
              'hidden md:flex flex-1 max-w-md mx-auto items-center gap-2 h-9 rounded-full px-3 transition-all duration-200 border',
              onBrand
                ? 'border-white/25 bg-white/15 focus-within:border-white/50 focus-within:bg-white/20'
                : 'border-border bg-surface-elevated focus-within:border-ring focus-within:bg-white focus-within:shadow-sm'
            )}
          >
            <Search className={cn('h-3.5 w-3.5 flex-shrink-0', onBrand ? 'text-white/70' : 'text-muted')} />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search styles, fabrics…"
              className={cn(
                'flex-1 bg-transparent text-xs outline-none min-w-0',
                onBrand ? 'text-white placeholder:text-white/55' : 'text-on-background placeholder:text-muted'
              )}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className={cn('flex-shrink-0 transition-colors', onBrand ? 'text-white/70 hover:text-white' : 'text-muted hover:text-on-background')}
              >
                <X className="h-3 w-3" />
              </button>
            )}

            {/* Filter dropdown trigger */}
            <span className={cn('h-4 w-px flex-shrink-0', onBrand ? 'bg-white/30' : 'bg-border')} />
            <div ref={filterBtnRef} className="relative flex-shrink-0">
              <button
                type="button"
                onClick={() => setFilterOpen((o) => !o)}
                className={cn(
                  'flex items-center justify-center transition-colors',
                  onBrand
                    ? (filterOpen ? 'text-white' : 'text-white/70 hover:text-white')
                    : (filterOpen ? 'text-on-background' : 'text-muted hover:text-on-background')
                )}
                aria-label="Filter products"
                aria-expanded={filterOpen}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
              </button>

              {/* Dropdown panel — always white bg */}
              <AnimatePresence>
                {filterOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.97 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className="absolute right-0 top-[calc(100%+12px)] z-50 w-64 rounded-xl border border-border bg-white shadow-z4 overflow-hidden"
                  >
                    <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted">Filters</span>
                      <button onClick={() => setFilterOpen(false)} className="text-muted hover:text-on-background transition-colors">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="p-4 space-y-4">
                      <div>
                        <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-muted">Sort by</p>
                        <div className="flex flex-wrap gap-1.5">
                          {SORT_OPTIONS.map((opt) => (
                            <button
                              key={opt.value}
                              onClick={() => setDropSort(opt.value)}
                              className={cn(
                                'inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-medium transition-all duration-150',
                                dropSort === opt.value ? 'bg-on-background text-white' : 'bg-surface-elevated text-fg-2 hover:bg-surface-overlay'
                              )}
                            >
                              {dropSort === opt.value && <Check className="h-2.5 w-2.5" />}
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-muted">Category</p>
                        <div className="flex flex-wrap gap-1.5">
                          {CATEGORIES.map((cat) => (
                            <button
                              key={cat.slug}
                              onClick={() => setDropCategory(cat.slug)}
                              className={cn(
                                'inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-medium transition-all duration-150',
                                dropCategory === cat.slug ? 'bg-brand text-white' : 'bg-surface-elevated text-fg-2 hover:bg-surface-overlay'
                              )}
                            >
                              {dropCategory === cat.slug && <Check className="h-2.5 w-2.5" />}
                              {cat.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
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

            {/* Mobile search */}
            <button
              className={cn('md:hidden p-2 transition-colors', onBrand ? 'text-white hover:text-white/80' : 'text-muted hover:text-on-background')}
              aria-label="Search"
              onClick={() => router.push('/search')}
            >
              <Search className="h-4 w-4" />
            </button>

            <div className="flex items-center">
              {/* Wishlist */}
              <Link
                href="/wishlist"
                className={cn('relative p-2 transition-colors', onBrand ? 'text-white hover:text-white/80' : 'text-muted hover:text-on-background')}
                aria-label={`Wishlist (${wishlistCount})`}
              >
                <Heart className={cn('h-4 w-4 transition-colors', wishlistCount > 0 && !onBrand ? 'text-primary-light fill-primary-light' : '')} />
                {wishlistCount > 0 && (
                  <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] font-bold" style={{ color: BRAND }}>
                    {wishlistCount > 9 ? '9+' : wishlistCount}
                  </span>
                )}
              </Link>

              {/* Profile */}
              <button
                onClick={() => setProfileOpen(true)}
                className={cn('p-2 transition-colors', onBrand ? 'text-white hover:text-white/80' : 'text-muted hover:text-on-background')}
                aria-label="My Profile"
              >
                <User className="h-4 w-4" />
              </button>

              {/* Cart */}
              <button
                onClick={toggleCart}
                className={cn('relative p-2 transition-colors', onBrand ? 'text-white hover:text-white/80' : 'text-muted hover:text-on-background')}
                aria-label={`Cart (${totalItems})`}
              >
                <ShoppingBag className="h-4 w-4" />
                {totalItems > 0 && (
                  <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] font-bold" style={{ color: BRAND }}>
                    {totalItems > 9 ? '9+' : totalItems}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ── Row 2 : Nav links ── */}
        <div className="hidden md:flex justify-center items-center gap-2 py-2">

          {/* HOME */}
          <Link
            href="/"
            className={cn(
              'whitespace-nowrap rounded-full px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] transition-all duration-200 border',
              darkBg
                ? 'bg-white/20 backdrop-blur-md border-white/25 text-white hover:bg-white/35'
                : 'bg-black/[0.08] backdrop-blur-md border-black/[0.10] text-fg-1 hover:bg-black/[0.14]'
            )}
          >
            Home
          </Link>

          {/* EXPLORE */}
          <Link
            href="/products"
            className={cn(
              'whitespace-nowrap rounded-full px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] transition-all duration-200 border',
              darkBg
                ? 'bg-white/20 backdrop-blur-md border-white/25 text-white hover:bg-white/35'
                : 'bg-black/[0.08] backdrop-blur-md border-black/[0.10] text-fg-1 hover:bg-black/[0.14]'
            )}
          >
            Explore
          </Link>

          {/* CATEGORY — dropdown */}
          <div ref={catDropRef} className="relative">
            <button
              onClick={() => setCatDropOpen((o) => !o)}
              className={cn(
                'flex items-center gap-1 whitespace-nowrap rounded-full px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] transition-all duration-200 border',
                onBrand
                  ? 'bg-[#AE3535] border-[#8B2828]/50 text-white hover:bg-[#8B2828]'
                  : 'bg-black/[0.04] border-black/[0.07] text-fg-3 hover:bg-black/[0.08] hover:border-black/[0.12] hover:text-fg-1'
              )}
            >
              Category
              <ChevronDown className={cn('h-3 w-3 transition-transform duration-200', catDropOpen && 'rotate-180')} />
            </button>

            <AnimatePresence>
              {catDropOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.97 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className="absolute left-0 top-[calc(100%+8px)] z-50 w-48 rounded-xl border border-border bg-white shadow-z4 overflow-hidden py-1"
                >
                  {CATEGORIES.filter((c) => c.slug !== '').map((cat) => (
                    <Link
                      key={cat.slug}
                      href={`/products?category=${cat.slug}`}
                      onClick={() => setCatDropOpen(false)}
                      className="block px-4 py-2.5 text-[11px] font-medium uppercase tracking-[0.12em] text-fg-2 hover:bg-surface-elevated hover:text-fg-1 transition-colors"
                    >
                      {cat.label}
                    </Link>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* BIG SIZE */}
          <Link
            href="/products?category=big-size"
            className={cn(
              'whitespace-nowrap rounded-full px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] transition-all duration-200 border',
              darkBg
                ? 'bg-white/20 backdrop-blur-md border-white/25 text-white hover:bg-white/35'
                : 'bg-black/[0.08] backdrop-blur-md border-black/[0.10] text-fg-1 hover:bg-black/[0.14]'
            )}
          >
            Big Size
          </Link>
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
              <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0 }}>
                <Link href="/" onClick={() => setMobileOpen(false)}
                  className="block border-b border-border py-4 text-sm font-medium uppercase tracking-widest text-on-surface hover:text-on-background transition-colors">
                  Home
                </Link>
              </motion.div>

              <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.06 }}>
                <Link href="/products" onClick={() => setMobileOpen(false)}
                  className="block border-b border-border py-4 text-sm font-medium uppercase tracking-widest text-on-surface hover:text-on-background transition-colors">
                  Explore
                </Link>
              </motion.div>

              <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.12 }}>
                <button
                  onClick={() => setCatDropOpen((o) => !o)}
                  className="flex w-full items-center justify-between border-b border-border py-4 text-sm font-medium uppercase tracking-widest text-on-surface hover:text-on-background transition-colors"
                >
                  Category
                  <ChevronDown className={cn('h-4 w-4 transition-transform duration-200', catDropOpen && 'rotate-180')} />
                </button>
                <AnimatePresence>
                  {catDropOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="pl-4 pb-2 border-b border-border">
                        {CATEGORIES.filter((c) => c.slug !== '').map((cat) => (
                          <Link
                            key={cat.slug}
                            href={`/products?category=${cat.slug}`}
                            onClick={() => { setMobileOpen(false); setCatDropOpen(false) }}
                            className="block py-2.5 text-xs font-medium uppercase tracking-widest text-muted hover:text-on-background transition-colors"
                          >
                            {cat.label}
                          </Link>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.18 }}>
                <Link href="/products?category=big-size" onClick={() => setMobileOpen(false)}
                  className="block border-b border-border py-4 text-sm font-medium uppercase tracking-widest text-on-surface hover:text-on-background transition-colors">
                  Big Size
                </Link>
              </motion.div>

              <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.24 }}>
                <Link href="/wishlist" onClick={() => setMobileOpen(false)}
                  className="flex w-full items-center gap-2 border-b border-border py-4 text-sm font-medium uppercase tracking-widest text-on-surface hover:text-on-background transition-colors">
                  <Heart className="h-4 w-4" />
                  Wishlist
                  {wishlistCount > 0 && (
                    <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-surface-elevated text-[10px] font-bold text-on-background">
                      {wishlistCount}
                    </span>
                  )}
                </Link>
              </motion.div>

              <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.30 }}>
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
