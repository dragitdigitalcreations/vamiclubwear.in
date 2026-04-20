'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion, useScroll, useTransform, useMotionValue, useSpring } from 'framer-motion'
import { useRef, useEffect, useState, useCallback } from 'react'
import { ArrowRight, ChevronLeft, ChevronRight, Truck, RotateCcw, Zap } from 'lucide-react'
import { productsApi, reviewsApi, type CustomerReview } from '@/lib/api'
import { getPrimaryImage } from '@/types/product'
import type { Product } from '@/types/product'

// ─── Shared animation ─────────────────────────────────────────────────────────
const fadeUp = {
  hidden:  { opacity: 0, y: 32 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1], delay: i * 0.1 },
  }),
}

// ─── Announcement Bar ─────────────────────────────────────────────────────────
function AnnouncementBar() {
  return (
    <div className="bg-[#111111] text-white" style={{ marginTop: '96px' }}>
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-5 md:px-10 h-9">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em]">
          Get up to 50% off now
        </p>
        <div className="hidden sm:flex items-center gap-4">
          <a href="#" target="_blank" rel="noreferrer" aria-label="Facebook"
            className="text-white/60 hover:text-white transition-colors">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
          </a>
          <a href="#" target="_blank" rel="noreferrer" aria-label="Instagram"
            className="text-white/60 hover:text-white transition-colors">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
          </a>
          <a href="#" target="_blank" rel="noreferrer" aria-label="X / Twitter"
            className="text-white/60 hover:text-white transition-colors">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
          </a>
          <a href="#" target="_blank" rel="noreferrer" aria-label="Pinterest"
            className="text-white/60 hover:text-white transition-colors">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/></svg>
          </a>
          <span className="border-l border-white/20 pl-4 text-[10px] font-medium tracking-wide text-white/50 cursor-pointer hover:text-white transition-colors">
            Get Our Newsletter
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── Scroll Down Marquee (scroll-velocity driven) ─────────────────────────────
function ScrollDownMarquee() {
  const { scrollY } = useScroll()
  const x = useTransform(scrollY, [0, 800], [0, -420], { clamp: false })

  return (
    <div className="absolute left-0 right-0 overflow-hidden border-t border-black/10" style={{ bottom: '50px' }}>
      <motion.div style={{ x }} className="flex items-center whitespace-nowrap py-3.5">
        {Array.from({ length: 12 }).map((_, i) => (
          <span key={i} className="flex items-center gap-4 px-8 text-[10px] font-semibold uppercase tracking-[0.28em] text-fg-3/80">
            Scroll Down
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>
            </svg>
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
      className="relative overflow-hidden w-full aspect-[3/5] sm:aspect-auto"
      style={{ ['--desktop-ratio' as any]: '2784/1536' }}
    >
      {/* Desktop keeps the original wide aspect; mobile uses aspect-[3/5] via Tailwind above */}
      <div className="hidden sm:block" style={{ aspectRatio: '2784/1536' }} />

      <div
        className="absolute inset-0"
        style={{
          backgroundImage: 'url(/hero-models.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'right bottom',
          backgroundColor: '#BAB3B4',
        }}
      />

      {/* Left-side wash: stronger on mobile so black text stays legible; centered on desktop */}
      <div className="pointer-events-none absolute inset-0 sm:hidden bg-gradient-to-b from-[#FAF8F5]/95 via-[#FAF8F5]/60 to-[#FAF8F5]/10" />
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
            className="mt-5 sm:mt-6 text-fg-3"
            style={{
              fontFamily: 'var(--font-poppins), Poppins, sans-serif',
              fontWeight: 300,
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
              className="group inline-flex items-center gap-3 bg-fg-1 px-7 py-3.5 sm:px-9 sm:py-4 text-white transition-all duration-300 hover:bg-black hover:gap-5"
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
          <p className="mt-3 text-fg-3 leading-relaxed" style={{ fontSize: '16px', fontFamily: 'var(--font-poppins), Poppins, sans-serif', fontWeight: 200, maxWidth: '200px' }}>
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
          className="rounded-full border border-fg-1 bg-transparent px-7 py-2.5 sm:px-10 sm:py-3 text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.16em] text-fg-1 transition-all duration-300 hover:bg-fg-1 hover:text-white"
        >
          Shop Now
        </Link>
      </div>

    </section>
  )
}

// ─── Category Section — violet (#ADAEF1), 4-card strip ───────────────────────
function CategorySection() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading,  setLoading]  = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    productsApi.list({ isActive: 'true', limit: 4 })
      .then((res) => setProducts(((res as any).data ?? []).slice(0, 4)))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false))
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
          <p className="mt-3 text-fg-3 leading-relaxed" style={{ fontSize: '16px', fontFamily: 'var(--font-poppins), Poppins, sans-serif', fontWeight: 200 }}>
            Explore our curated collections
          </p>
        </motion.div>

        {/* Card strip with arrows — 236×315 cards */}
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
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex-shrink-0 flex flex-col snap-start w-[82vw] sm:w-[236px]">
                    <div className="bg-[#F5F1EC]" style={{ height: '315px' }}><HomeCardSkeleton /></div>
                    <div className="pt-2 space-y-1.5">
                      <div className="skeleton h-2.5 w-2/3 rounded" />
                      <div className="skeleton h-2.5 w-1/2 rounded" />
                    </div>
                  </div>
                ))
              : products.map((product) => {
                  const imgUrl = getPrimaryImage(product)
                  return (
                    <Link
                      key={product.id}
                      href={`/products?category=${product.category.slug}`}
                      className="group flex-shrink-0 flex flex-col snap-start w-[82vw] sm:w-[236px]"
                    >
                      <div className="relative overflow-hidden bg-[#F5F1EC]" style={{ height: '315px' }}>
                        {imgUrl && (
                          <Image
                            src={imgUrl}
                            alt={product.category.name}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                            sizes="236px"
                          />
                        )}
                      </div>
                      <div className="pt-2">
                        <p className="truncate font-sans font-medium uppercase text-fg-1 transition-colors group-hover:text-black" style={{ fontSize: '20px', letterSpacing: '0.05em' }}>{product.category.name}</p>
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
            backgroundImage: 'url(/promo-a.png)',
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
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#111] bg-white/80 px-6 py-2.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#111] backdrop-blur-sm transition-all duration-300 hover:bg-[#111] hover:text-white"
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
              backgroundImage: 'url(/promo-b.png)',
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
              backgroundImage: 'url(/promo-accent.png)',
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
              className="mt-4 inline-flex w-fit items-center gap-2 bg-white px-6 py-2.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-black transition-all duration-300 hover:bg-[#5C4033] hover:text-white"
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
          backgroundImage: 'url(/promo-a.png)',
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
            backgroundImage: 'url(/promo-b.png)',
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
            backgroundImage: 'url(/promo-accent.png)',
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
          className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#111] px-7 py-2.5 text-[11px] font-medium text-[#111] transition-all duration-300 hover:bg-[#111] hover:text-white"
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
    <section className="w-full" style={{ height: '465px' }}>
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
          <div className="mx-auto flex max-w-md flex-col gap-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/50">
              Voices of Vami
            </p>
            <h3 className="font-display text-[32px] leading-[1.1] md:text-[40px]">
              Worn. Loved. <span className="italic text-white/70">Remembered.</span>
            </h3>
            <p className="text-sm leading-[1.85] text-white/70">
              Every piece we craft finds its story in the women who wear it — to weddings that
              become memories, evenings that feel like poetry, mornings that deserve more than
              ordinary. These are the voices that keep our hands and hearts at the loom.
            </p>
            <div className="mt-2 flex items-center gap-4">
              <span className="h-px w-14 bg-white/30" />
              <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-white/50">
                Real customers · Real words
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function AboutSection() {
  return (
    <section className="relative overflow-hidden py-10 md:py-16">
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
            className="mt-7 inline-flex items-center gap-2.5 rounded-full border border-white/80 px-8 py-3 text-white transition-all duration-300 hover:bg-white hover:text-[#121212]"
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
          style={{ aspectRatio: '1/1' }}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          viewport={{ once: true }}
        >
          <div className="absolute inset-0" style={{
            backgroundImage: 'url(/modest-collection.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center 30%',
            backgroundColor: '#8B94AE',
          }} />
        </motion.div>
      </div>

      {/* ── Desktop: original overlay layout ── */}
      <div className="relative overflow-hidden w-full hidden md:block" style={{ aspectRatio: '600/310' }}>
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'url(/modest-collection.png)',
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
            className="mt-4 text-fg-3 leading-relaxed"
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
          className="rounded-full border border-fg-1 bg-transparent px-7 py-2.5 sm:px-10 sm:py-3 text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.16em] text-fg-1 transition-all duration-300 hover:bg-fg-1 hover:text-white"
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
            className="mt-4 text-fg-3 leading-relaxed"
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
          className="rounded-full border border-fg-1 bg-transparent px-7 py-2.5 sm:px-10 sm:py-3 text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.16em] text-fg-1 transition-all duration-300 hover:bg-fg-1 hover:text-white"
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
        } else {
          if (videoRef.current) {
            videoRef.current.pause()
            if (e.intersectionRatio === 0) videoRef.current.currentTime = 0
          }
        }
      },
      { threshold: [0, 0.5] }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const displayPrice = item.lowestPrice ?? item.basePrice

  return (
    <div
      ref={containerRef}
      className="group relative flex-shrink-0 w-[44vw] sm:w-[30vw] md:w-[21vw] lg:w-[18vw] overflow-hidden rounded-[4px] bg-surface-elevated shadow-card hover:shadow-card-hover transition-shadow duration-300 snap-start"
    >
      <div className="relative aspect-[9/16] overflow-hidden">
        {!loaded && <div className="absolute inset-0 skeleton" />}
        <video
          ref={videoRef}
          src={item.media[0].url}
          muted loop playsInline preload="metadata"
          onCanPlay={() => setLoaded(true)}
          className={`h-full w-full object-cover transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent px-10 pb-10 pt-16">
          <p className="mb-1 text-[9px] font-medium uppercase tracking-[0.3em] text-white/55">Vami Clubwear</p>
          <h3 className="text-xs font-medium text-white/75 leading-snug line-clamp-2">{item.name}</h3>
          <p className="mt-1.5 text-base font-bold text-white">
            ₹{displayPrice.toLocaleString('en-IN')}
          </p>
          <Link
            href={`/products/${item.slug}`}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-[10px] border border-white/25 py-2.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white hover:bg-primary hover:border-primary transition-all duration-300"
          >
            View Product <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  )
}

function VideoShowcase() {
  const [items,   setItems]   = useState<ShowcaseItem[]>([])
  const [loading, setLoading] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    productsApi.getShowcaseVideos()
      .then((data: any) => setItems(data))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [])

  const scroll = useCallback((dir: 'left' | 'right') => {
    scrollRef.current?.scrollBy({ left: dir === 'right' ? 320 : -320, behavior: 'smooth' })
  }, [])

  if (!loading && items.length === 0) return null

  return (
    <section className="py-10">
      <div className="mx-auto w-full px-4 sm:px-6 md:px-8 lg:px-10">
        <motion.div variants={fadeUp} initial="hidden" whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          className="mb-10 flex items-end justify-between">
          <div>
            <p className="mb-1 t-micro">In Motion</p>
            <h2 className="t-h1">Shop the Look</h2>
            <p className="mt-2 text-[12px] text-muted">Scroll to preview each piece in motion</p>
          </div>
          {items.length > 4 && (
            <div className="hidden md:flex items-center gap-2">
              <button onClick={() => scroll('left')}
                className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-border text-muted hover:border-on-background hover:text-on-background hover:bg-surface-elevated transition-all duration-200"
                aria-label="Scroll left"><ChevronLeft className="h-4 w-4" /></button>
              <button onClick={() => scroll('right')}
                className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-border text-muted hover:border-on-background hover:text-on-background hover:bg-surface-elevated transition-all duration-200"
                aria-label="Scroll right"><ChevronRight className="h-4 w-4" /></button>
            </div>
          )}
        </motion.div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory px-4 sm:px-6 md:px-8 lg:px-10 pb-2"
      >
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex-shrink-0 w-[44vw] sm:w-[30vw] md:w-[21vw] lg:w-[18vw] snap-start">
                <div className="skeleton aspect-[9/16] w-full rounded-[4px]" />
              </div>
            ))
          : items.map((item) => <VideoCard key={item.id} item={item} />)
        }
      </div>
    </section>
  )
}

// ─── Export ───────────────────────────────────────────────────────────────────
export function HomePageContent() {
  return (
    <>
      <AnnouncementBar />
      <HeroSection />
      <ThisJustIn />
      <CategorySection />
      <PromoSection />
      <ModestCollectionBanner />
      <FeaturedProducts />
      <TrendingSection />
      <VideoShowcase />
      <CustomerReviewsSection />
      <AboutSection />
      <BenefitsCards />
    </>
  )
}
