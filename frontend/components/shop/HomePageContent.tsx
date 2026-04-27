'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion, useScroll, useTransform, useMotionValue, useSpring } from 'framer-motion'
import { useRef, useEffect, useState, useCallback } from 'react'
import { ArrowRight, ChevronLeft, ChevronRight, Truck, RotateCcw, Zap } from 'lucide-react'
import { productsApi, reviewsApi, type CustomerReview } from '@/lib/api'
import { getPrimaryImage } from '@/types/product'
import type { Product } from '@/types/product'
import { CATEGORIES } from '@/lib/categories'
import { ShopVamiMarquee } from '@/components/shop/ShopVamiMarquee'

// ─── Shared animation ─────────────────────────────────────────────────────────
const fadeUp = {
  hidden:  { opacity: 0, y: 32 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1], delay: i * 0.1 },
  }),
}

// ─── Announcement Bar ─────────────────────────────────────────────────────────
const ANNOUNCE_WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '919XXXXXXXXX'
const ANNOUNCE_WHATSAPP_MSG    = 'Hi Vami Clubwear! I have a query.'
const ANNOUNCE_IG_URL          = 'https://www.instagram.com/vami_clubwear_manjeri/'

function AnnouncementBar() {
  const whatsappUrl = `https://wa.me/${ANNOUNCE_WHATSAPP_NUMBER}?text=${encodeURIComponent(ANNOUNCE_WHATSAPP_MSG)}`
  return (
    <div className="bg-[#111111] text-white" style={{ marginTop: '96px' }}>
      <div className="mx-auto flex max-w-[1400px] md:max-w-[1410px] items-center justify-between px-5 md:px-10 h-9">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em]">
          Get up to 50% off now
        </p>
        <div className="hidden sm:flex items-center gap-4">
          <span className="text-[10px] font-medium tracking-wide text-white/50">
            Connect with us
          </span>
          <span className="border-l border-white/20 h-3" aria-hidden="true" />
          <a href={whatsappUrl} target="_blank" rel="noreferrer" aria-label="Chat on WhatsApp"
            className="text-white/60 hover:text-white transition-colors">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M19.05 4.91A9.82 9.82 0 0 0 12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.14-2.9-7.01zM12.04 20.15h-.01a8.23 8.23 0 0 1-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.21 8.21 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.83 2.42a8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.23 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.25-.64.81-.78.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.39.11-.51.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.42-.14-.01-.31-.01-.48-.01a.91.91 0 0 0-.66.31c-.23.25-.87.85-.87 2.07 0 1.22.89 2.4 1.02 2.57.12.17 1.76 2.69 4.27 3.77.6.26 1.06.41 1.43.53.6.19 1.14.16 1.57.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.11-.22-.17-.47-.29z"/></svg>
          </a>
          <a href={ANNOUNCE_IG_URL} target="_blank" rel="noreferrer" aria-label="Instagram"
            className="text-white/60 hover:text-white transition-colors">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
          </a>
        </div>
      </div>
    </div>
  )
}

// ─── Hero Shop-Vami Marquee — page-scroll driven favicon + "Shop Vami" pairs ──
// Transparent background so the hero artwork shows through. The horizontal
// translation is bound to scrollY so the band only moves while the user
// scrolls (no autoplay).
function ScrollDownMarquee() {
  const { scrollY } = useScroll()
  const x = useTransform(scrollY, [0, 1600], ['0%', '-50%'], { clamp: false })

  return (
    <div className="absolute left-0 right-0 overflow-hidden border-t border-black/10" style={{ bottom: '50px' }}>
      <motion.div className="flex items-center whitespace-nowrap py-3.5" style={{ x }}>
        {Array.from({ length: 24 }).map((_, i) => (
          <span key={i} className="flex items-center gap-4 px-7">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-icon.svg" alt="" aria-hidden="true" className="h-[18px] w-auto select-none" draggable={false} />
            <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-fg-1/85"
              style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
              Shop Vami
            </span>
          </span>
        ))}
      </motion.div>
    </div>
  )
}

// ─── Hero Section ─────────────────────────────────────────────────────────────
function HeroSection() {
  return (
    <section
      className="relative overflow-hidden w-full aspect-[3/5] sm:aspect-auto sm:h-[793px]"
    >
      {/* Mobile background — image at natural cover size, no extra zoom */}
      <div
        className="absolute inset-0 block sm:hidden"
        style={{
          backgroundImage: 'url(/hero-models.webp)',
          backgroundSize: 'cover',
          backgroundPosition: 'center center',
          backgroundRepeat: 'no-repeat',
          backgroundColor: '#BAB3B4',
        }}
      />
      {/* Desktop background — contain so every model is fully visible in frame */}
      <div
        className="absolute inset-0 hidden sm:block"
        style={{
          backgroundImage: 'url(/hero-models.webp)',
          backgroundSize: 'contain',
          backgroundPosition: 'right center',
          backgroundRepeat: 'no-repeat',
          backgroundColor: '#BAB3B4',
        }}
      />

      {/* Left-side wash: stronger on mobile so black text stays legible; centered on desktop */}
      <div className="pointer-events-none absolute inset-0 sm:hidden bg-gradient-to-b from-[#FAF8F5]/95 via-[#FAF8F5]/45 to-transparent" />
      <div className="pointer-events-none absolute inset-0 hidden sm:block bg-gradient-to-r from-[#FAF8F5]/92 via-[#FAF8F5]/55 to-transparent" />

      <div className="relative z-10 flex h-full items-start sm:items-center px-6 pt-10 pb-10 sm:px-16 sm:py-0 lg:px-24">
        <div className="max-w-[560px] w-full flex flex-col">

          <motion.h1
            initial={{ opacity: 0, y: 36 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            className="text-fg-1 uppercase leading-[0.95]"
            style={{
              fontFamily: 'var(--font-poppins), Poppins, sans-serif',
              fontWeight: 400,
              fontSize: 'clamp(38px, 10.5vw, 72px)',
              letterSpacing: '-0.01em',
            }}
          >
            Calling<br />All Fashion<br />Lovers!
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
            className="mt-5 sm:mt-6 text-fg-2"
            style={{
              fontFamily: 'var(--font-poppins), Poppins, sans-serif',
              fontWeight: 500,
              fontSize: 'clamp(13px, 3.8vw, 16px)',
              lineHeight: 1.7,
              maxWidth: '14em',
            }}
          >
            Get up to 50% on our biggest sale yet
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.38 }}
            className="mt-auto sm:mt-8 pt-10 sm:pt-0"
          >
            <Link
              href="/products"
              className="group inline-flex items-center gap-3 rounded-full bg-fg-1 px-7 py-3.5 sm:px-9 sm:py-4 text-white transition-all duration-300 hover:bg-black hover:gap-5"
              style={{
                fontFamily: 'var(--font-poppins), Poppins, sans-serif',
                fontWeight: 400,
                fontSize: 'clamp(13px, 3.8vw, 16px)',
              }}
            >
              Shop Now
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </motion.div>

        </div>
      </div>

      <ScrollDownMarquee />
    </section>
  )
}



// ─── Shared home card — image only, info rendered outside by parent ───────────
function HomeCard({ product }: { product: Product }) {
  const imgUrl = getPrimaryImage(product)
  return (
    <Link
      href={`/products/${product.slug}`}
      className="group relative block w-full h-full overflow-hidden bg-[#F5F1EC]"
    >
      {imgUrl && (
        <Image
          src={imgUrl}
          alt={product.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          sizes="232px"
        />
      )}
    </Link>
  )
}

function HomeCardSkeleton() {
  return <div className="skeleton w-full h-full" />
}

// ─── This Just In — pink horizontal product scroll ────────────────────────────
function ThisJustIn() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading,  setLoading]  = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    productsApi.list({ isActive: 'true', limit: 12 })
      .then((res) => setProducts((res as any).data ?? []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false))
  }, [])

  const scroll = useCallback((dir: 'left' | 'right') => {
    const w = scrollRef.current?.clientWidth ?? 600
    scrollRef.current?.scrollBy({ left: dir === 'right' ? w : -w, behavior: 'smooth' })
  }, [])

  return (
    <section
      style={{ backgroundColor: '#FCE4EB' }}
      className="flex flex-col justify-center overflow-hidden min-h-[580px] sm:h-[810px] py-14 sm:py-0"
    >
      {/* ── ZONE 1: Header ── */}
      <div className="mx-auto w-full max-w-[1242px] px-5">
        <motion.div
          variants={fadeUp} initial="hidden" whileInView="visible"
          viewport={{ once: true }}
        >
          <h2
            className="text-fg-1 uppercase leading-none"
            style={{
              fontFamily: 'var(--font-poppins), Poppins, sans-serif',
              fontWeight: 400,
              fontSize: 'clamp(40px, 5.5vw, 72px)',
              letterSpacing: '-0.01em',
            }}
          >
            This Just In
          </h2>
          <p className="mt-3 text-fg-2 leading-relaxed" style={{ fontSize: '16px', fontFamily: 'var(--font-poppins), Poppins, sans-serif', fontWeight: 400, maxWidth: '200px' }}>
            Shop the best brands from our new arrivals
          </p>
        </motion.div>
      </div>

      {/* ── ZONE 2: Card carousel ── */}
      <div className="mx-auto w-full max-w-[1242px] mt-8">
        <div className="flex items-center gap-3">
          <button
            onClick={() => scroll('left')}
            className="flex-shrink-0 text-fg-1 hover:text-black transition-colors"
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={1.5} />
          </button>

          <div
            ref={scrollRef}
            className="flex flex-1 gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory"
          >
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex-shrink-0 flex flex-col snap-start w-[82vw] sm:w-[236px]">
                    <div className="bg-[#F5F1EC]" style={{ height: '315px' }}><HomeCardSkeleton /></div>
                    <div className="pt-2 space-y-1.5">
                      <div className="skeleton h-2.5 w-3/4 rounded" />
                      <div className="skeleton h-2.5 w-1/3 rounded" />
                    </div>
                  </div>
                ))
              : products.map((product) => (
                  <div key={product.id} className="flex-shrink-0 flex flex-col snap-start w-[82vw] sm:w-[236px]">
                    <div className="relative overflow-hidden bg-[#F5F1EC]" style={{ height: '315px' }}>
                      <HomeCard product={product} />
                    </div>
                    <div className="pt-2">
                      <p className="truncate text-[11px] text-fg-2">{product.name}</p>
                      <p className="mt-0.5 text-[11px] font-semibold text-fg-1">₹{Number(product.basePrice).toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                ))}
          </div>

          <button
            onClick={() => scroll('right')}
            className="flex-shrink-0 text-fg-1 hover:text-black transition-colors"
            aria-label="Scroll right"
          >
            <ChevronRight className="h-5 w-5" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* ── ZONE 3: CTA ── */}
      <div className="mt-10 flex justify-center">
        <Link
          href="/products"
          className="rounded-full border-2 border-white bg-transparent px-7 py-2.5 sm:px-10 sm:py-3 text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.16em] text-fg-1 transition-all duration-300 hover:bg-fg-1 hover:text-white"
        >
          Shop Now
        </Link>
      </div>

    </section>
  )
}

// ─── Category Section — violet (#ADAEF1), mirrors Navbar Collections list ────
function CategorySection() {
  // One representative image per category slug, sourced from the most recent
  // active product in that category. If a category has no products yet we
  // just show a soft placeholder — the card still links correctly.
  const [imageBySlug, setImageBySlug] = useState<Record<string, string | null>>({})
  const [loading,     setLoading]     = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all(
      CATEGORIES.map((c) =>
        productsApi.list({ isActive: 'true', category: c.slug, limit: 1 })
          .then((res) => {
            const prod: Product | undefined = (res as any).data?.[0]
            return [c.slug, prod ? getPrimaryImage(prod) : null] as const
          })
          .catch(() => [c.slug, null] as const)
      )
    ).then((pairs) => {
      if (cancelled) return
      setImageBySlug(Object.fromEntries(pairs))
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  const scroll = useCallback((dir: 'left' | 'right') => {
    const w = scrollRef.current?.clientWidth ?? 600
    scrollRef.current?.scrollBy({ left: dir === 'right' ? w : -w, behavior: 'smooth' })
  }, [])

  return (
    <section
      style={{ backgroundColor: '#ADAEF1' }}
      className="flex flex-col justify-center overflow-hidden min-h-[580px] sm:h-[810px]"
    >
      <div className="mx-auto w-full max-w-[1242px]">

        {/* Header — aligned to card container edge */}
        <motion.div
          variants={fadeUp} initial="hidden" whileInView="visible"
          viewport={{ once: true }}
          className="px-5 pb-7"
        >
          <h2
            className="text-fg-1 uppercase leading-none"
            style={{
              fontFamily: 'var(--font-poppins), Poppins, sans-serif',
              fontWeight: 400,
              fontSize: 'clamp(40px, 5.5vw, 72px)',
              letterSpacing: '-0.01em',
            }}
          >
            Shop by Category
          </h2>
          <p className="mt-3 text-fg-2 leading-relaxed" style={{ fontSize: '16px', fontFamily: 'var(--font-poppins), Poppins, sans-serif', fontWeight: 400 }}>
            Explore our curated collections
          </p>
        </motion.div>

        {/* Card strip with arrows — 236×315 cards, one per CATEGORIES entry */}
        <div className="flex items-center gap-3">

          <button
            onClick={() => scroll('left')}
            className="flex-shrink-0 text-fg-1 hover:text-black transition-colors"
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={1.5} />
          </button>

          <div
            ref={scrollRef}
            className="flex flex-1 overflow-x-auto no-scrollbar snap-x snap-mandatory gap-3 sm:gap-[78px]"
          >
            {loading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex-shrink-0 flex flex-col snap-start w-[82vw] sm:w-[236px]">
                    <div className="bg-[#F5F1EC]" style={{ height: '315px' }}><HomeCardSkeleton /></div>
                    <div className="pt-2 space-y-1.5">
                      <div className="skeleton h-2.5 w-2/3 rounded" />
                    </div>
                  </div>
                ))
              : CATEGORIES.map((cat) => {
                  const imgUrl = imageBySlug[cat.slug]
                  return (
                    <Link
                      key={cat.slug}
                      href={`/products?category=${cat.slug}`}
                      className="group flex-shrink-0 flex flex-col snap-start w-[82vw] sm:w-[236px]"
                    >
                      <div className="relative overflow-hidden bg-[#F5F1EC]" style={{ height: '315px' }}>
                        {imgUrl ? (
                          <Image
                            src={imgUrl}
                            alt={cat.label}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                            sizes="236px"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-[#E8E4DE] text-[11px] font-medium uppercase tracking-[0.18em] text-fg-3/70">
                            Coming soon
                          </div>
                        )}
                      </div>
                      <div className="pt-2">
                        <p className="truncate font-sans font-medium uppercase text-fg-1 transition-colors group-hover:text-black" style={{ fontSize: '20px', letterSpacing: '0.05em' }}>{cat.label}</p>
                      </div>
                    </Link>
                  )
                })}
          </div>

          <button
            onClick={() => scroll('right')}
            className="flex-shrink-0 text-fg-1 hover:text-black transition-colors"
            aria-label="Scroll right"
          >
            <ChevronRight className="h-5 w-5" strokeWidth={1.5} />
          </button>

        </div>

      </div>
    </section>
  )
}

// ─── Promo Section — right-bg parallax only, card fully static ───────────────
function PromoSection() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const [isMobile, setIsMobile] = useState(false)

  // ── Only the right background is animated ─────────────────────────────────
  const rightBgY = useMotionValue(0)

  // Mouse parallax — Y only (no X: taller-div approach has no horizontal buffer)
  const rawMY = useMotionValue(0)
  const my = useSpring(rawMY, { stiffness: 40, damping: 28 })
  const rightBgMY = useTransform(my, v => v * -10)
  const rightBgFinalY = useTransform([rightBgY, rightBgMY], ([s, m]: number[]) => s + m)

  // ── Mobile detection ───────────────────────────────────────────────────────
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // ── RAF + lerp — drives rightBgY on both desktop and mobile ──────────────
  useEffect(() => {
    let raf: number
    let current = 0
    let initialized = false
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t

    const tick = () => {
      const el = sectionRef.current
      if (!el) { raf = requestAnimationFrame(tick); return }
      // On mobile scale travel down so it stays inside the shorter tile
      const factor = isMobile ? 0.25 : 1
      const target = -el.getBoundingClientRect().top * factor
      if (!initialized) { current = target; initialized = true }
      current = lerp(current, target, 0.15)
      rightBgY.set(current)
      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [isMobile, rightBgY])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isMobile || !sectionRef.current) return
    const r = sectionRef.current.getBoundingClientRect()
    rawMY.set((e.clientY - r.top - r.height / 2) / r.height)
  }, [isMobile, rawMY])

  const handleMouseLeave = useCallback(() => {
    rawMY.set(0)
  }, [rawMY])

  // ── Mobile: two-tile editorial with floating accent corner + parallax ────
  if (isMobile) {
    return (
      <section ref={sectionRef} className="relative w-full bg-[#FAF8F5]">
        {/* ── Tile 1: promo-a with top-right text overlay ── */}
        <motion.div
          className="relative w-full overflow-hidden"
          style={{ aspectRatio: '3/4' }}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          viewport={{ once: true }}
        >
          <div className="absolute inset-0" style={{
            backgroundImage: 'url(/promo-a.webp)',
            backgroundSize: 'cover', backgroundPosition: 'center 35%',
            backgroundColor: '#EDE8E1',
          }} />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-l from-[#EDE8E1]/70 via-[#EDE8E1]/20 to-transparent" />

          <div className="relative z-10 flex h-full flex-col items-end px-6 pt-8 text-right">
            <h2 className="text-[#111] uppercase leading-[0.95]" style={{
              fontFamily: 'var(--font-poppins), Poppins, sans-serif',
              fontWeight: 800,
              fontSize: 'clamp(22px, 7vw, 34px)',
              letterSpacing: '-0.01em',
              maxWidth: '60%',
            }}>
              Wear What<br />Moves You
            </h2>
            <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-[#111]/60" style={{
              fontFamily: 'var(--font-poppins), Poppins, sans-serif',
            }}>
              Indo-Western
            </p>
            <Link
              href="/products"
              className="mt-4 inline-flex items-center gap-2 rounded-full border-2 border-white bg-white/80 px-6 py-2.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#111] backdrop-blur-sm transition-all duration-300 hover:bg-[#111] hover:text-white"
            >
              Shop Now
            </Link>
          </div>
        </motion.div>

        {/* ── Tile 2: promo-b with scroll parallax + small accent floating flush in top-left ── */}
        <motion.div
          className="relative w-full overflow-hidden"
          style={{ aspectRatio: '3/4' }}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
          viewport={{ once: true }}
        >
          {/* Parallaxed brown background — taller div gives Y travel head-room */}
          <motion.div
            className="absolute"
            style={{
              left: 0, right: 0,
              top: '-40%',
              height: '180%',
              y: rightBgFinalY,
              willChange: 'transform',
            }}
          >
            <div className="w-full h-full" style={{
              backgroundImage: 'url(/promo-b.webp)',
              backgroundSize: 'cover', backgroundPosition: '50% center',
              backgroundColor: '#3A2A22',
            }} />
          </motion.div>

          <div className="pointer-events-none absolute inset-0"
            style={{ background: 'linear-gradient(to top, rgba(24,16,12,0.85) 0%, rgba(24,16,12,0.25) 55%, transparent 100%)' }} />

          {/* Floating accent tile — flush top-left, no padding on edges */}
          <div
            className="absolute overflow-hidden"
            style={{ top: 0, left: 0, width: '42%', aspectRatio: '1/1', zIndex: 3 }}
          >
            <div className="w-full h-full" style={{
              backgroundImage: 'url(/promo-accent.webp)',
              backgroundSize: 'cover', backgroundPosition: 'center',
              backgroundColor: '#F2EBE0',
            }} />
          </div>

          {/* Bottom-left text overlay */}
          <div className="relative z-10 flex h-full flex-col justify-end px-6 pb-8">
            <h3 className="text-white leading-[1.05]" style={{
              fontFamily: 'var(--font-poppins), Poppins, sans-serif',
              fontWeight: 700,
              fontSize: 'clamp(22px, 6.5vw, 30px)',
              letterSpacing: '-0.01em',
            }}>
              Starting at ₹1,499
            </h3>
            <p className="mt-1.5 text-[12px] text-white/70" style={{
              fontFamily: 'var(--font-poppins), Poppins, sans-serif', fontWeight: 300,
            }}>
              The Everyday Edit
            </p>
            <Link
              href="/products"
              className="mt-4 inline-flex w-fit items-center gap-2 border-2 border-white bg-white px-6 py-2.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-black transition-all duration-300 hover:bg-[#5C4033] hover:text-white"
            >
              Shop Now
            </Link>
          </div>
        </motion.div>
      </section>
    )
  }

  // ── Desktop: right bg animates, everything else static ───────────────────
  return (
    <section
      ref={sectionRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative overflow-hidden select-none"
      style={{ height: '736px' }}
    >

      {/* ── z1: Left image — 50% width, fully static ── */}
      <div
        className="absolute pointer-events-none"
        style={{ left: 0, top: 0, width: '50%', height: '100%', zIndex: 1 }}
      >
        <div className="w-full h-full" style={{
          backgroundImage: 'url(/promo-a.webp)',
          backgroundSize: 'cover', backgroundPosition: 'center 65%',
          backgroundColor: '#EDE8E1',
        }} />
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(to right, rgba(245,241,236,0.3) 0%, rgba(245,241,236,0.08) 60%, transparent 100%)',
        }} />
      </div>

      {/* ── z2: Right background — 50% width, THE ONLY ANIMATED ELEMENT ── */}
      {/* Taller div (736+600=1336px, top:-300) gives ±300px Y travel without scale.   */}
      {/* No horizontal scale → full 720px width available for correct model framing.  */}
      {/* backgroundPosition 87%: model centers at ~509px (between card 309px & edge). */}
      <div
        className="absolute pointer-events-none overflow-hidden"
        style={{ right: 0, top: 0, width: '50%', height: '100%', zIndex: 2 }}
      >
        <motion.div
          className="absolute"
          style={{
            left: 0, right: 0,
            top: 'calc(-100vh)',
            height: 'calc(100% + 200vh)',
            y: rightBgFinalY,
            willChange: 'transform',
          }}
        >
          <div className="w-full h-full" style={{
            backgroundImage: 'url(/promo-b.webp)',
            backgroundSize: 'auto 90%', backgroundPosition: '35% center',
          }} />
        </motion.div>
      </div>

      {/* ── z3: Product card — flush to bottom-left corner of right frame, no shadow ── */}
      {/* left:50% = exact left edge of right frame; bottom:0 = flush to section bottom */}
      <div
        className="absolute group overflow-hidden"
        style={{ left: '50%', bottom: 0, width: '309px', height: '309px', zIndex: 3 }}
      >
        <div
          className="w-full h-full transition-transform duration-700 ease-out group-hover:scale-[1.03]"
          style={{
            backgroundImage: 'url(/promo-accent.webp)',
            backgroundSize: 'cover', backgroundPosition: 'center',
            backgroundColor: '#F2EBE0',
          }}
        />
      </div>

      {/* ── z4: Text block — right-centre of left panel, reference style ── */}
      <motion.div
        className="absolute"
        style={{ left: '27%', top: '36%', zIndex: 4, maxWidth: '230px' }}
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        viewport={{ once: true, margin: '-80px' }}
      >
        <h2
          className="text-[#111] uppercase leading-[0.92]"
          style={{
            fontFamily: 'var(--font-poppins), Poppins, sans-serif',
            fontWeight: 800,
            fontSize: 'clamp(26px, 3vw, 46px)',
            letterSpacing: '-0.01em',
          }}
        >
          Wear What<br />Moves You
        </h2>
        <p className="mt-3 text-[#111]/60" style={{
          fontSize: '12px', fontWeight: 400,
          fontFamily: 'var(--font-poppins), Poppins, sans-serif',
        }}>
          Indo-Western Fusion
        </p>
        <Link
          href="/products"
          className="mt-5 inline-flex items-center gap-2 rounded-full border-2 border-white px-7 py-2.5 text-[11px] font-medium text-[#111] transition-all duration-300 hover:bg-[#111] hover:text-white"
        >
          Shop Now
        </Link>
      </motion.div>

    </section>
  )
}

// ─── About section ────────────────────────────────────────────────────────────
// ─── Customer Reviews ────────────────────────────────────────────────────────
function CustomerReviewsSection() {
  const [reviews, setReviews] = useState<CustomerReview[]>([])
  const [activeIdx, setActiveIdx] = useState(0)
  const [formOpen, setFormOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ customerName: '', email: '', body: '' })
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)

  useEffect(() => {
    let cancelled = false
    reviewsApi.list()
      .then((r) => { if (!cancelled) setReviews(r.data) })
      .catch(() => { if (!cancelled) setReviews([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  // Auto-rotate
  useEffect(() => {
    if (reviews.length < 2) return
    const id = setInterval(() => {
      setActiveIdx((i) => (i + 1) % reviews.length)
    }, 5000)
    return () => clearInterval(id)
  }, [reviews.length])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setFeedback(null)
    try {
      const created = await reviewsApi.submit({
        customerName: form.customerName.trim(),
        email:        form.email.trim(),
        body:         form.body.trim(),
      })
      setReviews((prev) => [created, ...prev])
      setActiveIdx(0)
      setForm({ customerName: '', email: '', body: '' })
      setFormOpen(false)
      setFeedback({ type: 'ok', msg: 'Thank you for sharing your experience.' })
    } catch (err: any) {
      setFeedback({ type: 'err', msg: err?.message ?? 'Something went wrong. Please try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  const active = reviews[activeIdx]

  return (
    <section className="w-full md:h-[465px]">
      <div className="mx-auto grid h-full max-w-[1440px] grid-cols-1 md:grid-cols-2">
        {/* ── Left: white, carousel / submit form ── */}
        <div className="flex h-full flex-col justify-center bg-white px-8 py-10 md:px-14">
          {loading ? (
            <div className="flex items-center justify-center text-[11px] uppercase tracking-[0.2em] text-black/40">
              Loading…
            </div>
          ) : formOpen ? (
            <form onSubmit={handleSubmit} className="mx-auto flex w-full max-w-md flex-col gap-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-black/60">
                Share your experience
              </p>
              <input
                type="text"
                required
                maxLength={120}
                placeholder="Your name"
                value={form.customerName}
                onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                className="border-b border-black/20 bg-transparent py-2 text-sm text-black placeholder:text-black/40 focus:border-black focus:outline-none"
              />
              <input
                type="email"
                required
                maxLength={200}
                placeholder="Email (kept private)"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="border-b border-black/20 bg-transparent py-2 text-sm text-black placeholder:text-black/40 focus:border-black focus:outline-none"
              />
              <textarea
                required
                minLength={4}
                maxLength={600}
                rows={3}
                placeholder="Tell us about your Vami moment…"
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                className="resize-none border-b border-black/20 bg-transparent py-2 text-sm text-black placeholder:text-black/40 focus:border-black focus:outline-none"
              />
              {feedback && (
                <p className={`text-[11px] ${feedback.type === 'ok' ? 'text-green-700' : 'text-red-600'}`}>
                  {feedback.msg}
                </p>
              )}
              <div className="mt-2 flex items-center gap-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-black px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-white transition-opacity hover:opacity-85 disabled:opacity-60"
                >
                  {submitting ? 'Submitting…' : 'Post Review'}
                </button>
                <button
                  type="button"
                  onClick={() => { setFormOpen(false); setFeedback(null) }}
                  className="text-[10px] font-semibold uppercase tracking-[0.22em] text-black/60 hover:text-black"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : reviews.length === 0 ? (
            <div className="mx-auto flex max-w-md flex-col items-start gap-5 text-left">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-black/50">
                Reviews
              </p>
              <h3 className="font-display text-2xl leading-tight text-black md:text-[28px]">
                Be the first to share your experience with us.
              </h3>
              <p className="text-sm leading-[1.75] text-black/60">
                Your words help others discover Vami. Tell us what you loved — one review per person.
              </p>
              <button
                onClick={() => setFormOpen(true)}
                className="bg-black px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-white transition-opacity hover:opacity-85"
              >
                Write a Review
              </button>
            </div>
          ) : (
            <div className="mx-auto flex w-full max-w-md flex-col gap-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-black/50">
                From our customers
              </p>
              <motion.blockquote
                key={active?.id ?? activeIdx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col gap-5"
              >
                <p className="font-display text-lg leading-[1.55] text-black md:text-xl">
                  &ldquo;{active?.body}&rdquo;
                </p>
                <footer className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/70">
                  — {active?.customerName}
                </footer>
              </motion.blockquote>
              <div className="flex items-center justify-between pt-2">
                <div className="flex gap-1.5">
                  {reviews.map((r, i) => (
                    <button
                      key={r.id}
                      onClick={() => setActiveIdx(i)}
                      aria-label={`Go to review ${i + 1}`}
                      className={`h-[6px] rounded-full transition-all ${
                        i === activeIdx ? 'w-6 bg-black' : 'w-[6px] bg-black/25 hover:bg-black/50'
                      }`}
                    />
                  ))}
                </div>
                <button
                  onClick={() => setFormOpen(true)}
                  className="text-[10px] font-semibold uppercase tracking-[0.22em] text-black/70 underline-offset-4 hover:text-black hover:underline"
                >
                  Share yours →
                </button>
              </div>
              {feedback?.type === 'ok' && (
                <p className="text-[11px] text-green-700">{feedback.msg}</p>
              )}
            </div>
          )}
        </div>

        {/* ── Right: black, testimonial lede ── */}
        <div className="flex h-full flex-col justify-center bg-black px-8 py-10 text-white md:px-14">
          <div className="mx-auto flex max-w-md flex-col items-center gap-6 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/50">
              Voices of Vami
            </p>
            <h3 className="font-display text-[32px] leading-[1.1] md:text-[40px]">
              Worn. Loved. <span className="italic text-white/70">Remembered.</span>
            </h3>
            <p className="text-sm leading-[1.85] text-white/70">
              Every piece finds its story in the women who wear it — each one quietly unforgettable.
            </p>
            <div className="mt-2 flex items-center justify-center gap-4">
              <span className="h-px w-14 bg-white/30" />
              <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-white/50">
                Real customers · Real words
              </span>
              <span className="h-px w-14 bg-white/30" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function AboutSection() {
  return (
    <section className="relative overflow-hidden py-16 md:py-20">
      {/* Watermark monogram */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center justify-center select-none"
      >
        <span
          className="font-display font-bold leading-none text-on-background/[0.035]"
          style={{ fontSize: 'clamp(180px, 38vw, 500px)' }}
        >
          V
        </span>
      </div>

      <div className="relative mx-auto max-w-3xl px-6 text-center">
        <motion.h2
          variants={fadeUp} initial="hidden" whileInView="visible"
          viewport={{ once: true }}
          className="font-display text-3xl font-bold text-on-background md:text-4xl"
        >
          About Vami
        </motion.h2>

        <motion.p
          variants={fadeUp} initial="hidden" whileInView="visible"
          viewport={{ once: true }} custom={0.15}
          className="mt-8 text-sm leading-[1.85] text-muted md:text-base"
        >
          Vami Clubwear is a premium Indo-Western fashion label born from the rich cultural
          heritage of Manjeri, Kerala. We reimagine traditional silhouettes — from bespoke
          bridal ensembles to everyday fusion wear — as statements of individuality, grace,
          and quiet luxury. Every piece is crafted with intention, worn with pride.
        </motion.p>

        <motion.div
          variants={fadeUp} initial="hidden" whileInView="visible"
          viewport={{ once: true }} custom={0.28}
          className="mt-10 flex items-center justify-center gap-5"
        >
          <span className="h-px w-20 bg-border/50" />
          <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-muted">
            Manjeri · Kerala · India
          </span>
          <span className="h-px w-20 bg-border/50" />
        </motion.div>
      </div>
    </section>
  )
}

// ─── Benefits cards ───────────────────────────────────────────────────────────
function BenefitsCards() {
  const benefits = [
    { Icon: Truck,     label: 'Free Shipping',          sub: 'On orders ₹2500+' },
    { Icon: RotateCcw, label: 'Easy Return & Exchange', sub: '7-day hassle-free' },
    { Icon: Zap,       label: 'Fast Delivery',          sub: '5–7 business days' },
  ]
  return (
    <section className="mx-auto w-full px-4 sm:px-6 md:px-8 lg:px-10 pb-10">
      <motion.h2
        variants={fadeUp} initial="hidden" whileInView="visible"
        viewport={{ once: true }}
        className="mb-10 text-center font-display text-2xl font-bold text-on-background md:text-3xl"
      >
        Our Benefits
      </motion.h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {benefits.map(({ Icon, label, sub }, i) => (
          <motion.div
            key={label}
            variants={fadeUp} initial="hidden" whileInView="visible"
            viewport={{ once: true }} custom={i * 0.15}
            className="flex items-center gap-5 rounded-2xl border border-border bg-surface px-7 py-7"
          >
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-on-background text-white">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-on-background">{label}</p>
              <p className="mt-0.5 text-[11px] text-muted">{sub}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  )
}


// ─── Modest Collection Banner ─────────────────────────────────────────────────
function ModestCollectionBanner() {
  return (
    <section className="w-full">
      {/* ── Mobile: stacked — black text block on top, image below ── */}
      <div className="md:hidden">
        <motion.div
          className="flex flex-col items-center justify-center bg-[#121212] px-6 py-14 text-center text-white"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          viewport={{ once: true }}
        >
          <h2 className="text-white uppercase leading-[1]" style={{
            fontFamily: 'var(--font-poppins), Poppins, sans-serif',
            fontWeight: 700,
            fontSize: 'clamp(30px, 8.5vw, 44px)',
            letterSpacing: '-0.01em',
          }}>
            Crafted for<br />Every Day
          </h2>

          <p className="mt-4 max-w-[280px] text-white/70" style={{
            fontFamily: 'var(--font-poppins), Poppins, sans-serif',
            fontWeight: 300,
            fontSize: '13px',
            lineHeight: 1.7,
          }}>
            Modest silhouettes in soft-spoken colour — from prayer to celebration.
          </p>

          <Link
            href="/products"
            className="mt-7 inline-flex items-center gap-2.5 rounded-full border-2 border-white px-8 py-3 text-white transition-all duration-300 hover:bg-white hover:text-[#121212]"
            style={{
              fontFamily: 'var(--font-poppins), Poppins, sans-serif',
              fontWeight: 500,
              fontSize: '11px',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
            }}
          >
            Shop Now
          </Link>
        </motion.div>

        <motion.div
          className="relative w-full"
          style={{ aspectRatio: '4/5' }}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          viewport={{ once: true }}
        >
          <div className="absolute inset-0" style={{
            backgroundImage: 'url(/modest-collection.webp)',
            backgroundSize: 'cover',
            backgroundPosition: '80% 25%',
            backgroundRepeat: 'no-repeat',
            backgroundColor: '#8B94AE',
          }} />
        </motion.div>
      </div>

      {/* ── Desktop: original overlay layout ── */}
      <div className="relative overflow-hidden w-full hidden md:block" style={{ aspectRatio: '600/310' }}>
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'url(/modest-collection.webp)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundColor: '#8B94AE',
          }}
        />

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#6E7992]/60 to-transparent" />

        <div className="relative z-10 flex h-full items-center px-16 lg:px-24">
          <div className="max-w-[460px]">
            <motion.p
              variants={fadeUp} initial="hidden" whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              className="text-white/75 uppercase"
              style={{
                fontFamily: 'var(--font-poppins), Poppins, sans-serif',
                fontWeight: 500,
                fontSize: 'clamp(9px, 1vw, 11px)',
                letterSpacing: '0.28em',
              }}
            >
              Modest Edit
            </motion.p>

            <motion.h2
              variants={fadeUp} initial="hidden" whileInView="visible"
              viewport={{ once: true, margin: '-60px' }} custom={0.12}
              className="mt-3 text-white uppercase leading-[0.95]"
              style={{
                fontFamily: 'var(--font-poppins), Poppins, sans-serif',
                fontWeight: 400,
                fontSize: 'clamp(32px, 4.2vw, 60px)',
                letterSpacing: '-0.01em',
              }}
            >
              Crafted for<br />Every Day
            </motion.h2>

            <motion.p
              variants={fadeUp} initial="hidden" whileInView="visible"
              viewport={{ once: true, margin: '-60px' }} custom={0.24}
              className="mt-4 text-white/80"
              style={{
                fontFamily: 'var(--font-poppins), Poppins, sans-serif',
                fontWeight: 300,
                fontSize: 'clamp(12px, 1.2vw, 15px)',
                lineHeight: 1.7,
                maxWidth: '340px',
              }}
            >
              Modest silhouettes in soft-spoken colour. Tailored to move with you — from prayer to celebration.
            </motion.p>

            <motion.div
              variants={fadeUp} initial="hidden" whileInView="visible"
              viewport={{ once: true, margin: '-60px' }} custom={0.36}
            >
              <Link
                href="/products"
                className="group mt-7 inline-flex items-center gap-3 bg-white px-8 py-3.5 text-[#1A1D26] transition-all duration-300 hover:bg-[#1A1D26] hover:text-white hover:gap-5"
                style={{
                  fontFamily: 'var(--font-poppins), Poppins, sans-serif',
                  fontWeight: 500,
                  fontSize: 'clamp(11px, 1vw, 13px)',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                }}
              >
                Explore Collection
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Can't Miss Deals ─── white carousel, mirrors Trending/ThisJustIn ─────────
function FeaturedProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading,  setLoading]  = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    productsApi
      .list({ isFeatured: 'true', isActive: 'true', limit: 12 })
      .then((res) => {
        const data = (res as any).data ?? []
        if (data.length > 0) { setProducts(data); return }
        return productsApi.list({ isActive: 'true', limit: 12 })
          .then((r) => setProducts((r as any).data ?? []))
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false))
  }, [])

  const scroll = useCallback((dir: 'left' | 'right') => {
    const w = scrollRef.current?.clientWidth ?? 600
    scrollRef.current?.scrollBy({ left: dir === 'right' ? w : -w, behavior: 'smooth' })
  }, [])

  return (
    <section
      style={{ backgroundColor: '#FFFFFF' }}
      className="flex flex-col justify-center overflow-hidden min-h-[580px] sm:h-[953px] py-14 sm:py-0"
    >
      {/* ── ZONE 1: Header ── */}
      <div className="mx-auto w-full max-w-[1242px] px-5">
        <motion.div
          variants={fadeUp} initial="hidden" whileInView="visible"
          viewport={{ once: true }}
        >
          <h2
            className="text-fg-1 uppercase leading-[0.95]"
            style={{
              fontFamily: 'var(--font-poppins), Poppins, sans-serif',
              fontWeight: 400,
              fontSize: 'clamp(40px, 5.5vw, 72px)',
              letterSpacing: '-0.01em',
            }}
          >
            Can&rsquo;t Miss Deals
          </h2>
          <p
            className="mt-4 text-fg-2 leading-relaxed"
            style={{
              fontSize: '16px',
              fontFamily: 'var(--font-poppins), Poppins, sans-serif',
              fontWeight: 200,
              maxWidth: '360px',
            }}
          >
            Everything on sale will make your wardrobe happier
          </p>
        </motion.div>
      </div>

      {/* ── ZONE 2: Card carousel ── */}
      <div className="mx-auto w-full max-w-[1242px] mt-8">
        <div className="flex items-center gap-3">
          <button
            onClick={() => scroll('left')}
            className="flex-shrink-0 text-fg-1 hover:text-black transition-colors"
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={1.5} />
          </button>

          <div
            ref={scrollRef}
            className="flex flex-1 gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory"
          >
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex-shrink-0 flex flex-col snap-start w-[82vw] sm:w-[236px]">
                    <div className="bg-[#F5F1EC]" style={{ height: '315px' }}><HomeCardSkeleton /></div>
                    <div className="pt-2 space-y-1.5">
                      <div className="skeleton h-2.5 w-3/4 rounded" />
                      <div className="skeleton h-2.5 w-1/3 rounded" />
                    </div>
                  </div>
                ))
              : products.map((product) => (
                  <div key={product.id} className="flex-shrink-0 flex flex-col snap-start w-[82vw] sm:w-[236px]">
                    <div className="relative overflow-hidden bg-[#F5F1EC]" style={{ height: '315px' }}>
                      <span className="absolute left-3 top-3 z-10 rounded-full bg-black px-3 py-1 text-[10px] font-medium uppercase tracking-[0.1em] text-white">
                        Sale
                      </span>
                      <HomeCard product={product} />
                    </div>
                    <div className="pt-2">
                      <p className="truncate text-[11px] text-fg-2">{product.name}</p>
                      <p className="mt-0.5 text-[11px] font-semibold text-fg-1">₹{Number(product.basePrice).toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                ))}
          </div>

          <button
            onClick={() => scroll('right')}
            className="flex-shrink-0 text-fg-1 hover:text-black transition-colors"
            aria-label="Scroll right"
          >
            <ChevronRight className="h-5 w-5" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* ── ZONE 3: CTA ── */}
      <div className="mt-10 flex justify-center">
        <Link
          href="/products"
          className="rounded-full border-2 border-white bg-transparent px-7 py-2.5 sm:px-10 sm:py-3 text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.16em] text-fg-1 transition-all duration-300 hover:bg-fg-1 hover:text-white"
        >
          Shop Now
        </Link>
      </div>
    </section>
  )
}

// ─── Trending ─── pink carousel, mirrors ThisJustIn structure ────────────────
function TrendingSection() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading,  setLoading]  = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    productsApi.list({ isActive: 'true', limit: 12, page: 2 })
      .then((res) => {
        const data = (res as any).data ?? []
        if (data.length === 0) {
          return productsApi.list({ isActive: 'true', limit: 12 })
            .then((r) => setProducts((r as any).data ?? []))
        }
        setProducts(data)
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false))
  }, [])

  const scroll = useCallback((dir: 'left' | 'right') => {
    const w = scrollRef.current?.clientWidth ?? 600
    scrollRef.current?.scrollBy({ left: dir === 'right' ? w : -w, behavior: 'smooth' })
  }, [])

  if (!loading && products.length === 0) return null

  return (
    <section
      style={{ backgroundColor: '#FADDE4' }}
      className="flex flex-col justify-center overflow-hidden min-h-[580px] sm:h-[953px] py-14 sm:py-0"
    >
      {/* ── ZONE 1: Header ── */}
      <div className="mx-auto w-full max-w-[1242px] px-5">
        <motion.div
          variants={fadeUp} initial="hidden" whileInView="visible"
          viewport={{ once: true }}
        >
          <h2
            className="text-fg-1 uppercase leading-[0.95]"
            style={{
              fontFamily: 'var(--font-poppins), Poppins, sans-serif',
              fontWeight: 400,
              fontSize: 'clamp(40px, 5.5vw, 72px)',
              letterSpacing: '-0.01em',
            }}
          >
            Hand Picked &<br />Trending
          </h2>
          <p
            className="mt-4 text-fg-2 leading-relaxed"
            style={{
              fontSize: '16px',
              fontFamily: 'var(--font-poppins), Poppins, sans-serif',
              fontWeight: 200,
              maxWidth: '220px',
            }}
          >
            We selected the best of the best looks
          </p>
        </motion.div>
      </div>

      {/* ── ZONE 2: Card carousel ── */}
      <div className="mx-auto w-full max-w-[1242px] mt-8">
        <div className="flex items-center gap-3">
          <button
            onClick={() => scroll('left')}
            className="flex-shrink-0 text-fg-1 hover:text-black transition-colors"
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={1.5} />
          </button>

          <div
            ref={scrollRef}
            className="flex flex-1 gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory"
          >
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex-shrink-0 flex flex-col snap-start w-[82vw] sm:w-[236px]">
                    <div className="bg-[#F5F1EC]" style={{ height: '315px' }}><HomeCardSkeleton /></div>
                    <div className="pt-2 space-y-1.5">
                      <div className="skeleton h-2.5 w-3/4 rounded" />
                      <div className="skeleton h-2.5 w-1/3 rounded" />
                    </div>
                  </div>
                ))
              : products.map((product) => (
                  <div key={product.id} className="flex-shrink-0 flex flex-col snap-start w-[82vw] sm:w-[236px]">
                    <div className="relative overflow-hidden bg-[#F5F1EC]" style={{ height: '315px' }}>
                      <HomeCard product={product} />
                    </div>
                    <div className="pt-2">
                      <p className="truncate text-[11px] text-fg-2">{product.name}</p>
                      <p className="mt-0.5 text-[11px] font-semibold text-fg-1">₹{Number(product.basePrice).toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                ))}
          </div>

          <button
            onClick={() => scroll('right')}
            className="flex-shrink-0 text-fg-1 hover:text-black transition-colors"
            aria-label="Scroll right"
          >
            <ChevronRight className="h-5 w-5" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* ── ZONE 3: CTA ── */}
      <div className="mt-10 flex justify-center">
        <Link
          href="/products"
          className="rounded-full border-2 border-white bg-transparent px-7 py-2.5 sm:px-10 sm:py-3 text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.16em] text-fg-1 transition-all duration-300 hover:bg-fg-1 hover:text-white"
        >
          Shop Now
        </Link>
      </div>
    </section>
  )
}

// ─── Video Showcase ───────────────────────────────────────────────────────────
interface ShowcaseItem {
  id:          string
  name:        string
  slug:        string
  basePrice:   number
  lowestPrice: number
  media:       Array<{ url: string }>
  thumbnail?:  string | null
}

function VideoCard({ item }: { item: ShowcaseItem }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef     = useRef<HTMLVideoElement>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        const e = entries[0]
        if (e.isIntersecting) {
          videoRef.current?.play().catch(() => {})
        } else if (videoRef.current) {
          videoRef.current.pause()
          if (e.intersectionRatio === 0) videoRef.current.currentTime = 0
        }
      },
      { threshold: [0, 0.5] }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const displayPrice = item.lowestPrice ?? item.basePrice
  const priceFormatted = displayPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <Link
      href={`/products/${item.slug}`}
      ref={containerRef as any}
      className="group flex-shrink-0 flex flex-col snap-start w-[72vw] sm:w-[240px]"
    >
      {/* aspect-[4/7] matches ProductCard on the Collections grid */}
      <div className="relative overflow-hidden bg-[#F5F1EC] aspect-[4/7] rounded-[4px]">
        {!loaded && <div className="absolute inset-0 skeleton" />}
        <video
          ref={videoRef}
          src={item.media[0]?.url}
          muted loop playsInline preload="metadata"
          onCanPlay={() => setLoaded(true)}
          className={`h-full w-full object-cover transition-all duration-500 group-hover:scale-[1.04] ${loaded ? 'opacity-100' : 'opacity-0'}`}
        />

        {/* Inset product card — matches reference look */}
        <div className="absolute inset-x-2 bottom-2 flex items-center gap-2.5 rounded-[6px] bg-[#F6EFE2] p-2 shadow-[0_2px_6px_rgba(0,0,0,0.08)]">
          <div className="relative h-[54px] w-[46px] flex-shrink-0 overflow-hidden rounded-[3px] bg-[#EFE9E1]">
            {item.thumbnail ? (
              <Image
                src={item.thumbnail}
                alt={item.name}
                fill
                sizes="46px"
                className="object-cover"
              />
            ) : (
              <video
                src={item.media[0]?.url}
                muted playsInline preload="metadata"
                className="h-full w-full object-cover"
              />
            )}
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-[11px] font-medium text-[#111]">{item.name}</p>
            <p className="mt-0.5 text-[11px] font-semibold text-[#111]">Rs. {priceFormatted}</p>
            <p className="mt-0.5 text-[10px] text-[#111] underline underline-offset-2">View Product</p>
          </div>
        </div>
      </div>
    </Link>
  )
}

function VideoShowcase() {
  const [items,   setItems]   = useState<ShowcaseItem[]>([])
  const [loading, setLoading] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    productsApi.getShowcaseVideos()
      .then((data: any) => setItems(Array.isArray(data) ? data : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [])

  const scroll = useCallback((dir: 'left' | 'right') => {
    const w = scrollRef.current?.clientWidth ?? 600
    scrollRef.current?.scrollBy({ left: dir === 'right' ? w : -w, behavior: 'smooth' })
  }, [])

  return (
    <section
      style={{ backgroundColor: '#F7F2EC' }}
      className="flex flex-col justify-center overflow-hidden py-14 sm:py-20"
    >
      {/* ── ZONE 1: Header ── */}
      <div className="mx-auto w-full max-w-[1242px] px-5">
        <motion.div
          variants={fadeUp} initial="hidden" whileInView="visible"
          viewport={{ once: true }}
        >
          <h2
            className="text-fg-1 uppercase leading-none"
            style={{
              fontFamily: 'var(--font-poppins), Poppins, sans-serif',
              fontWeight: 400,
              fontSize: 'clamp(40px, 5.5vw, 72px)',
              letterSpacing: '-0.01em',
            }}
          >
            Shop the Look
          </h2>
          <p className="mt-3 text-fg-2 leading-relaxed" style={{ fontSize: '16px', fontFamily: 'var(--font-poppins), Poppins, sans-serif', fontWeight: 400, maxWidth: '260px' }}>
            Watch each piece in motion before you buy
          </p>
        </motion.div>
      </div>

      {/* ── ZONE 2: Card carousel — identical alignment to ThisJustIn ── */}
      <div className="mx-auto w-full max-w-[1242px] mt-8">
        <div className="flex items-center gap-3">
          <button
            onClick={() => scroll('left')}
            className="flex-shrink-0 text-fg-1 hover:text-black transition-colors"
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={1.5} />
          </button>

          <div
            ref={scrollRef}
            className="flex flex-1 gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory"
          >
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex-shrink-0 flex flex-col snap-start w-[72vw] sm:w-[240px]">
                    <div className="bg-[#F5F1EC] aspect-[4/7] rounded-[4px]"><HomeCardSkeleton /></div>
                    <div className="pt-3 px-1 space-y-1.5">
                      <div className="skeleton h-2.5 w-3/4 rounded" />
                      <div className="skeleton h-2.5 w-1/3 rounded" />
                    </div>
                  </div>
                ))
              : items.length === 0
                ? Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex-shrink-0 flex flex-col snap-start w-[72vw] sm:w-[240px]">
                      <div className="flex aspect-[4/7] w-full items-center justify-center bg-[#EFE9E1] text-[11px] font-medium uppercase tracking-[0.18em] text-fg-3/70 rounded-[4px]">
                        Videos coming soon
                      </div>
                      <div className="pt-3 px-1">
                        <p className="truncate text-[12px] text-fg-3/60">Vami Clubwear</p>
                      </div>
                    </div>
                  ))
                : items.map((item) => <VideoCard key={item.id} item={item} />)
            }
          </div>

          <button
            onClick={() => scroll('right')}
            className="flex-shrink-0 text-fg-1 hover:text-black transition-colors"
            aria-label="Scroll right"
          >
            <ChevronRight className="h-5 w-5" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* ── ZONE 3: CTA ── */}
      <div className="mt-10 flex justify-center">
        <Link
          href="/products"
          className="rounded-full border-2 border-white bg-transparent px-7 py-2.5 sm:px-10 sm:py-3 text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.16em] text-fg-1 transition-all duration-300 hover:bg-fg-1 hover:text-white"
        >
          Shop Now
        </Link>
      </div>
    </section>
  )
}

// ─── Export ───────────────────────────────────────────────────────────────────
export function HomePageContent() {
  return (
    <div className="landing-page">
      <AnnouncementBar />
      <HeroSection />
      <ThisJustIn />
      <CategorySection />
      <PromoSection />
      <VideoShowcase />
      <ModestCollectionBanner />
      <FeaturedProducts />
      <TrendingSection />
      <CustomerReviewsSection />
      <AboutSection />
      <BenefitsCards />
      <ShopVamiMarquee />
    </div>
  )
}
