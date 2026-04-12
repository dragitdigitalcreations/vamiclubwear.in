'use client'

import { useEffect, useRef } from 'react'
import Lenis from 'lenis'

/**
 * LenisProvider — mounts Lenis smooth-scroll on the root <html> element.
 * Integrated with Framer Motion's RAF loop for consistent performance.
 *
 * Duration 1.0 + easing gives a premium, slightly-weighted scroll feel
 * without being sluggish (Safari 120fps compatible).
 */
export function LenisProvider({ children }: { children: React.ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null)

  useEffect(() => {
    const lenis = new Lenis({
      duration:  1.1,
      easing:    (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.5,
    })

    lenisRef.current = lenis

    let raf: number
    function loop(time: number) {
      lenis.raf(time)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      lenis.destroy()
    }
  }, [])

  return <>{children}</>
}
