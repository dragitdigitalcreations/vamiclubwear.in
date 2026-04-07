/**
 * VamiLogo — renders the official Vami Clubwear SVG logo.
 *
 * The SVG has viewBox="0 0 140 50" (2.8:1 landscape ratio).
 * We always set an explicit height so the width scales proportionally
 * via the intrinsic aspect-ratio of the SVG — never stretching.
 *
 * Usage:
 *   <VamiLogo height={32} />           // Navbar (default)
 *   <VamiLogo height={40} />           // Footer
 *   <VamiLogo height={28} className="…" />
 */

interface VamiLogoProps {
  /** Rendered height in px. Width is always auto (preserves SVG aspect ratio). */
  height?: number
  className?: string
}

export function VamiLogo({ height = 32, className = '' }: VamiLogoProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo.svg"
      alt="Vami Clubwear"
      height={height}
      width="auto"
      style={{
        height:    `${height}px`,
        width:     'auto',
        display:   'block',
        maxWidth:  'none',   // never compress horizontally
        flexShrink: 0,
      }}
      className={className}
      draggable={false}
    />
  )
}
