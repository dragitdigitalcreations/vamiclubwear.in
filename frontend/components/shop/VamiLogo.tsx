/**
 * VamiLogo — renders the official Vami Clubwear SVG logo.
 *
 * The SVG has viewBox="0 0 140 50" (2.8:1 landscape ratio).
 * Prefer the `size` prop for hierarchy-consistent sizing; `height` is
 * still accepted for one-off pixel overrides.
 *
 * Size map (matches CSS --logo-* variables):
 *   xs  16px — favicon / compact admin
 *   sm  20px — admin sidebar
 *   md  28px — navbar (default)
 *   lg  40px — footer
 *   xl  56px — hero / splash
 *
 * Usage:
 *   <VamiLogo size="md" />          // navbar
 *   <VamiLogo size="lg" />          // footer
 *   <VamiLogo height={32} />        // arbitrary override
 */

const SIZE_MAP: Record<string, number> = {
  xs:  16,
  sm:  20,
  md:  28,
  lg:  40,
  xl:  56,
}

interface VamiLogoProps {
  /** Semantic size variant — maps to the CSS --logo-* hierarchy. */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  /** Explicit pixel height — overrides `size` when provided. */
  height?: number
  className?: string
}

export function VamiLogo({ size = 'md', height, className = '' }: VamiLogoProps) {
  const px = height ?? SIZE_MAP[size]

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo.svg"
      alt="Vami Clubwear"
      height={px}
      width="auto"
      style={{
        height:     `${px}px`,
        width:      'auto',
        display:    'block',
        maxWidth:   'none',
        flexShrink: 0,
      }}
      className={className}
      draggable={false}
    />
  )
}
