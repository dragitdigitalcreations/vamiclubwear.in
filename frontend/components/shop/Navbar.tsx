'use client'

import Link from 'next/link'
import { useEffect, useState, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { ShoppingBag, Menu, X, Search, User, Heart, ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useCartStore, selectTotalItems } from '@/stores/cartStore'
import { useWishlistStore, selectWishlistCount } from '@/stores/wishlistStore'
import { VamiLogo } from '@/components/shop/VamiLogo'

const CATEGORIES = [
  { slug: 'anarkali',      label: 'Anarkali'      },
  { slug: 'salwar',        label: 'Salwar'        },
  { slug: 'sharara-set',   label: 'Sharara Set'   },
  { slug: 'churidar-bit',  label: 'Churidar Bit'  },
  { slug: 'cotton-salwar', label: 'Cotton Salwar' },
  { slug: 'modest-wear',   label: 'Modest Wear'   },
  { slug: 'pants',         label: 'Pants'         },
  { slug: 'duppatta',      label: 'Duppatta'      },
]

const NAV_PILLS = [
  { href: '/',                           label: 'Home'     },
  { href: '/products',                   label: 'Explore'  },
  { href: '/products?category=big-size', label: 'Big Size' },
]

export function Navbar() {
  const [mobileOpen,  setMobileOpen]  = useState(false)
  const [catDropOpen, setCatDropOpen] = useState(false)
  const [searchOpen,  setSearchOpen]  = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const catDropRef     = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const router   = useRouter()
  const pathname = usePathname()

  const totalItems    = useCartStore(selectTotalItems)
  const wishlistCount = useWishlistStore(selectWishlistCount)

  // Close on route change
  useEffect(() => {
    setCatDropOpen(false)
    setMobileOpen(false)
    setSearchOpen(false)
  }, [pathname])

  // Click outside — category dropdown
  useEffect(() => {
    if (!catDropOpen) return
    const fn = (e: MouseEvent) => {
      if (catDropRef.current && !catDropRef.current.contains(e.target as Node))
        setCatDropOpen(false)
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [catDropOpen])

  // Focus search input when panel opens
  useEffect(() => {
    if (searchOpen) setTimeout(() => searchInputRef.current?.focus(), 50)
  }, [searchOpen])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!searchQuery.trim()) return
    router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
    setSearchQuery('')
    setSearchOpen(false)
  }

  function handleMobileSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!searchQuery.trim()) return
    router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
    setSearchQuery('')
    setMobileOpen(false)
  }

  // Active pill = outlined; inactive = solid black
  function isActive(href: string) {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href.split('?')[0])
  }

  return (
    <>
      {/* ══════════════════════ HEADER ══════════════════════ */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#FAF8F5]">

        {/* ── ROW 1: Logo + Nav pills ── */}
        <div className="border-b border-[#C8C0B8]">
          <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-5 md:px-10 h-14">

            {/* Left: hamburger (mobile) + logo + divider */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <button
                className="md:hidden p-1.5 -ml-1 text-fg-3 hover:text-fg-1 transition-colors"
                onClick={() => setMobileOpen(o => !o)}
                aria-label="Toggle menu"
              >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
              <Link href="/" aria-label="Vami Clubwear — Home" className="flex-shrink-0">
                <VamiLogo size="md" />
              </Link>
              {/* Vertical divider — desktop only, separates logo from nav pills */}
              <div className="hidden md:block h-5 w-px bg-[#C8C0B8] ml-2" />
            </div>

            {/* Right: pill nav (desktop only) */}
            <nav className="hidden md:flex items-center gap-2">
              {NAV_PILLS.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'px-5 py-[7px] rounded-full text-[11px] font-semibold uppercase tracking-[0.1em] transition-colors duration-200',
                    isActive(href)
                      ? 'border border-fg-1 bg-transparent text-fg-1'
                      : 'bg-fg-1 text-white hover:bg-[#2a2a2a]'
                  )}
                >
                  {label}
                </Link>
              ))}

              {/* Collections pill — dropdown */}
              <div ref={catDropRef} className="relative">
                <button
                  onClick={() => setCatDropOpen(o => !o)}
                  className={cn(
                    'flex items-center gap-1.5 px-5 py-[7px] rounded-full text-[11px] font-semibold uppercase tracking-[0.1em] transition-colors duration-200',
                    catDropOpen
                      ? 'border border-fg-1 bg-transparent text-fg-1'
                      : 'bg-fg-1 text-white hover:bg-[#2a2a2a]'
                  )}
                >
                  Collections
                  <ChevronDown className={cn('h-3 w-3 transition-transform duration-200', catDropOpen && 'rotate-180')} />
                </button>

                <AnimatePresence>
                  {catDropOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.97 }}
                      transition={{ duration: 0.15, ease: 'easeOut' }}
                      className="absolute left-1/2 -translate-x-1/2 top-[calc(100%+10px)] w-48 bg-[#FAF8F5] border border-border shadow-z4 rounded-xl overflow-hidden py-2"
                    >
                      {CATEGORIES.map(cat => (
                        <Link
                          key={cat.slug}
                          href={`/products?category=${cat.slug}`}
                          onClick={() => setCatDropOpen(false)}
                          className="block px-5 py-2.5 text-[11px] font-medium uppercase tracking-[0.1em] text-fg-2 hover:bg-surface-elevated hover:text-fg-1 transition-colors duration-150"
                        >
                          {cat.label}
                        </Link>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </nav>
          </div>
        </div>

        {/* ── ROW 2: Search icon (left) + Icons (right) ── */}
        <div className="border-b border-[#C8C0B8]">
          <div className="mx-auto flex max-w-[1400px] items-center justify-between px-5 md:px-10 h-10">

            {/* Search icon — left */}
            <button
              onClick={() => setSearchOpen(o => !o)}
              className="p-1 text-fg-3 hover:text-fg-1 transition-colors duration-200"
              aria-label="Search"
            >
              <Search className="h-4 w-4" />
            </button>

            {/* Icons — right */}
            <div className="flex items-center gap-4">

              {/* Cart bag */}
              <Link
                href="/cart"
                className="relative p-1 text-fg-3 hover:text-fg-1 transition-colors duration-200"
                aria-label={`Cart (${totalItems})`}
              >
                <ShoppingBag className="h-[17px] w-[17px]" />
                {totalItems > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-fg-1 text-[8px] font-bold text-white">
                    {totalItems > 9 ? '9+' : totalItems}
                  </span>
                )}
              </Link>

              {/* Profile — circle pill with chevron */}
              <Link
                href="/profile"
                className="flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-fg-3 hover:text-fg-1 hover:border-fg-3 transition-all duration-200"
                aria-label="My Profile"
              >
                <User className="h-3.5 w-3.5" />
                <ChevronDown className="h-3 w-3" />
              </Link>

              {/* Wishlist — heart + text label */}
              <Link
                href="/wishlist"
                className="flex items-center gap-1.5 text-fg-3 hover:text-fg-1 transition-colors duration-200"
                aria-label={`Wishlist (${wishlistCount})`}
              >
                <Heart className={cn('h-[17px] w-[17px] transition-colors', wishlistCount > 0 && 'fill-brand stroke-brand')} />
                <span className="hidden sm:inline text-[11px] font-medium tracking-wide text-fg-2">
                  Wishlist
                </span>
                {wishlistCount > 0 && (
                  <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-brand text-[8px] font-bold text-white">
                    {wishlistCount > 9 ? '9+' : wishlistCount}
                  </span>
                )}
              </Link>
            </div>
          </div>
        </div>

        {/* ── Search panel — slides down ── */}
        <AnimatePresence>
          {searchOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
              className="overflow-hidden border-b border-border bg-[#FAF8F5]"
            >
              <form
                onSubmit={handleSearch}
                className="mx-auto flex max-w-[1400px] items-center gap-4 px-5 md:px-10 py-3"
              >
                <Search className="h-4 w-4 flex-shrink-0 text-fg-4" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search styles, fabrics, collections…"
                  className="flex-1 bg-transparent text-sm text-fg-1 placeholder:text-fg-4 outline-none"
                />
                <button
                  type="button"
                  onClick={() => { setSearchOpen(false); setSearchQuery('') }}
                  className="flex-shrink-0 p-1 text-fg-4 hover:text-fg-1 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ══════════════════════ MOBILE DRAWER ══════════════════════ */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/40 md:hidden"
              onClick={() => setMobileOpen(false)}
            />

            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="fixed inset-y-0 left-0 z-50 w-72 bg-[#FAF8F5] shadow-z5 flex flex-col md:hidden"
            >
              {/* Drawer header */}
              <div className="flex items-center justify-between border-b border-border px-5 py-4 flex-shrink-0">
                <Link href="/" onClick={() => setMobileOpen(false)}>
                  <VamiLogo size="sm" />
                </Link>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="p-1.5 text-fg-3 hover:text-fg-1 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Mobile search */}
              <div className="flex-shrink-0 px-4 pt-4 pb-3">
                <form
                  onSubmit={handleMobileSearch}
                  className="flex items-center gap-2 h-10 border border-border bg-surface-raised rounded-lg px-3"
                >
                  <Search className="h-3.5 w-3.5 flex-shrink-0 text-fg-4" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search…"
                    className="flex-1 bg-transparent text-xs text-fg-1 placeholder:text-fg-4 outline-none"
                  />
                </form>
              </div>

              {/* Mobile nav links */}
              <nav className="flex-1 overflow-y-auto px-5 pb-6">
                {[
                  { href: '/',        label: 'Home'       },
                  { href: '/products',label: 'Explore'    },
                  { href: '/wishlist',label: 'Wishlist'   },
                  { href: '/profile', label: 'My Profile' },
                  { href: '/cart',    label: 'My Bag'     },
                ].map(({ href, label }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileOpen(false)}
                    className="block border-b border-border py-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-fg-2 hover:text-fg-1 transition-colors"
                  >
                    {label}
                  </Link>
                ))}

                {/* Collections expand */}
                <div>
                  <button
                    onClick={() => setCatDropOpen(o => !o)}
                    className="flex w-full items-center justify-between border-b border-border py-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-fg-2 hover:text-fg-1 transition-colors"
                  >
                    Collections
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
                        <div className="pl-4 py-2 border-b border-border space-y-0.5">
                          {CATEGORIES.map(cat => (
                            <Link
                              key={cat.slug}
                              href={`/products?category=${cat.slug}`}
                              onClick={() => { setMobileOpen(false); setCatDropOpen(false) }}
                              className="block py-2.5 text-[10px] font-medium uppercase tracking-[0.15em] text-fg-3 hover:text-fg-1 transition-colors"
                            >
                              {cat.label}
                            </Link>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <Link
                  href="/products?category=big-size"
                  onClick={() => setMobileOpen(false)}
                  className="block border-b border-border py-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-fg-2 hover:text-fg-1 transition-colors"
                >
                  Big Size
                </Link>
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
