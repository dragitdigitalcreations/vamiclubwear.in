'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef, useEffect, useState, useCallback } from 'react'
import { ArrowRight, ChevronLeft, ChevronRight, Truck, RotateCcw, Zap } from 'lucide-react'
import { productsApi } from '@/lib/api'
import { ProductCard } from '@/components/shop/ProductCard'
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

// ─── Collections ──────────────────────────────────────────────────────────────
const COLLECTIONS = [
  { slug: 'anarkali',    label: 'Anarkali',      sub: 'Classic & contemporary', gradient: 'from-[#EDE8E1] to-[#DDD4C8]', accent: '#8B6B47' },
  { slug: 'sharara-set', label: 'Sharara Set',   sub: 'Elegant all occasions',  gradient: 'from-[#E8E1D8] to-[#D6CBBC]', accent: '#6B4A31' },
  { slug: 'modest-wear', label: 'Modest Wear',   sub: 'Elegance redefined',     gradient: 'from-[#EAE4DA] to-[#D8D0C4]', accent: '#5C4033' },
  { slug: 'duppatta',    label: 'Duppatta',      sub: 'The art of draping',     gradient: 'from-[#E6DFD5] to-[#D4C8BB]', accent: '#9B7B5B' },
]

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
  // Parallax: moves left as you scroll down, reverses on scroll up
  const x = useTransform(scrollY, [0, 800], [0, -420], { clamp: false })

  return (
    <div className="absolute bottom-0 left-0 right-0 overflow-hidden border-t border-black/10">
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
    // height = viewport minus navbar (96px) minus announcement bar (36px)
    <section className="relative overflow-hidden" style={{ height: 'calc(100vh - 132px)' }}>

      {/* Background image — place /hero-bg.jpg in /public for actual photo */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: 'url(/hero-bg.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center right',
          backgroundColor: '#EDE8E1',
        }}
      />

      {/* Left gradient — makes text legible over the photo */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#FAF8F5]/92 via-[#FAF8F5]/55 to-transparent" />

      {/* Hero text */}
      <div className="relative z-10 flex h-full items-center px-8 md:px-16 lg:px-24">
        <div className="max-w-[560px]">

          <motion.h1
            initial={{ opacity: 0, y: 36 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            className="text-fg-1 uppercase leading-[0.95]"
            style={{
              fontFamily: 'var(--font-poppins), Poppins, sans-serif',
              fontWeight: 200,
              fontSize: 'clamp(46px, 5.2vw, 72px)',
              letterSpacing: '-0.01em',
            }}
          >
            Calling<br />All Fashion<br />Lovers!
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
            className="mt-6 text-fg-3"
            style={{
              fontFamily: 'var(--font-poppins), Poppins, sans-serif',
              fontWeight: 300,
              fontSize: '16px',
              lineHeight: 1.7,
            }}
          >
            Get up to 50% on our biggest sale yet
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.38 }}
          >
            <Link
              href="/products"
              className="group mt-8 inline-flex items-center gap-3 bg-fg-1 px-9 py-4 text-white transition-all duration-300 hover:bg-black hover:gap-5"
              style={{
                fontFamily: 'var(--font-poppins), Poppins, sans-serif',
                fontWeight: 400,
                fontSize: '16px',
              }}
            >
              Shop Now
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </motion.div>

        </div>
      </div>

      {/* Scroll Down marquee — velocity driven by scroll position */}
      <ScrollDownMarquee />
    </section>
  )
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
    <section className="py-8 md:py-10" style={{ backgroundColor: '#FCE4EB' }}>
      {/*
        Total width = 1324px max.
        Layout: [px-5] [←20px] [gap-3] [strip flex-1] [gap-3] [→20px] [px-5]
        Strip card width: calc((100% - 4*12px) / 5) = each card fills exactly 1/5 minus gaps
      */}
      <div className="mx-auto max-w-[1324px] px-5">

        {/* Header */}
        <motion.div
          variants={fadeUp} initial="hidden" whileInView="visible"
          viewport={{ once: true }}
          className="mb-6"
        >
          <h2
            className="text-fg-1 uppercase leading-none"
            style={{
              fontFamily: 'var(--font-poppins), Poppins, sans-serif',
              fontWeight: 200,
              fontSize: 'clamp(34px, 4.5vw, 56px)',
              letterSpacing: '-0.01em',
            }}
          >
            This Just In
          </h2>
          <p className="mt-2 text-fg-3 text-[12px] leading-relaxed" style={{ maxWidth: '160px' }}>
            Shop the best brands from our new arrivals
          </p>
        </motion.div>

        {/* Arrow + strip + arrow — all inline, contained in 1324px */}
        <div className="flex items-center gap-3">

          {/* Left arrow — bare black vector, no frame */}
          <button
            onClick={() => scroll('left')}
            className="flex-shrink-0 p-0 text-fg-1 hover:text-black transition-colors"
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={1.5} />
          </button>

          {/* Card strip — fills all remaining space */}
          <div
            ref={scrollRef}
            className="flex flex-1 gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory"
          >
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex-shrink-0 snap-start"
                    style={{ width: 'calc((100% - 48px) / 5)', minWidth: '140px' }}
                  >
                    <div className="skeleton h-[280px] w-full" />
                    <div className="mt-2 space-y-1.5">
                      <div className="skeleton h-2.5 w-3/4 rounded" />
                      <div className="skeleton h-2.5 w-1/3 rounded" />
                    </div>
                  </div>
                ))
              : products.map((product) => {
                  const imgUrl = getPrimaryImage(product)
                  return (
                    <div
                      key={product.id}
                      className="flex-shrink-0 snap-start"
                      style={{ width: 'calc((100% - 48px) / 5)', minWidth: '140px' }}
                    >
                      <Link
                        href={`/products/${product.slug}`}
                        className="group block overflow-hidden bg-white hover:shadow-md transition-shadow duration-300"
                      >
                        {/* Fixed-height image area */}
                        <div className="relative h-[240px] md:h-[280px] w-full overflow-hidden bg-white">
                          {imgUrl ? (
                            <Image
                              src={imgUrl}
                              alt={product.name}
                              fill
                              className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                              sizes="(max-width:640px) 44vw, 20vw"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center bg-[#F5F1EC]">
                              <div className="h-10 w-10 rounded-full bg-[#EDE8E1]" />
                            </div>
                          )}
                        </div>
                        {/* Name + price */}
                        <div className="px-3 py-2.5">
                          <p className="truncate text-[11px] text-fg-2">{product.name}</p>
                          <p className="mt-0.5 text-[11px] font-semibold text-fg-1">
                            ₹{product.basePrice.toLocaleString('en-IN')}
                          </p>
                        </div>
                      </Link>
                    </div>
                  )
                })}
          </div>

          {/* Right arrow — bare black vector, no frame */}
          <button
            onClick={() => scroll('right')}
            className="flex-shrink-0 p-0 text-fg-1 hover:text-black transition-colors"
            aria-label="Scroll right"
          >
            <ChevronRight className="h-5 w-5" strokeWidth={1.5} />
          </button>
        </div>

        {/* CTA — transparent outlined pill, 16px top/bottom padding */}
        <div className="mt-7 flex justify-center">
          <Link
            href="/products"
            className="rounded-full border border-fg-1 bg-transparent px-12 py-4 text-[11px] font-medium uppercase tracking-[0.16em] text-fg-1 transition-all duration-300 hover:bg-fg-1 hover:text-white"
          >
            Shop Now
          </Link>
        </div>

      </div>
    </section>
  )
}

// ─── About section ────────────────────────────────────────────────────────────
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
          className="font-display text-3xl font-semibold text-on-background md:text-4xl"
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
        className="mb-10 text-center font-display text-2xl font-semibold text-on-background md:text-3xl"
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


// ─── Collections grid ─────────────────────────────────────────────────────────
function CollectionsGrid() {
  return (
    <section className="mx-auto w-full px-4 sm:px-6 md:px-8 lg:px-10 py-10">
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
              className="group relative flex h-[380px] flex-col justify-end overflow-hidden border border-border/60">
              {/* Background gradient */}
              <div className={`absolute inset-0 bg-gradient-to-br ${col.gradient} transition-transform duration-700 ease-out group-hover:scale-[1.04]`} />
              {/* Decorative circle */}
              <motion.div
                className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border"
                style={{ borderColor: `${col.accent}30`, width: 180, height: 180 }}
                animate={{ scale: [1, 1.06, 1], rotate: [0, 6, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: i * 0.5 }}
              />
              {/* Bottom fade to cream */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#D8CFC4]/80 via-transparent to-transparent" />
              {/* Content */}
              <div className="relative z-10 p-7">
                <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.18em]"
                  style={{ color: col.accent }}>
                  {col.sub}
                </p>
                <h3 className="font-display text-[22px] font-bold text-fg-1">{col.label}</h3>
                <span
                  className="mt-4 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.15em] transition-all duration-300 group-hover:gap-3"
                  style={{ color: col.accent }}
                >
                  Explore
                  <ArrowRight className="h-3 w-3 transition-transform duration-300 group-hover:translate-x-1" />
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
    <section className="mx-auto w-full px-4 sm:px-6 md:px-8 lg:px-10 py-10">
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
    <section className="mx-auto w-full px-4 sm:px-6 md:px-8 lg:px-10 pb-10">
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

      {/* Single-row horizontal scroll — shows ~5 on desktop, ~2 on mobile */}
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
      <CollectionsGrid />
      <FeaturedProducts />
      <TrendingSection />
      <VideoShowcase />
      <AboutSection />
      <BenefitsCards />
    </>
  )
}
