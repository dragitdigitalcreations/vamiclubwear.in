'use client'

import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'

/* ──────────────────────────────────────────────────────────────────────────────
   ShopVamiMarquee — page-scroll-driven band placed above the footer.
   Mirrors the hero "Shop Vami" rhythm: the horizontal translation is bound to
   the section's own scroll progress, so the band only moves while the user
   scrolls (no autoplay). Solid white surface to match the request.
   ────────────────────────────────────────────────────────────────────────── */

const REPEATS = 12

function MarqueeUnit() {
  return (
    <span className="flex items-center gap-5 px-7">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo-icon.svg"
        alt=""
        aria-hidden="true"
        className="h-5 w-auto select-none"
        draggable={false}
      />
      <span
        className="text-fg-1 uppercase"
        style={{
          fontFamily: 'var(--font-poppins), Poppins, sans-serif',
          fontWeight: 500,
          fontSize: 'clamp(14px, 1.4vw, 18px)',
          letterSpacing: '0.32em',
          lineHeight: 1,
        }}
      >
        Shop Vami
      </span>
    </span>
  )
}

export function ShopVamiMarquee() {
  const ref = useRef<HTMLElement | null>(null)
  // Map the section's progress through the viewport (entering → exited at top)
  // to a -50% translation so the unit list can wrap cleanly when doubled.
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })
  const x = useTransform(scrollYProgress, [0, 1], ['0%', '-50%'])

  return (
    <section
      ref={ref}
      aria-label="Shop Vami"
      className="relative w-full overflow-hidden bg-white border-t-[1.5px] border-b-[1.5px] border-black"
    >
      <motion.div
        className="flex items-center whitespace-nowrap py-5"
        style={{ x }}
      >
        {/* Render the unit list twice so the -50% translation wraps seamlessly. */}
        {Array.from({ length: REPEATS * 2 }).map((_, i) => (
          <MarqueeUnit key={i} />
        ))}
      </motion.div>
    </section>
  )
}
