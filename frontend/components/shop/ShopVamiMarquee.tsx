'use client'

import { motion } from 'framer-motion'

/* ──────────────────────────────────────────────────────────────────────────────
   ShopVamiMarquee — endless auto-scrolling band placed above the footer.
   Mirrors the hero "Scroll Down" rhythm but plays automatically. Pairs the
   favicon mark with "Shop Vami" text so the brand keeps reading even as the
   user lingers near the footer.
   ────────────────────────────────────────────────────────────────────────── */

const REPEATS = 10

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
  return (
    <section
      aria-label="Shop Vami"
      className="relative w-full overflow-hidden bg-[#FAF8F5] border-t-[1.5px] border-b-[1.5px] border-black"
    >
      <motion.div
        className="flex items-center whitespace-nowrap py-5"
        animate={{ x: ['0%', '-50%'] }}
        transition={{
          duration: 38,
          ease: 'linear',
          repeat: Infinity,
        }}
      >
        {/* Render the unit list twice so the -50% loop wraps seamlessly. */}
        {Array.from({ length: REPEATS * 2 }).map((_, i) => (
          <MarqueeUnit key={i} />
        ))}
      </motion.div>
    </section>
  )
}
