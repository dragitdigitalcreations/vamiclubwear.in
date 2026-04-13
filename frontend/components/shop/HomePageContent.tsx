'use client'

import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { useRef, useEffect, useState, useCallback } from 'react'
import { ArrowRight, ChevronLeft, ChevronRight, Truck, RotateCcw, Zap } from 'lucide-react'
import { productsApi, bannersApi } from '@/lib/api'
import type { HeroBanner } from '@/lib/api'
import { ProductCard } from '@/components/shop/ProductCard'
import type { Product } from '@/types/product'

// ─── Shared animation ─────────────────────────────────────────────────────────
const fadeUp = {
  hidden:  { opacity: 0, y: 32 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1], delay: i * 0.1 },
  }),
}

// ─── Collections ──────────────────────────────────────────────────────────────
const COLLECTIONS = [
  { slug: 'fusion',    label: 'Fusion Wear',    sub: 'East meets West',    gradient: 'from-[#3D2B1F] to-[#1a1008]', accent: '#C4956A' },
  { slug: 'bridal',    label: 'Bridal',         sub: 'Your finest moment', gradient: 'from-[#2B1B2E] to-[#0d0710]', accent: '#D4A5C9' },
  { slug: 'modest',    label: 'Modest Fashion', sub: 'Elegance redefined', gradient: 'from-[#1A2B2B] to-[#081515]', accent: '#7EC8C8' },
  { slug: 'dupattas',  label: 'Dupattas',       sub: 'The art of draping', gradient: 'from-[#2B2010] to-[#0f0a00]', accent: '#E8C97A' },
]

const MARQUEE_WORDS = ['Fusion', 'Bridal', 'Modest', 'Couture', 'Heritage', 'Craft', 'Elegance', 'Kerala']

// ─── Hero Carousel ─────────────────────────────────────────────────────────────

interface SlideData {
  id:          string | number
  eyebrow:     string
  titleLine1:  string
  titleLine2:  string
  sub:         string
  cta:         { label: string; href: string }
  ctaAlt:      { label: string; href: string }
  bg:          string
  // Responsive image variants — each is optional; <picture> picks the right one
  bgDesktop?:  string | null
  bgTablet?:   string | null
  bgMobile?:   string | null
  accentColor: string
  dark:        boolean
}

// Map a DB HeroBanner → SlideData — no fallback text; empty = don't render
function bannerToSlide(b: HeroBanner): SlideData {
  return {
    id:          b.id,
    eyebrow:     b.eyebrow     ?? '',
    titleLine1:  b.titleLine1  ?? '',
    titleLine2:  b.titleLine2  ?? '',
    sub:         b.subtitle    ?? '',
    cta:         { label: b.ctaLabel    ?? '', href: b.ctaHref    ?? '' },
    ctaAlt:      { label: b.ctaAltLabel ?? '', href: b.ctaAltHref ?? '' },
    bg: b.darkTheme
      ? 'linear-gradient(135deg, #180F09 0%, #2C1A10 50%, #0E0806 100%)'
      : 'linear-gradient(135deg, #FAF7F2 0%, #FAFAF8 50%, #F5F1EC 100%)',
    bgDesktop:   b.imageDesktop ?? null,
    bgTablet:    b.imageTablet  ?? null,
    bgMobile:    b.imageMobile  ?? null,
    accentColor: b.accentColor  ?? '#8B6B47',
    dark:        b.darkTheme    ?? false,
  }
}

const STATIC_SLIDES: SlideData[] = [
  {
    id:          1,
    eyebrow:     'New Season — Spring 2025',
    titleLine1:  'Where Heritage',
    titleLine2:  'Meets Modernity',
    sub:         'Premium Indo-Western couture, thoughtfully crafted in Manjeri, Kerala.',
    cta:         { label: 'Shop Now',    href: '/products' },
    ctaAlt:      { label: 'Bridal Edit', href: '/products?category=bridal' },
    bg:          'linear-gradient(135deg, #FAF7F2 0%, #FAFAF8 50%, #F5F1EC 100%)',
    accentColor: '#8B6B47',
    dark:        false,
  },
  {
    id:          2,
    eyebrow:     'Bridal Collection 2025',
    titleLine1:  'Your Finest',
    titleLine2:  'Moment',
    sub:         'Bespoke bridal couture crafted for the most precious chapter of your story.',
    cta:         { label: 'Explore Bridal', href: '/products?category=bridal' },
    ctaAlt:      { label: 'Get in Touch',   href: '/contact' },
    bg:          'linear-gradient(135deg, #180F09 0%, #2C1A10 50%, #0E0806 100%)',
    accentColor: '#D4956A',
    dark:        true,
  },
  {
    id:          3,
    eyebrow:     'Fusion Wear',
    titleLine1:  'East Meets',
    titleLine2:  'West',
    sub:         'Contemporary silhouettes rooted in Indo-Western tradition. Wear both worlds.',
    cta:         { label: 'Shop Fusion', href: '/products?category=fusion' },
    ctaAlt:      { label: 'View All',    href: '/products' },
    bg:          'linear-gradient(135deg, #EEE8E0 0%, #EAE2D8 50%, #E2D8CE 100%)',
    accentColor: '#6B4A31',
    dark:        false,
  },
]

// Slide motion — right-to-left: new slides enter from the right
const slideVariants = {
  enter: (dir: number) => ({ x: dir >= 0 ? '100%' : '-100%', opacity: 1 }),
  center: { x: '0%', opacity: 1 },
  exit:  (dir: number) => ({ x: dir >= 0 ? '-100%' : '100%', opacity: 1 }),
}

const SLIDE_TRANSITION = { duration: 0.9, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }

function HeroCarousel() {
  const [current,   setCurrent]   = useState(0)
  const [direction, setDirection] = useState(1)
  const [slides,    setSlides]    = useState<SlideData[]>(STATIC_SLIDES)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  // Fetch live banners; fall back to static slides if DB is empty or offline
  useEffect(() => {
    bannersApi.list()
      .then((banners) => {
        if (banners.length > 0) setSlides(banners.map(bannerToSlide))
      })
      .catch(() => { /* keep static slides */ })
  }, [])

  const go = useCallback((nextIdx: number, dir: number) => {
    clearTimeout(timerRef.current)
    setDirection(dir)
    setCurrent(nextIdx)
  }, [])

  // Auto-advance
  useEffect(() => {
    timerRef.current = setTimeout(() => {
      go((current + 1) % slides.length, 1)
    }, 7000)
    return () => clearTimeout(timerRef.current)
  }, [current, slides.length, go])

  const slide = slides[current] ?? STATIC_SLIDES[0]
  const tc  = slide.dark ? 'text-white'      : 'text-on-background'
  const mc  = slide.dark ? 'text-white/55'   : 'text-muted'
  const bc  = slide.dark ? 'border-white/20' : 'border-border'

  return (
    // Fixed-height container — height NEVER changes so no layout jump
    <section className="relative h-[92vh] overflow-hidden select-none">

      {/* ── Slide layers (absolute, full-size) ── */}
      <AnimatePresence initial={false} custom={direction}>
        <motion.div
          key={`slide-${slide.id}`}
          className="absolute inset-0 flex items-center"
          style={{ background: slide.bg }}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={SLIDE_TRANSITION}
        >
          {/* ── Responsive background image via <picture> ── */}
          {(slide.bgDesktop || slide.bgTablet || slide.bgMobile) && (
            <picture className="pointer-events-none absolute inset-0">
              {slide.bgMobile  && <source media="(max-width: 767px)"                        srcSet={slide.bgMobile} />}
              {slide.bgTablet  && <source media="(min-width: 768px) and (max-width: 1023px)" srcSet={slide.bgTablet} />}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={slide.bgDesktop ?? slide.bgTablet ?? slide.bgMobile ?? ''}
                alt=""
                className="h-full w-full object-cover"
              />
            </picture>
          )}

          {/* ── Top scrim — shields navbar zone ── */}
          <div
            className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-44"
            style={{
              background: (slide.bgDesktop || slide.bgTablet || slide.bgMobile)
                ? 'linear-gradient(180deg, rgba(0,0,0,0.32) 0%, transparent 100%)'
                : slide.dark
                  ? 'linear-gradient(180deg, rgba(24,15,9,0.75) 0%, transparent 100%)'
                  : 'linear-gradient(180deg, rgba(250,247,242,0.90) 0%, transparent 100%)',
            }}
          />

          {/* Glow accent */}
          <div
            className="pointer-events-none absolute bottom-0 right-0 h-[50%] w-[40%] rounded-full blur-[160px]"
            style={{ background: `${slide.accentColor}10` }}
          />

          {/* CTA buttons — anchored bottom-left, only if set */}
          {(slide.cta.label || slide.ctaAlt.label) && (
            <div className="absolute bottom-16 left-0 right-0 z-10 mx-auto w-full max-w-7xl px-6 md:px-12">
              <div className="flex flex-wrap items-center gap-3">
                {slide.cta.label && slide.cta.href && (
                  <Link
                    href={slide.cta.href}
                    className="group inline-flex items-center gap-2.5 px-10 py-3.5 text-[11px] font-semibold uppercase tracking-[0.25em] text-white transition-all duration-300 hover:gap-4"
                    style={{ backgroundColor: slide.accentColor }}
                  >
                    {slide.cta.label}
                    <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                  </Link>
                )}
                {slide.ctaAlt.label && slide.ctaAlt.href && (
                  <Link
                    href={slide.ctaAlt.href}
                    className={`inline-flex items-center gap-2 border px-10 py-3.5 text-[11px] font-semibold uppercase tracking-[0.25em] transition-all duration-300 hover:bg-white/10 ${bc} ${tc}`}
                  >
                    {slide.ctaAlt.label}
                  </Link>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* ── Prev / Next arrows — fixed position over slides ── */}
      <button
        onClick={() => go((current - 1 + slides.length) % slides.length, -1)}
        className={`absolute left-4 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border transition-all duration-200 hover:scale-105 ${
          slide.dark
            ? 'border-white/25 text-white/70 hover:bg-white/15'
            : 'border-border bg-white/80 text-muted hover:bg-white hover:text-on-background'
        }`}
        aria-label="Previous slide"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button
        onClick={() => go((current + 1) % slides.length, 1)}
        className={`absolute right-4 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border transition-all duration-200 hover:scale-105 ${
          slide.dark
            ? 'border-white/25 text-white/70 hover:bg-white/15'
            : 'border-border bg-white/80 text-muted hover:bg-white hover:text-on-background'
        }`}
        aria-label="Next slide"
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      {/* ── Dot indicators — fixed at bottom-center ── */}
      <div className="absolute bottom-7 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2">
        {slides.map((s, i) => (
          <button
            key={s.id}
            onClick={() => go(i, i > current ? 1 : -1)}
            aria-label={`Go to slide ${i + 1}`}
            className="rounded-full transition-all duration-300"
            style={{
              width:           i === current ? '22px' : '6px',
              height:          '6px',
              backgroundColor: i === current
                ? slide.accentColor
                : `${slide.accentColor}40`,
            }}
          />
        ))}
      </div>

      {/* Scroll cue */}
      <div className="absolute bottom-7 right-8 z-20 hidden md:flex flex-col items-end gap-2">
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          className="h-10 w-[1px]"
          style={{ background: `linear-gradient(to bottom, ${slide.accentColor}60, transparent)` }}
        />
        <span className={`text-[9px] uppercase tracking-[0.3em] ${mc}`}>Scroll</span>
      </div>
    </section>
  )
}

// ─── Marquee ──────────────────────────────────────────────────────────────────
function MarqueeStrip() {
  const repeated = [...MARQUEE_WORDS, ...MARQUEE_WORDS, ...MARQUEE_WORDS]
  return (
    <div className="overflow-hidden border-y border-border bg-surface-elevated py-3">
      <motion.div
        animate={{ x: ['0%', '-33.33%'] }}
        transition={{ duration: 32, repeat: Infinity, ease: 'linear' }}
        className="flex gap-10 whitespace-nowrap"
      >
        {repeated.map((word, i) => (
          <span key={i} className="flex items-center gap-10 text-[10px] font-semibold uppercase tracking-[0.4em] text-muted">
            {word}
            <span className="h-1 w-1 rounded-full bg-primary-light/50" />
          </span>
        ))}
      </motion.div>
    </div>
  )
}

// ─── About section ────────────────────────────────────────────────────────────
function AboutSection() {
  return (
    <section className="relative overflow-hidden py-24 md:py-36">
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
          className="font-display text-4xl font-semibold text-on-background md:text-5xl"
        >
          About Vami
        </motion.h2>

        <motion.p
          variants={fadeUp} initial="hidden" whileInView="visible"
          viewport={{ once: true }} custom={0.15}
          className="mt-8 text-base leading-[1.85] text-muted md:text-lg"
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
          <span className="text-[10px] font-semibold uppercase tracking-[0.4em] text-muted">
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
    <section className="mx-auto w-full px-4 sm:px-6 md:px-8 lg:px-10 pb-24">
      <motion.h2
        variants={fadeUp} initial="hidden" whileInView="visible"
        viewport={{ once: true }}
        className="mb-10 text-center font-display text-3xl font-semibold text-on-background md:text-4xl"
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
              <p className="font-semibold text-on-background">{label}</p>
              <p className="mt-1 text-sm text-muted">{sub}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  )
}


// ─── Collections grid ─────────────────────────────────────────────────────────
function CollectionsGrid() {
  return (
    <section className="mx-auto w-full px-4 sm:px-6 md:px-8 lg:px-10 py-20">
      <motion.div
        variants={fadeUp} initial="hidden" whileInView="visible"
        viewport={{ once: true, margin: '-60px' }}
        className="mb-10 flex items-end justify-between"
      >
        <div>
          <p className="mb-1 t-micro">Explore</p>
          <h2 className="t-h1">Our Collections</h2>
        </div>
        <Link href="/products"
          className="hidden items-center gap-2 text-xs font-medium uppercase tracking-widest text-muted hover:text-on-background transition-colors md:flex">
          View All <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </motion.div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
        {COLLECTIONS.map((col, i) => (
          <motion.div key={col.slug}
            variants={fadeUp} initial="hidden" whileInView="visible"
            viewport={{ once: true, margin: '-50px' }} custom={i * 0.3}>
            <Link href={`/products?category=${col.slug}`}
              className="group relative flex h-[380px] flex-col justify-end overflow-hidden rounded-[10px]">
              <div className={`absolute inset-0 bg-gradient-to-br ${col.gradient} transition-transform duration-700 ease-out group-hover:scale-[1.03]`} />
              <motion.div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border opacity-[0.12]"
                style={{ borderColor: col.accent, width: 200, height: 200 }}
                animate={{ scale: [1, 1.07, 1], rotate: [0, 8, 0] }}
                transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut', delay: i * 0.4 }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
              <div className="relative z-10 p-7">
                <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.3em]" style={{ color: col.accent }}>
                  {col.sub}
                </p>
                <h3 className="font-display text-3xl font-bold text-white">{col.label}</h3>
                <span className="mt-4 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em]"
                  style={{ color: col.accent }}>
                  Explore
                  <ArrowRight className="h-3 w-3 transition-transform duration-300 group-hover:translate-x-1.5" />
                </span>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  )
}

// ─── Product grid section helper ──────────────────────────────────────────────
function ProductGrid({ products, loading, cols = 4 }: { products: Product[]; loading: boolean; cols?: number }) {
  const colClass = 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'
  return (
    <div className={`grid gap-3 md:gap-4 ${colClass}`}>
      {loading
        ? Array.from({ length: cols === 4 ? 8 : cols }).map((_, i) => (
            <div key={i}>
              <div className="skeleton aspect-[4/7] w-full rounded-[4px]" />
              <div className="mt-3 space-y-2">
                <div className="skeleton h-4 w-3/4 rounded" />
                <div className="skeleton h-4 w-1/4 rounded" />
              </div>
            </div>
          ))
        : products.map((product, i) => (
            <motion.div key={product.id}
              variants={fadeUp} initial="hidden" whileInView="visible"
              viewport={{ once: true, margin: '-30px' }} custom={i * 0.12}>
              <ProductCard product={product} priority={i < 2} />
            </motion.div>
          ))}
    </div>
  )
}

// ─── New Arrivals ─────────────────────────────────────────────────────────────
function NewArrivalsSection() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    productsApi.list({ isActive: 'true', limit: 8 })
      .then((res) => setProducts((res as any).data ?? []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false))
  }, [])

  if (!loading && products.length === 0) return null

  return (
    <section className="mx-auto w-full px-4 sm:px-6 md:px-8 lg:px-10 py-20">
      <motion.div variants={fadeUp} initial="hidden" whileInView="visible"
        viewport={{ once: true, margin: '-60px' }}
        className="mb-10 flex items-end justify-between">
        <div>
          <p className="mb-1 t-micro">Just Dropped</p>
          <h2 className="t-h1">New Arrivals</h2>
        </div>
        <Link href="/products" className="hidden items-center gap-2 text-xs font-medium uppercase tracking-widest text-muted hover:text-on-background transition-colors md:flex">
          View All <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </motion.div>
      <ProductGrid products={products} loading={loading} cols={4} />
      <div className="mt-8 flex justify-center md:hidden">
        <Link href="/products" className="inline-flex items-center gap-2 border border-border px-8 py-3 text-xs font-semibold uppercase tracking-widest text-on-background hover:bg-surface-elevated transition-all">
          View All <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </section>
  )
}

// ─── Best Sellers ─────────────────────────────────────────────────────────────
function FeaturedProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    productsApi
      .list({ isFeatured: 'true', isActive: 'true', limit: 4 })
      .then((res) => {
        const data = (res as any).data ?? []
        if (data.length > 0) { setProducts(data); return }
        return productsApi.list({ isActive: 'true', limit: 4 })
          .then((r) => setProducts((r as any).data ?? []))
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <section className="mx-auto w-full px-4 sm:px-6 md:px-8 lg:px-10 py-20">
      <motion.div variants={fadeUp} initial="hidden" whileInView="visible"
        viewport={{ once: true, margin: '-60px' }}
        className="mb-10 flex items-end justify-between">
        <div>
          <p className="mb-1 t-micro">Most Popular</p>
          <h2 className="t-h1">Best Sellers</h2>
        </div>
        <Link href="/products" className="hidden items-center gap-2 text-xs font-medium uppercase tracking-widest text-muted hover:text-on-background transition-colors md:flex">
          View All <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </motion.div>
      <ProductGrid products={products} loading={loading} cols={4} />
    </section>
  )
}

// ─── Trending ─────────────────────────────────────────────────────────────────
function TrendingSection() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    productsApi.list({ isActive: 'true', limit: 4, page: 2 })
      .then((res) => {
        const data = (res as any).data ?? []
        if (data.length === 0) {
          return productsApi.list({ isActive: 'true', limit: 4 })
            .then((r) => setProducts((r as any).data ?? []))
        }
        setProducts(data)
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false))
  }, [])

  if (!loading && products.length === 0) return null

  return (
    <section className="mx-auto w-full px-4 sm:px-6 md:px-8 lg:px-10 pb-20">
      <motion.div variants={fadeUp} initial="hidden" whileInView="visible"
        viewport={{ once: true, margin: '-60px' }}
        className="mb-10 flex items-end justify-between">
        <div>
          <p className="mb-1 t-micro">Right Now</p>
          <h2 className="t-h1">Trending</h2>
        </div>
        <Link href="/products" className="hidden items-center gap-2 text-xs font-medium uppercase tracking-widest text-muted hover:text-on-background transition-colors md:flex">
          View All <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </motion.div>
      <ProductGrid products={products} loading={loading} cols={4} />
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
      className="group relative flex-shrink-0 w-[240px] sm:w-[270px] md:w-[300px] overflow-hidden rounded-[4px] bg-surface-elevated shadow-card hover:shadow-card-hover transition-shadow duration-300 snap-start"
    >
      <div className="relative aspect-[4/7] overflow-hidden">
        {!loaded && <div className="absolute inset-0 skeleton" />}
        <video
          ref={videoRef}
          src={item.media[0].url}
          muted loop playsInline preload="metadata"
          onCanPlay={() => setLoaded(true)}
          className={`h-full w-full object-cover transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent p-4 pt-16">
          <p className="mb-1 text-[9px] font-medium uppercase tracking-[0.3em] text-white/55">Vami Clubwear</p>
          <h3 className="text-sm font-semibold text-white leading-snug line-clamp-2">{item.name}</h3>
          <p className="mt-1 text-xs font-semibold text-primary-light">
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
    scrollRef.current?.scrollBy({ left: dir === 'right' ? 340 : -340, behavior: 'smooth' })
  }, [])

  if (!loading && items.length === 0) return null

  return (
    <section className="py-20">
      <div className="mx-auto w-full px-4 sm:px-6 md:px-8 lg:px-10">
        <motion.div variants={fadeUp} initial="hidden" whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          className="mb-10 flex items-end justify-between">
          <div>
            <p className="mb-1 t-micro">In Motion</p>
            <h2 className="t-h1">Shop the Look</h2>
            <p className="mt-2 text-sm text-muted">Scroll past each piece to preview it in motion</p>
          </div>
          {items.length > 3 && (
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

      {/* Scroll track — full viewport width, padding mirrors the max-w-7xl gutter */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-3"
        style={{ paddingLeft: 'max(1rem, calc((100vw - 80rem) / 2 + 1rem))', paddingRight: '1rem' }}
      >
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex-shrink-0 w-[240px] sm:w-[270px] md:w-[300px] snap-start">
                <div className="skeleton aspect-[4/7] w-full rounded-[4px]" />
              </div>
            ))
          : items.map((item) => <VideoCard key={item.id} item={item} />)
        }
        {/* trailing spacer so last card gets breathing room */}
        <div className="flex-shrink-0 w-4 md:w-8" aria-hidden="true" />
      </div>
    </section>
  )
}

// ─── Export ───────────────────────────────────────────────────────────────────
export function HomePageContent() {
  return (
    <>
      <HeroCarousel />
      <MarqueeStrip />
      <CollectionsGrid />
      <NewArrivalsSection />
      <FeaturedProducts />
      <TrendingSection />
      <AboutSection />
      <BenefitsCards />
      <VideoShowcase />
    </>
  )
}
