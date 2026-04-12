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
  hidden:  { opacity: 0, y: 40 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.75, ease: [0.22, 1, 0.36, 1], delay: i * 0.1 },
  }),
}

// ─── Collections ──────────────────────────────────────────────────────────────
const COLLECTIONS = [
  { slug: 'fusion',  label: 'Fusion Wear',    sub: 'East meets West',    gradient: 'from-[#3D2B1F] to-[#1a1008]', accent: '#C4956A' },
  { slug: 'bridal',  label: 'Bridal',         sub: 'Your finest moment', gradient: 'from-[#2B1B2E] to-[#0d0710]', accent: '#D4A5C9' },
  { slug: 'modest',  label: 'Modest Fashion', sub: 'Elegance redefined', gradient: 'from-[#1A2B2B] to-[#081515]', accent: '#7EC8C8' },
]

const MARQUEE_WORDS = ['Fusion', 'Bridal', 'Modest', 'Couture', 'Heritage', 'Craft', 'Elegance', 'Kerala']

// ─── Hero ─────────────────────────────────────────────────────────────────────
function Hero() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const bgY    = useTransform(scrollYProgress, [0, 1], ['0%', '22%'])
  const fgOp   = useTransform(scrollYProgress, [0, 0.65], [1, 0])
  const fgY    = useTransform(scrollYProgress, [0, 1], ['0%', '-8%'])

  return (
    <section
      ref={ref}
      className="relative flex min-h-[85vh] items-center overflow-hidden bg-[#100a06]"
    >
      {/* Parallax background layer */}
      <motion.div
        style={{ y: bgY }}
        className="absolute inset-0"
      >
        {/* Rich gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#1f0e06] via-[#120c09] to-[#0a0a0a]" />
        {/* Subtle diagonal fabric texture */}
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: `repeating-linear-gradient(
              45deg,
              transparent,
              transparent 2px,
              rgba(255,255,255,0.8) 2px,
              rgba(255,255,255,0.8) 3px
            )`,
            backgroundSize: '28px 28px',
          }}
        />
        {/* Radial glow — warm amber from bottom-right */}
        <div className="absolute bottom-0 right-0 h-[60%] w-[55%] rounded-full bg-[#5C4033]/20 blur-[120px]" />
        <div className="absolute top-0 left-0 h-[40%] w-[40%] rounded-full bg-[#3D2B1F]/15 blur-[90px]" />
      </motion.div>

      {/* Foreground content */}
      <motion.div
        style={{ opacity: fgOp, y: fgY }}
        className="relative z-10 mx-auto w-full max-w-7xl px-6 pb-8 pt-28 md:px-12 md:pt-32"
      >
        <div className="max-w-3xl">
          <motion.p
            variants={fadeUp} initial="hidden" animate="visible" custom={0}
            className="mb-5 inline-flex items-center gap-2.5 text-xs font-medium uppercase tracking-[0.35em] text-primary-light"
          >
            <span className="h-px w-8 bg-primary-light/60" />
            New Season — Spring 2025
          </motion.p>

          <motion.h1
            variants={fadeUp} initial="hidden" animate="visible" custom={1}
            className="font-display text-[clamp(3rem,8vw,6rem)] font-bold leading-[1.02] tracking-tight text-on-background"
          >
            Where Heritage
            <br />
            <em className="not-italic text-primary-light">Meets Modernity</em>
          </motion.h1>

          <motion.p
            variants={fadeUp} initial="hidden" animate="visible" custom={2}
            className="mt-6 max-w-md text-base leading-relaxed text-muted md:text-lg"
          >
            Premium Indo-Western couture, thoughtfully crafted in Manjeri, Kerala.
          </motion.p>

          <motion.div
            variants={fadeUp} initial="hidden" animate="visible" custom={3}
            className="mt-10 flex flex-wrap items-center gap-4"
          >
            <Link
              href="/products"
              className="group inline-flex items-center gap-2.5 bg-primary px-9 py-4 text-xs font-semibold uppercase tracking-[0.2em] text-white transition-all duration-300 hover:bg-primary-light hover:gap-3.5"
            >
              Shop Now
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
            <Link
              href="/products?category=bridal"
              className="inline-flex items-center gap-2 border border-border/60 px-9 py-4 text-xs font-semibold uppercase tracking-[0.2em] text-on-background/80 transition-all duration-300 hover:border-on-background hover:text-on-background"
            >
              Bridal Edit
            </Link>
          </motion.div>

          {/* Trust signals */}
          <motion.div
            variants={fadeUp} initial="hidden" animate="visible" custom={4}
            className="mt-12 flex flex-wrap items-center gap-6 border-t border-border/30 pt-8"
          >
            {[
              { label: 'Free shipping', sub: 'on orders ₹2500+' },
              { label: 'Handcrafted', sub: 'Manjeri, Kerala' },
              { label: 'Easy returns', sub: '7-day policy' },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-xs font-semibold uppercase tracking-wider text-on-background">{item.label}</p>
                <p className="mt-0.5 text-[11px] text-muted">{item.sub}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        style={{ opacity: fgOp }}
        className="absolute bottom-8 right-8 hidden md:flex flex-col items-end gap-2"
      >
        <motion.div
          animate={{ y: [0, 7, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          className="h-10 w-[1px] bg-gradient-to-b from-muted/60 to-transparent"
        />
        <span className="text-[9px] uppercase tracking-[0.25em] text-muted/60">Scroll</span>
      </motion.div>
    </section>
  )
}

// ─── Marquee ──────────────────────────────────────────────────────────────────
function MarqueeStrip() {
  const repeated = [...MARQUEE_WORDS, ...MARQUEE_WORDS, ...MARQUEE_WORDS]
  return (
    <div className="overflow-hidden border-y border-border/60 bg-surface py-3.5">
      <motion.div
        animate={{ x: ['0%', '-33.33%'] }}
        transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
        className="flex gap-10 whitespace-nowrap"
      >
        {repeated.map((word, i) => (
          <span key={i} className="flex items-center gap-10 text-[11px] font-semibold uppercase tracking-[0.3em] text-muted/70">
            {word}
            <span className="h-1 w-1 rounded-full bg-primary/60" />
          </span>
        ))}
      </motion.div>
    </div>
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
          className="hidden items-center gap-2 text-xs font-medium uppercase tracking-widest text-muted transition-colors hover:text-on-background md:flex">
          View All <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </motion.div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {COLLECTIONS.map((col, i) => (
          <motion.div key={col.slug}
            variants={fadeUp} initial="hidden" whileInView="visible"
            viewport={{ once: true, margin: '-50px' }} custom={i * 0.3}>
            <Link href={`/products?category=${col.slug}`}
              className="group relative flex h-[420px] flex-col justify-end overflow-hidden rounded-[18px]">
              <div className={`absolute inset-0 bg-gradient-to-br ${col.gradient} transition-transform duration-500 ease-out group-hover:scale-[1.04]`} />

              {/* Inner glow rings */}
              <motion.div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border opacity-[0.12]"
                style={{ borderColor: col.accent, width: 200, height: 200 }}
                animate={{ scale: [1, 1.07, 1], rotate: [0, 8, 0] }}
                transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut', delay: i * 0.4 }}
              />
              <motion.div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border opacity-[0.05]"
                style={{ borderColor: col.accent, width: 330, height: 330 }}
                animate={{ scale: [1, 1.04, 1], rotate: [0, -5, 0] }}
                transition={{ duration: 7.5, repeat: Infinity, ease: 'easeInOut', delay: i * 0.25 }}
              />

              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent rounded-[18px]" />

              <div className="relative z-10 p-7">
                <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.3em]" style={{ color: col.accent }}>
                  {col.sub}
                </p>
                <h3 className="font-display text-3xl font-bold text-white">{col.label}</h3>
                <span
                  className="mt-4 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] transition-gap duration-300"
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

// ─── Promo banner — "What's New" ──────────────────────────────────────────────
function PromoBanner() {
  return (
    <motion.section
      variants={fadeUp} initial="hidden" whileInView="visible"
      viewport={{ once: true, margin: '-40px' }}
      className="mx-4 md:mx-8 overflow-hidden rounded-[18px]"
    >
      <Link href="/products"
        className="group relative flex h-[200px] md:h-[260px] items-center justify-center overflow-hidden rounded-[18px] bg-gradient-to-r from-[#1C0D08] via-[#2A1510] to-[#1C0D08]">
        {/* Dot grid */}
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: 'radial-gradient(circle, #C4956A 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
        {/* Animated glow line */}
        <motion.div
          className="absolute h-[1px] w-3/4 rounded-full bg-gradient-to-r from-transparent via-primary/50 to-transparent"
          animate={{ scaleX: [0.5, 1, 0.5], opacity: [0.4, 0.9, 0.4] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />

        <div className="relative z-10 text-center px-6">
          <p className="text-[10px] uppercase tracking-[0.45em] text-primary-light mb-3">Just Arrived</p>
          <h2 className="font-display text-4xl md:text-6xl font-bold tracking-tight text-white">
            What&rsquo;s New
          </h2>
          <p className="mt-2.5 text-sm text-muted/80">Fresh drops from the Vami studio</p>
          <span className="mt-7 inline-flex items-center gap-2 border border-primary/40 px-7 py-2.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary-light/90 transition-all duration-300 group-hover:bg-primary group-hover:border-primary group-hover:text-white group-hover:gap-3">
            Shop New Arrivals <ArrowRight className="h-3 w-3 transition-transform duration-300 group-hover:translate-x-1" />
          </span>
        </div>
      </Link>
    </motion.section>
  )
}

// ─── Brand statement ──────────────────────────────────────────────────────────
function BrandStatement() {
  return (
    <section className="border-y border-border/50 bg-surface py-20">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <motion.blockquote
          variants={fadeUp} initial="hidden" whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}>
          <p className="font-display text-2xl font-bold leading-relaxed text-on-background md:text-3xl lg:text-4xl">
            &ldquo;Every piece tells a story of{' '}
            <em className="not-italic text-primary-light">two worlds</em>&nbsp;—
            the timeless grace of the East and the clean lines of the West.&rdquo;
          </p>
          <footer className="mt-8 text-[10px] uppercase tracking-[0.35em] text-muted">
            — The Vami Studio, Manjeri
          </footer>
        </motion.blockquote>
      </div>
    </section>
  )
}

// ─── Featured products ────────────────────────────────────────────────────────
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
          className="hidden items-center gap-2 text-xs font-medium uppercase tracking-widest text-muted transition-colors hover:text-on-background md:flex">
          View All <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </motion.div>

      {/* 2 cols mobile → 4 cols desktop */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 md:gap-5">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i}>
                <div className="skeleton aspect-[3/4] w-full rounded-[14px]" />
                <div className="mt-3 space-y-2 px-1">
                  <div className="skeleton h-4 w-3/4 rounded" />
                  <div className="skeleton h-3 w-1/2 rounded" />
                  <div className="skeleton h-3 w-1/4 rounded" />
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

// ─── Video Showcase ───────────────────────────────────────────────────────────

interface ShowcaseItem {
  id:        string
  name:      string
  slug:      string
  basePrice: number
  media:     Array<{ url: string }>
}

// VideoCard — IntersectionObserver-driven autoplay (like top fashion stores)
function VideoCard({ item }: { item: ShowcaseItem }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef     = useRef<HTMLVideoElement>(null)
  const [visible,  setVisible]  = useState(false)
  const [loaded,   setLoaded]   = useState(false)

  // IntersectionObserver: play when ≥50% visible, pause when below threshold
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        setVisible(entry.isIntersecting)
        if (entry.isIntersecting) {
          videoRef.current?.play().catch(() => {})
        } else {
          if (videoRef.current) {
            videoRef.current.pause()
            // Only reset position when fully hidden for seamless re-entry
            if (entry.intersectionRatio === 0) {
              videoRef.current.currentTime = 0
            }
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
      className="group relative flex-shrink-0 w-[240px] sm:w-[270px] md:w-[300px] overflow-hidden rounded-[16px] bg-surface-elevated shadow-card transition-shadow duration-300 hover:shadow-card-hover snap-start"
    >
      {/* Video — 3:4 portrait */}
      <div className="relative aspect-[3/4] overflow-hidden rounded-[16px]">
        {/* Poster shimmer while loading */}
        {!loaded && (
          <div className="absolute inset-0 skeleton" />
        )}

        <video
          ref={videoRef}
          src={item.media[0].url}
          muted
          loop
          playsInline
          preload="metadata"
          onCanPlay={() => setLoaded(true)}
          className={`h-full w-full object-cover transition-all duration-500 ${
            loaded ? 'opacity-100' : 'opacity-0'
          } ${visible ? 'scale-[1.02]' : 'scale-100'}`}
          style={{ transition: 'opacity 0.5s ease, transform 0.6s ease' }}
        />

        {/* Bottom gradient + info */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent p-4 pt-16 rounded-b-[16px]">
          <p className="text-[9px] font-medium uppercase tracking-[0.3em] text-white/55 mb-1">Vami Clubwear</p>
          <h3 className="text-sm font-semibold text-white leading-snug line-clamp-2">{item.name}</h3>
          <p className="mt-1 text-xs font-medium text-primary-light">
            ₹{Number(item.basePrice).toLocaleString('en-IN')}
          </p>

          <Link
            href={`/products/${item.slug}`}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-[10px] border border-white/25 py-2.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-sm transition-all duration-300 hover:bg-primary hover:border-primary"
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
              <button
                onClick={() => scroll('left')}
                className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-border text-muted transition-all duration-200 hover:border-on-background hover:text-on-background hover:bg-surface-elevated"
                aria-label="Scroll left"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => scroll('right')}
                className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-border text-muted transition-all duration-200 hover:border-on-background hover:text-on-background hover:bg-surface-elevated"
                aria-label="Scroll right"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </motion.div>
      </div>

      {/* Full-bleed horizontal scroll strip */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory px-4 pb-3 md:px-8"
      >
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex-shrink-0 w-[240px] sm:w-[270px] md:w-[300px] snap-start">
                <div className="skeleton aspect-[3/4] w-full rounded-[16px]" />
              </div>
            ))
          : items.map((item) => (
              <VideoCard key={item.id} item={item} />
            ))
        }
      </div>
    </section>
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
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary-light">
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
          className="hidden items-center gap-2 text-xs font-medium uppercase tracking-widest text-muted transition-colors hover:text-on-background md:flex">
          View All <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </motion.div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 md:gap-5">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => (
              <div key={i}>
                <div className="skeleton aspect-[3/4] w-full rounded-[14px]" />
                <div className="mt-3 space-y-2 px-1">
                  <div className="skeleton h-4 w-3/4 rounded" />
                  <div className="skeleton h-3 w-1/2 rounded" />
                  <div className="skeleton h-3 w-1/4 rounded" />
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

      {/* Mobile "View All" */}
      <div className="mt-8 flex justify-center md:hidden">
        <Link href="/products"
          className="inline-flex items-center gap-2 border border-border px-8 py-3 text-xs font-semibold uppercase tracking-widest text-on-background transition-all hover:bg-surface-elevated">
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
    // Fetch page 2 of active products as "trending" (different from new arrivals)
    productsApi.list({ isActive: 'true', limit: 4, page: 2 })
      .then((res) => {
        const data = (res as any).data ?? []
        if (data.length === 0) {
          // fallback: just fetch any 4
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
          className="hidden items-center gap-2 text-xs font-medium uppercase tracking-widest text-muted transition-colors hover:text-on-background md:flex">
          View All <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </motion.div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 md:gap-5">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i}>
                <div className="skeleton aspect-[3/4] w-full rounded-[14px]" />
                <div className="mt-3 space-y-2 px-1">
                  <div className="skeleton h-4 w-3/4 rounded" />
                  <div className="skeleton h-3 w-1/2 rounded" />
                  <div className="skeleton h-3 w-1/4 rounded" />
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

// ─── Export ───────────────────────────────────────────────────────────────────
export function HomePageContent() {
  return (
    <>
      <Hero />
      <MarqueeStrip />
      <BenefitsStrip />
      <CollectionsGrid />
      <NewArrivalsSection />
      <PromoBanner />
      <BrandStatement />
      <FeaturedProducts />
      <TrendingSection />
      <VideoShowcase />
    </>
  )
}
