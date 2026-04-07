'use client'

import Link from 'next/link'
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion'
import { useRef, useEffect, useState, useCallback } from 'react'
import { ArrowRight, ChevronLeft, ChevronRight, Play } from 'lucide-react'
import { productsApi } from '@/lib/api'
import { ProductCard } from '@/components/shop/ProductCard'
import type { Product } from '@/types/product'

// ─── Animation variant ────────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: i * 0.12 },
  }),
}

// ─── Collections ──────────────────────────────────────────────────────────────
const COLLECTIONS = [
  { slug: 'fusion',  label: 'Fusion Wear',    sub: 'East meets West',       gradient: 'from-[#3D2B1F] to-[#1a1008]', accent: '#C4956A' },
  { slug: 'bridal',  label: 'Bridal',         sub: 'Your finest moment',    gradient: 'from-[#2B1B2E] to-[#0d0710]', accent: '#D4A5C9' },
  { slug: 'modest',  label: 'Modest Fashion', sub: 'Elegance redefined',    gradient: 'from-[#1A2B2B] to-[#081515]', accent: '#7EC8C8' },
]

const MARQUEE_WORDS = ['Fusion', 'Bridal', 'Modest', 'Couture', 'Heritage', 'Craft', 'Elegance', 'Kerala']

// ─── Hero ─────────────────────────────────────────────────────────────────────
function Hero() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const y       = useTransform(scrollYProgress, [0, 1], ['0%', '25%'])
  const opacity = useTransform(scrollYProgress, [0, 0.7], [1, 0])

  return (
    <section ref={ref} className="relative flex h-screen min-h-[640px] items-end overflow-hidden">
      <motion.div
        style={{ y }}
        className="absolute inset-0 bg-gradient-to-br from-[#1a0e08] via-[#121212] to-[#0d0d0d]"
      />

      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '80px 80px',
        }}
      />

      {/* Watermark */}
      <motion.div
        style={{ opacity }}
        className="absolute inset-0 flex items-center justify-center select-none pointer-events-none overflow-hidden"
      >
        <span className="font-display text-[22vw] font-bold uppercase leading-none text-white/[0.03] tracking-tighter">
          Vami
        </span>
      </motion.div>

      {/* Content */}
      <motion.div
        style={{ opacity }}
        className="relative z-10 mx-auto w-full max-w-7xl px-6 pb-16 md:px-10 md:pb-24"
      >
        <motion.p variants={fadeUp} initial="hidden" animate="visible" custom={0}
          className="mb-4 text-xs font-medium uppercase tracking-[0.35em] text-primary-light">
          New Season — Spring 2025
        </motion.p>

        <motion.h1 variants={fadeUp} initial="hidden" animate="visible" custom={1}
          className="font-display text-5xl font-bold leading-[1.05] text-on-background md:text-7xl lg:text-8xl">
          Where Heritage
          <br />
          <span className="italic text-primary-light">Meets Modernity</span>
        </motion.h1>

        <motion.p variants={fadeUp} initial="hidden" animate="visible" custom={2}
          className="mt-6 max-w-md text-base text-muted md:text-lg">
          Premium Indo-Western couture, thoughtfully crafted in Manjeri, Kerala.
        </motion.p>

        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={3}
          className="mt-10 flex flex-wrap gap-4">
          <Link href="/products"
            className="inline-flex items-center gap-2 bg-primary px-8 py-3.5 text-xs font-semibold uppercase tracking-widest text-white transition-opacity hover:opacity-90">
            Shop Now
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <Link href="/products?category=bridal"
            className="inline-flex items-center gap-2 border border-border px-8 py-3.5 text-xs font-semibold uppercase tracking-widest text-on-background transition-colors hover:border-on-background">
            Bridal Edit
          </Link>
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        style={{ opacity }}
        className="absolute bottom-8 right-8 hidden md:flex flex-col items-center gap-2">
        <span className="text-[10px] uppercase tracking-widest text-muted rotate-90 origin-center translate-y-6">Scroll</span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          className="h-8 w-[1px] bg-gradient-to-b from-muted to-transparent"
        />
      </motion.div>
    </section>
  )
}

// ─── Marquee ──────────────────────────────────────────────────────────────────
function MarqueeStrip() {
  const repeated = [...MARQUEE_WORDS, ...MARQUEE_WORDS]
  return (
    <div className="overflow-hidden border-y border-border bg-surface py-4">
      <motion.div
        animate={{ x: ['0%', '-50%'] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
        className="flex gap-12 whitespace-nowrap"
      >
        {repeated.map((word, i) => (
          <span key={i} className="text-xs font-semibold uppercase tracking-[0.35em] text-muted">
            {word}<span className="ml-12 text-primary">·</span>
          </span>
        ))}
      </motion.div>
    </div>
  )
}

// ─── Collections grid (imfashionstore-style explore blocks) ──────────────────
function CollectionsGrid() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 md:px-8">
      <motion.div
        variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }}
        className="mb-10 flex items-end justify-between">
        <div>
          <p className="mb-1 text-xs uppercase tracking-[0.3em] text-primary-light">Explore</p>
          <h2 className="font-display text-4xl font-bold text-on-background md:text-5xl">Our Collections</h2>
        </div>
        <Link href="/products"
          className="hidden items-center gap-2 text-xs font-medium uppercase tracking-widest text-muted transition-colors hover:text-on-background md:flex">
          View All <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </motion.div>

      {/* 3-column cards — same vibe as imfashionstore's Explore blocks */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {COLLECTIONS.map((col, i) => (
          <motion.div key={col.slug}
            variants={fadeUp} initial="hidden" whileInView="visible"
            viewport={{ once: true, margin: '-60px' }} custom={i}>
            <Link href={`/products?category=${col.slug}`}
              className="group relative flex h-[400px] flex-col justify-end overflow-hidden">
              <div className={`absolute inset-0 bg-gradient-to-br ${col.gradient} transition-transform duration-700 group-hover:scale-105`} />

              {/* Decorative rings */}
              <motion.div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border opacity-10"
                style={{ borderColor: col.accent, width: 180, height: 180 }}
                animate={{ scale: [1, 1.08, 1], rotate: [0, 10, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: i * 0.5 }}
              />
              <motion.div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border opacity-[0.05]"
                style={{ borderColor: col.accent, width: 300, height: 300 }}
                animate={{ scale: [1, 1.05, 1], rotate: [0, -6, 0] }}
                transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: i * 0.3 }}
              />

              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

              <div className="relative z-10 p-7">
                <p className="mb-1 text-xs uppercase tracking-widest" style={{ color: col.accent }}>{col.sub}</p>
                <h3 className="font-display text-3xl font-bold text-white">{col.label}</h3>
                <p className="mt-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest"
                  style={{ color: col.accent }}>
                  Explore
                  <ArrowRight className="h-3 w-3 transition-transform duration-300 group-hover:translate-x-1" />
                </p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  )
}

// ─── Promo banner (What's New) ────────────────────────────────────────────────
function PromoBanner() {
  return (
    <motion.section
      variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }}
      className="mx-4 md:mx-8 my-4 overflow-hidden">
      <Link href="/products?sort=newest"
        className="group relative flex h-[220px] md:h-[280px] items-center justify-center overflow-hidden bg-gradient-to-r from-[#1C0D08] via-[#2A1510] to-[#1C0D08]">
        {/* Animated grain texture */}
        <div className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: 'radial-gradient(circle, #C4956A 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        {/* Horizontal light beam */}
        <motion.div
          className="absolute h-px w-full bg-gradient-to-r from-transparent via-primary/40 to-transparent"
          animate={{ scaleX: [0.4, 1, 0.4], opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
        />

        <div className="relative z-10 text-center px-6">
          <p className="text-xs uppercase tracking-[0.4em] text-primary-light mb-3">Just Arrived</p>
          <h2 className="font-display text-4xl md:text-6xl font-bold text-white">What&rsquo;s New</h2>
          <p className="mt-3 text-sm text-muted/80">Fresh drops from the Vami studio</p>
          <span className="mt-6 inline-flex items-center gap-2 border border-primary/40 px-6 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-primary-light transition-all group-hover:bg-primary group-hover:border-primary group-hover:text-white">
            Shop New Arrivals <ArrowRight className="h-3 w-3" />
          </span>
        </div>
      </Link>
    </motion.section>
  )
}

// ─── Brand statement ──────────────────────────────────────────────────────────
function BrandStatement() {
  return (
    <section className="border-y border-border bg-surface py-20">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <motion.blockquote
          variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }}>
          <p className="font-display text-3xl font-bold leading-snug text-on-background md:text-4xl lg:text-5xl">
            &ldquo;Every piece tells a story of{' '}
            <em className="text-primary-light not-italic">two worlds</em>&nbsp;—
            the timeless grace of the East and the clean lines of the West.&rdquo;
          </p>
          <footer className="mt-8 text-xs uppercase tracking-[0.3em] text-muted">— The Vami Studio, Manjeri</footer>
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
        if (res.data.length > 0) {
          setProducts(res.data as unknown as Product[])
        } else {
          return productsApi.list({ isActive: 'true', limit: 4 }).then((r) => setProducts(r.data as unknown as Product[]))
        }
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <section className="mx-auto max-w-7xl px-4 py-20 md:px-8">
      <motion.div
        variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }}
        className="mb-10 flex items-end justify-between">
        <div>
          <p className="mb-1 text-xs uppercase tracking-[0.3em] text-primary-light">Curated</p>
          <h2 className="font-display text-4xl font-bold text-on-background md:text-5xl">Featured Pieces</h2>
        </div>
        <Link href="/products"
          className="hidden items-center gap-2 text-xs font-medium uppercase tracking-widest text-muted transition-colors hover:text-on-background md:flex">
          View All <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </motion.div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <motion.div key={i} variants={fadeUp} initial="hidden" whileInView="visible"
                viewport={{ once: true, margin: '-40px' }} custom={i * 0.5}>
                <div className="skeleton aspect-[3/4] w-full rounded" />
                <div className="mt-3 space-y-2">
                  <div className="skeleton h-4 w-3/4 rounded" />
                  <div className="skeleton h-3 w-1/2 rounded" />
                </div>
              </motion.div>
            ))
          : products.map((product, i) => (
              <motion.div key={product.id} variants={fadeUp} initial="hidden" whileInView="visible"
                viewport={{ once: true, margin: '-40px' }} custom={i * 0.5}>
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
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)

  const startPlay = useCallback(() => {
    videoRef.current?.play().catch(() => {})
    setPlaying(true)
  }, [])

  const stopPlay = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.currentTime = 0
    }
    setPlaying(false)
  }, [])

  return (
    <div
      className="group relative flex-shrink-0 w-[260px] md:w-[300px] overflow-hidden bg-surface-elevated"
      onMouseEnter={startPlay}
      onMouseLeave={stopPlay}
    >
      {/* Video */}
      <div className="aspect-[3/4] overflow-hidden">
        <video
          ref={videoRef}
          src={item.media[0].url}
          muted
          loop
          playsInline
          preload="metadata"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
      </div>

      {/* Play icon when not playing */}
      <AnimatePresence>
        {!playing && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 border border-white/20 backdrop-blur-sm">
              <Play className="h-5 w-5 text-white fill-white ml-0.5" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom overlay */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-4 pt-12">
        <p className="text-xs uppercase tracking-widest text-white/70 mb-0.5">Vami Clubwear</p>
        <h3 className="text-sm font-semibold text-white leading-snug line-clamp-2">{item.name}</h3>
        <p className="mt-1 text-xs font-medium text-primary-light">₹{Number(item.basePrice).toLocaleString('en-IN')}</p>

        <Link
          href={`/products/${item.slug}`}
          className="mt-3 flex w-full items-center justify-center gap-1.5 border border-white/30 py-2 text-[10px] font-semibold uppercase tracking-widest text-white transition-all hover:bg-primary hover:border-primary"
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        >
          View Product <ArrowRight className="h-3 w-3" />
        </Link>
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

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return
    scrollRef.current.scrollBy({ left: dir === 'right' ? 320 : -320, behavior: 'smooth' })
  }

  // Don't render section if no videos
  if (!loading && items.length === 0) return null

  return (
    <section className="py-20 overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <motion.div
          variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }}
          className="mb-10 flex items-end justify-between">
          <div>
            <p className="mb-1 text-xs uppercase tracking-[0.3em] text-primary-light">In Motion</p>
            <h2 className="font-display text-4xl font-bold text-on-background md:text-5xl">Shop the Look</h2>
            <p className="mt-2 text-sm text-muted">Hover to preview each piece in motion</p>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={() => scroll('left')}
              className="flex h-9 w-9 items-center justify-center border border-border text-muted transition-colors hover:border-on-background hover:text-on-background"
              aria-label="Scroll left"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => scroll('right')}
              className="flex h-9 w-9 items-center justify-center border border-border text-muted transition-colors hover:border-on-background hover:text-on-background"
              aria-label="Scroll right"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      </div>

      {/* Scrollable strip — bleeds edge-to-edge */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto px-4 md:px-8 pb-4 scrollbar-hide snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none' }}
      >
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex-shrink-0 w-[260px] md:w-[300px]">
                <div className="skeleton aspect-[3/4] w-full" />
              </div>
            ))
          : items.map((item) => (
              <div key={item.id} className="snap-start">
                <VideoCard item={item} />
              </div>
            ))
        }
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
      <CollectionsGrid />
      <PromoBanner />
      <BrandStatement />
      <FeaturedProducts />
      <VideoShowcase />
    </>
  )
}
