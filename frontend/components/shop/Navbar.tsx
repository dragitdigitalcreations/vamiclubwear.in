'use client'

import Link from 'next/link'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ShoppingBag, Menu, X, Search, User, Heart, SlidersHorizontal } from 'lucide-react'
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

export function Navbar() {
  const [scrolled,    setScrolled]    = useState(false)
  const [mobileOpen,  setMobileOpen]  = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)
  const router         = useRouter()

  const { toggleCart }     = useCartStore()
  const totalItems         = useCartStore(selectTotalItems)
  const { toggleWishlist } = useWishlistStore()
  const wishlistCount      = useWishlistStore(selectWishlistCount)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!searchQuery.trim()) return
    router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
    setSearchQuery('')
    searchInputRef.current?.blur()
  }

  return (
    <>
      {/* ═══════════════ HEADER ═══════════════ */}
      <header
        className={cn(
          'fixed top-0 left-0 right-0 z-50 transition-all duration-500',
          scrolled
            ? 'bg-background/96 backdrop-blur-md shadow-[0_1px_0_0_rgba(0,0,0,0.06)]'
            : 'bg-transparent'
        )}
      >
        {/* ── Row 1 : Logo | Search | Icons ── */}
        <div className="mx-auto flex h-14 max-w-7xl items-center px-4 md:px-8 gap-3 md:gap-5">

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 -ml-2 text-on-background flex-shrink-0"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          {/* Logo — left anchor */}
          <Link href="/" aria-label="Vami Clubwear — Home" className="flex-shrink-0">
            <VamiLogo height={28} />
          </Link>

          {/* Search bar — desktop center, fills remaining space */}
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
            {/* Filter icon — divider + link to products with filters */}
            <span className="h-4 w-px bg-border flex-shrink-0" />
            <button
              type="button"
              onClick={() => router.push('/products')}
              className="flex-shrink-0 text-muted hover:text-on-background transition-colors"
              aria-label="Open filters"
              title="Filter products"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
            </button>
          </form>

          {/* Mobile: push icons to the right */}
          <div className="flex-1 md:hidden" />

          {/* ── Icons group — right anchor ── */}
          <div className="flex items-center gap-0 flex-shrink-0">

            {/* Mobile: search icon routes to /search */}
            <button
              className="md:hidden p-2 text-muted hover:text-on-background transition-colors"
              aria-label="Search"
              onClick={() => router.push('/search')}
            >
              <Search className="h-4 w-4" />
            </button>

            {/* Wishlist */}
            <button
              onClick={toggleWishlist}
              className="relative p-2 text-muted hover:text-on-background transition-colors"
              aria-label={`Wishlist (${wishlistCount})`}
            >
              <Heart className={`h-4 w-4 transition-colors ${wishlistCount > 0 ? 'text-primary-light fill-primary-light' : ''}`} />
              {wishlistCount > 0 && (
                <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                  {wishlistCount > 9 ? '9+' : wishlistCount}
                </span>
              )}
            </button>

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

        {/* ── Row 2 : Nav links centered (desktop only) ── */}
        <div
          className={cn(
            'hidden md:flex justify-center items-center gap-8 h-9 transition-all duration-500',
            scrolled
              ? 'border-t border-border/50'
              : 'border-t border-white/15'
          )}
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted transition-colors hover:text-on-background whitespace-nowrap"
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
