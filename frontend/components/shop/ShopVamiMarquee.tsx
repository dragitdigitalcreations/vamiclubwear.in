'use client'

import { motion, useScroll, useTransform } from 'framer-motion'

/* ──────────────────────────────────────────────────────────────────────────────
   ShopVamiMarquee — pre-footer band that mirrors the hero "Shop Vami" rhythm.
   Solid white surface, attached above the footer on every shop page.
   Horizontal motion is bound to the page's scrollY (same source as the hero
   marquee) so both bands move in lockstep with the user's scroll, with no
   autoplay. The unit list is doubled so the -50% wrap is seamless.
   ────────────────────────────────────────────────────────────────────────── */

const REPEATS = 14

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
  const { scrollY } = useScroll()
  // Generous range — the band wraps every 50% of its own width, and the
  // doubled unit list makes the seam invisible. Uncapped so deeper scrolls
  // keep nudging it.
  const x = useTransform(scrollY, [0, 3000], ['0%', '-50%'], { clamp: false })

  return (
    <section
      aria-label="Shop Vami"
      className="relative w-full overflow-hidden bg-white border-t-[1.5px] border-b-[1.5px] border-black"
      style={{ minHeight: 60 }}
    >
      <motion.div
        className="flex items-center whitespace-nowrap py-5"
        style={{ x }}
      >
        {Array.from({ length: REPEATS * 2 }).map((_, i) => (
          <MarqueeUnit key={i} />
        ))}
      </motion.div>
    </section>
  )
}
