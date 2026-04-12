'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion'
import { useRef, useEffect, useState, useCallback } from 'react'
import { ArrowRight, ChevronLeft, ChevronRight, Truck, RotateCcw, Zap, ShieldCheck } from 'lucide-react'
import { productsApi } from '@/lib/api'
import { ProductCard } from '@/components/shop/ProductCard'
import type { Product } from '@/types/product'

// ─── Shared animation ─────────────────────────────────────────────────────────
const fadeUp = {
  hidden:  { opacity: 0, y: 36 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: i * 0.1 },
  }),
}

// ─── Collections ──────────────────────────────────────────────────────────────
const COLLECTIONS = [
  { slug: 'fusion',  label: 'Fusion Wear',    sub: 'East meets West',    gradient: 'from-[#3D2B1F] to-[#1a1008]', accent: '#C4956A' },
  { slug: 'bridal',  label: 'Bridal',         sub: 'Your finest moment', gradient: 'from-[#2B1B2E] to-[#0d0710]', accent: '#D4A5C9' },
  { slug: 'modest',  label: 'Modest Fashion', sub: 'Elegance redefined', gradient: 'from-[#1A2B2B] to-[#081515]', accent: '#7EC8C8' },
]

const MARQUEE_WORDS = ['Fusion', 'Bridal', 'Modest', 'Couture', 'Heritage', 'Craft', 'Elegance', 'Kerala']

// ─── Hero Carousel ────────────────────────────────────────────────────────────
const SLIDES = [
  {
    id:           1,
    eyebrow:      'New Season — Spring 2025',
    titleLine1:   'Where Heritage',
    titleLine2:   'Meets Modernity',
    accentLine:   'Meets Modernity',
    sub:          'Premium Indo-Western couture, thoughtfully crafted in Manjeri, Kerala.',
    cta:          { label: 'Shop Now',    href: '/products' },
    ctaAlt:       { label: 'Bridal Edit', href: '/products?category=bridal' },
    bg:           'bg-gradient-to-br from-[#FAF7F2] via-[#FAFAF8] to-[#F5F1EC]',
    accentColor:  '#8B6B47',
    dark:         false,
  },
  {
    id:           2,
    eyebrow:      'Bridal Collection 2025',
    titleLine1:   'Your Finest',
    titleLine2:   'Moment',
    accentLine:   'Moment',
    sub:          'Bespoke bridal couture crafted for the most precious chapter of your story.',
    cta:          { label: 'Explore Bridal', href: '/products?category=bridal' },
    ctaAlt:       { label: 'Get in Touch',   href: '/contact' },
    bg:           'bg-gradient-to-br from-[#180F09] via-[#2C1A10] to-[#0E0806]',
    accentColor:  '#D4956A',
    dark:         true,
  },
  {
    id:           3,
    eyebrow:      'Fusion Wear',
    titleLine1:   'East Meets',
    titleLine2:   'West',
    accentLine:   'West',
    sub:          'Contemporary silhouettes rooted in Indo-Western tradition. Wear both worlds.',
    cta:          { label: 'Shop Fusion', href: '/products?category=fusion' },
    ctaAlt:       { label: 'View All',    href: '/products' },
    bg:           'bg-gradient-to-br from-[#EEE8E0] via-[#EAE2D8] to-[#E2D8CE]',
    accentColor:  '#6B4A31',
    dark:         false,
  },
]

function HeroCarousel() {
  const [current,   setCurrent]   = useState(0)
  const [direction, setDirection] = useState(1)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  const go = useCallback((idx: number, dir: number) => {
    setDirection(dir)
    setCurrent(idx)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setDirection(1)
      setCurrent((c) => (c + 1) % SLIDES.length)
    }, 5500)
  }, [])

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      setDirection(1)
      setCurrent((c) => (c + 1) % SLIDES.length)
    }, 5500)
    return () => clearTimeout(timerRef.current)
  }, [current])

  function prev() { go((current - 1 + SLIDES.length) % SLIDES.length, -1) }
  function next() { go((current + 1) % SLIDES.length, 1) }

  const slide = SLIDES[current]
  const textColor  = slide.dark ? 'text-white'           : 'text-on-background'
  const mutedColor = slide.dark ? 'text-white/55'        : 'text-muted'
  const borderCol  = slide.dark ? 'border-white/25'      : 'border-border'
  const btnAltCls  = slide.dark
    ? 'border border-white/30 text-white/80 hover:bg-white hover:text-on-background'
    : 'border border-border text-on-background hover:bg-surface-elevated'

  return (
    <section className="relative overflow-hidden" style={{ minHeight: '92vh' }}>

      {/* ── Slide background (crossfade) ── */}
      <AnimatePresence mode="sync" initial={false}>
        <motion.div
          key={slide.id}
          className={`absolute inset-0 ${slide.bg}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7, ease: 'easeInOut' }}
        />
      </AnimatePresence>

      {/* Subtle warm glow */}
      <div
        className="absolute bottom-0 right-0 h-[50%] w-[45%] rounded-full blur-[160px] pointer-events-none transition-colors duration-700"
        style={{ background: `${slide.accentColor}12` }}
      />

      {/* ── Slide content ── */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={`content-${slide.id}`}
          className="relative z-10 mx-auto w-full max-w-7xl px-6 md:px-12"
          style={{ paddingTop: 'clamp(7rem, 14vw, 10rem)', paddingBottom: '5rem' }}
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="max-w-2xl">
            {/* Eyebrow */}
            <p
              className="mb-5 inline-flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.45em]"
              style={{ color: slide.accentColor }}
            >
              <span className="h-px w-10" style={{ backgroundColor: `${slide.accentColor}80` }} />
              {slide.eyebrow}
            </p>

            {/* Headline */}
            <h1 className={`font-display text-[clamp(3rem,8vw,6.5rem)] font-bold leading-[1.02] tracking-tight ${textColor}`}>
              {slide.titleLine1}
              <br />
              <em className="not-italic" style={{ color: slide.accentColor }}>
                {slide.titleLine2}
              </em>
            </h1>

            {/* Sub */}
            <p className={`mt-7 max-w-sm text-[15px] leading-relaxed ${mutedColor}`}>
              {slide.sub}
            </p>

            {/* CTAs */}
            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link
                href={slide.cta.href}
                className="group inline-flex items-center gap-2.5 px-10 py-4 text-[11px] font-semibold uppercase tracking-[0.25em] transition-all duration-300 hover:gap-4"
                style={{ backgroundColor: slide.accentColor, color: '#FFFFFF' }}
              >
                {slide.cta.label}
                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
              <Link
                href={slide.ctaAlt.href}
                className={`inline-flex items-center gap-2 px-10 py-4 text-[11px] font-semibold uppercase tracking-[0.25em] transition-all duration-300 ${btnAltCls}`}
              >
                {slide.ctaAlt.label}
              </Link>
            </div>

            {/* Trust strip */}
            <div className={`mt-14 flex flex-wrap items-center gap-8 border-t pt-8 ${borderCol}`}>
              {[
                { label: 'Free shipping', sub: 'orders ₹2500+' },
                { label: 'Handcrafted',   sub: 'Manjeri, Kerala' },
                { label: 'Easy returns',  sub: '7-day policy' },
              ].map((item) => (
                <div key={item.label}>
                  <p className={`text-[11px] font-semibold uppercase tracking-wider ${textColor}`}>{item.label}</p>
                  <p className={`mt-0.5 text-[11px] ${mutedColor}`}>{item.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* ── Prev / Next arrows ── */}
      <button
        onClick={prev}
        className={`absolute left-4 top-1/2 -translate-y-1/2 z-20 flex h-10 w-10 items-center justify-center rounded-full border transition-all duration-200 hover:scale-105 ${
          slide.dark ? 'border-white/25 text-white/70 hover:bg-white/15' : 'border-border bg-white/70 text-muted hover:bg-white hover:text-on-background'
        }`}
        aria-label="Previous slide"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button
        onClick={next}
        className={`absolute right-4 top-1/2 -translate-y-1/2 z-20 flex h-10 w-10 items-center justify-center rounded-full border transition-all duration-200 hover:scale-105 ${
          slide.dark ? 'border-white/25 text-white/70 hover:bg-white/15' : 'border-border bg-white/70 text-muted hover:bg-white hover:text-on-background'
        }`}
        aria-label="Next slide"
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      {/* ── Dot indicators ── */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
        {SLIDES.map((s, i) => (
          <button
            key={s.id}
            onClick={() => go(i, i > current ? 1 : -1)}
            aria-label={`Slide ${i + 1}`}
            className="transition-all duration-300 rounded-full"
            style={{
              width:           i === current ? '24px' : '6px',
              height:          '6px',
              backgroundColor: i === current ? slide.accentColor : `${slide.accentColor}40`,
            }}
          />
        ))}
      </div>

      {/* Scroll cue */}
      <div className="absolute bottom-8 right-8 hidden md:flex flex-col items-end gap-2 z-20">
        <motion.div
          animate={{ y: [0, 7, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          className="h-10 w-[1px]"
          style={{ background: `linear-gradient(to bottom, ${slide.accentColor}60, transparent)` }}
        />
        <span className={`text-[9px] uppercase tracking-[0.3em] ${mutedColor}`}>Scroll</span>
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

// ─── Benefits strip ───────────────────────────────────────────────────────────
function BenefitsStrip() {
  const benefits = [
    { Icon: Truck,       label: 'Free Shipping',   sub: 'On orders ₹2500+' },
    { Icon: RotateCcw,   label: 'Easy Returns',    sub: '7-day hassle-free' },
    { Icon: Zap,         label: 'Fast Delivery',   sub: 'Pan-India express' },
    { Icon: ShieldCheck, label: 'Secure Checkout', sub: '100% safe payments' },
  ]
  return (
    <section className="border-y border-border/50 bg-surface">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="grid grid-cols-2 divide-x divide-y divide-border/40 md:grid-cols-4 md:divide-y-0">
          {benefits.map(({ Icon, label, sub }) => (
            <div key={label} className="flex items-center gap-3 px-6 py-5">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/8 text-primary-light">
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-on-background">{label}</p>
                <p className="text-[11px] text-muted">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Collections grid ─────────────────────────────────────────────────────────
function CollectionsGrid() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 md:px-8">
      <motion.div
        variants={fadeUp} initial="hidden" whileInView="visible"
        viewport={{ once: true, margin: '-60px' }}
        className="mb-10 flex items-end justify-between"
      >
        <div>
          <p className="mb-1 text-[11px] uppercase tracking-[0.35em] text-primary-light">Explore</p>
          <h2 className="font-display text-4xl font-bold text-on-background md:text-5xl">Our Collections</h2>
        </div>
        <Link href="/products"
          className="hidden items-center gap-2 text-xs font-medium uppercase tracking-widest text-muted hover:text-on-background transition-colors md:flex">
          View All <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </motion.div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {COLLECTIONS.map((col, i) => (
          <motion.div key={col.slug}
            variants={fadeUp} initial="hidden" whileInView="visible"
            viewport={{ once: true, margin: '-50px' }} custom={i * 0.3}>
            <Link href={`/products?category=${col.slug}`}
              className="group relative flex h-[420px] flex-col justify-end overflow-hidden rounded-[10px]">
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
                <span
                  className="mt-4 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em]"
                  style={{ color: col.accent }}
                >
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

// ─── Featured products (Best Sellers) ────────────────────────────────────────
function FeaturedProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    productsApi
      .list({ isFeatured: 'true', isActive: 'true', limit: 4 })
      .then((res) => {
        if ((res as any).data?.length > 0) {
          setProducts((res as any).data)
        } else {
          return productsApi.list({ isActive: 'true', limit: 4 })
            .then((r) => setProducts((r as any).data ?? []))
        }
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <section className="mx-auto max-w-7xl px-4 py-20 md:px-8">
      <motion.div
        variants={fadeUp} initial="hidden" whileInView="visible"
        viewport={{ once: true, margin: '-60px' }}
        className="mb-10 flex items-end justify-between"
      >
        <div>
          <p className="mb-1 text-[11px] uppercase tracking-[0.35em] text-primary-light">Most Popular</p>
          <h2 className="font-display text-4xl font-bold text-on-background md:text-5xl">Best Sellers</h2>
        </div>
        <Link href="/products"
          className="hidden items-center gap-2 text-xs font-medium uppercase tracking-widest text-muted hover:text-on-background transition-colors md:flex">
          View All <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </motion.div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 md:gap-5">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i}>
                <div className="skeleton aspect-[3/4] w-full rounded-[10px]" />
                <div className="mt-3 space-y-2">
                  <div className="skeleton h-4 w-3/4 rounded" />
                  <div className="skeleton h-4 w-1/4 rounded" />
                </div>
              </div>
            ))
          : products.map((product, i) => (
              <motion.div key={product.id}
                variants={fadeUp} initial="hidden" whileInView="visible"
                viewport={{ once: true, margin: '-30px' }} custom={i * 0.4}>
                <ProductCard product={product} priority={i < 2} />
              </motion.div>
            ))}
      </div>
    </section>
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
    <section className="mx-auto max-w-7xl px-4 py-20 md:px-8">
      <motion.div
        variants={fadeUp} initial="hidden" whileInView="visible"
        viewport={{ once: true, margin: '-60px' }}
        className="mb-10 flex items-end justify-between"
      >
        <div>
          <p className="mb-1 text-[11px] uppercase tracking-[0.35em] text-primary-light">Just Dropped</p>
          <h2 className="font-display text-4xl font-bold text-on-background md:text-5xl">New Arrivals</h2>
        </div>
        <Link href="/products"
          className="hidden items-center gap-2 text-xs font-medium uppercase tracking-widest text-muted hover:text-on-background transition-colors md:flex">
          View All <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </motion.div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 md:gap-5">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => (
              <div key={i}>
                <div className="skeleton aspect-[3/4] w-full rounded-[10px]" />
                <div className="mt-3 space-y-2">
                  <div className="skeleton h-4 w-3/4 rounded" />
                  <div className="skeleton h-4 w-1/4 rounded" />
                </div>
              </div>
            ))
          : products.map((product, i) => (
              <motion.div key={product.id}
                variants={fadeUp} initial="hidden" whileInView="visible"
                viewport={{ once: true, margin: '-30px' }} custom={i * 0.15}>
                <ProductCard product={product} priority={i < 2} />
              </motion.div>
            ))}
      </div>

      <div className="mt-8 flex justify-center md:hidden">
        <Link href="/products"
          className="inline-flex items-center gap-2 border border-border px-8 py-3 text-xs font-semibold uppercase tracking-widest text-on-background hover:bg-surface-elevated transition-all">
          View All <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </section>
  )
}

// ─── Trending Products ────────────────────────────────────────────────────────
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
    <section className="mx-auto max-w-7xl px-4 pb-20 md:px-8">
      <motion.div
        variants={fadeUp} initial="hidden" whileInView="visible"
        viewport={{ once: true, margin: '-60px' }}
        className="mb-10 flex items-end justify-between"
      >
        <div>
          <p className="mb-1 text-[11px] uppercase tracking-[0.35em] text-primary-light">Right Now</p>
          <h2 className="font-display text-4xl font-bold text-on-background md:text-5xl">Trending</h2>
        </div>
        <Link href="/products"
          className="hidden items-center gap-2 text-xs font-medium uppercase tracking-widest text-muted hover:text-on-background transition-colors md:flex">
          View All <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </motion.div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 md:gap-5">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i}>
                <div className="skeleton aspect-[3/4] w-full rounded-[10px]" />
                <div className="mt-3 space-y-2">
                  <div className="skeleton h-4 w-3/4 rounded" />
                  <div className="skeleton h-4 w-1/4 rounded" />
                </div>
              </div>
            ))
          : products.map((product, i) => (
              <motion.div key={product.id}
                variants={fadeUp} initial="hidden" whileInView="visible"
                viewport={{ once: true, margin: '-30px' }} custom={i * 0.15}>
                <ProductCard product={product} />
              </motion.div>
            ))}
      </div>
    </section>
  )
}

// ─── Video Showcase ───────────────────────────────────────────────────────────
interface ShowcaseItem {
  id:        string
  name:      string
  slug:      string
  basePrice: number
  media:     Array<{ url: string }>
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
        const entry = entries[0]
        if (entry.isIntersecting) {
          videoRef.current?.play().catch(() => {})
        } else {
          if (videoRef.current) {
            videoRef.current.pause()
            if (entry.intersectionRatio === 0) videoRef.current.currentTime = 0
          }
        }
      },
      { threshold: [0, 0.5] }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={containerRef}
      className="group relative flex-shrink-0 w-[240px] sm:w-[270px] md:w-[300px] overflow-hidden rounded-[10px] bg-surface-elevated shadow-card hover:shadow-card-hover transition-shadow duration-300 snap-start"
    >
      <div className="relative aspect-[3/4] overflow-hidden">
        {!loaded && <div className="absolute inset-0 skeleton" />}
        <video
          ref={videoRef}
          src={item.media[0].url}
          muted loop playsInline preload="metadata"
          onCanPlay={() => setLoaded(true)}
          className={`h-full w-full object-cover transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent p-4 pt-16">
          <p className="text-[9px] font-medium uppercase tracking-[0.3em] text-white/55 mb-1">Vami Clubwear</p>
          <h3 className="text-sm font-semibold text-white leading-snug line-clamp-2">{item.name}</h3>
          <p className="mt-1 text-xs font-medium text-primary-light">
            ₹{Number(item.basePrice).toLocaleString('en-IN')}
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
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [])

  const scroll = useCallback((dir: 'left' | 'right') => {
    scrollRef.current?.scrollBy({ left: dir === 'right' ? 340 : -340, behavior: 'smooth' })
  }, [])

  if (!loading && items.length === 0) return null

  return (
    <section className="py-20 overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <motion.div
          variants={fadeUp} initial="hidden" whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          className="mb-10 flex items-end justify-between"
        >
          <div>
            <p className="mb-1 text-[11px] uppercase tracking-[0.35em] text-primary-light">In Motion</p>
            <h2 className="font-display text-4xl font-bold text-on-background md:text-5xl">Shop the Look</h2>
            <p className="mt-2 text-sm text-muted">Scroll past each piece to preview it in motion</p>
          </div>
          {items.length > 3 && (
            <div className="hidden md:flex items-center gap-2">
              <button onClick={() => scroll('left')}
                className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-border text-muted hover:border-on-background hover:text-on-background hover:bg-surface-elevated transition-all duration-200"
                aria-label="Scroll left">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={() => scroll('right')}
                className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-border text-muted hover:border-on-background hover:text-on-background hover:bg-surface-elevated transition-all duration-200"
                aria-label="Scroll right">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </motion.div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory px-4 pb-3 md:px-8"
      >
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex-shrink-0 w-[240px] sm:w-[270px] md:w-[300px] snap-start">
                <div className="skeleton aspect-[3/4] w-full rounded-[10px]" />
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
      <HeroCarousel />
      <MarqueeStrip />
      <BenefitsStrip />
      <CollectionsGrid />
      <NewArrivalsSection />
      <FeaturedProducts />
      <TrendingSection />
      <VideoShowcase />
    </>
  )
}
