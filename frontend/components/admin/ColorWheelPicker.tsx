'use client'

import { useEffect, useRef, useState } from 'react'
import { Pipette } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'

// ─── Hex → nearest colour name ────────────────────────────────────────────────

const COLOR_MAP: Array<[number, number, number, string]> = [
  [255,255,255,'White'],[0,0,0,'Black'],[128,128,128,'Grey'],
  [192,192,192,'Silver'],[255,255,0,'Yellow'],[255,215,0,'Gold'],
  [255,165,0,'Orange'],[255,140,0,'Dark Orange'],[255,69,0,'Red Orange'],
  [255,0,0,'Red'],[220,20,60,'Crimson'],[139,0,0,'Dark Red'],
  [255,20,147,'Deep Pink'],[255,105,180,'Hot Pink'],[255,182,193,'Light Pink'],
  [255,192,203,'Pink'],[128,0,32,'Burgundy'],[128,0,0,'Maroon'],
  [153,0,76,'Wine'],[0,128,0,'Green'],[0,255,0,'Lime Green'],
  [34,139,34,'Forest Green'],[0,100,0,'Dark Green'],[50,205,50,'Medium Green'],
  [144,238,144,'Light Green'],[0,255,127,'Spring Green'],[64,224,208,'Turquoise'],
  [0,128,128,'Teal'],[0,139,139,'Dark Cyan'],[0,255,255,'Cyan'],
  [135,206,235,'Sky Blue'],[0,0,255,'Blue'],[0,0,139,'Dark Blue'],
  [70,130,180,'Steel Blue'],[100,149,237,'Cornflower Blue'],[173,216,230,'Light Blue'],
  [25,25,112,'Midnight Blue'],[0,0,128,'Navy Blue'],[75,0,130,'Indigo'],
  [148,0,211,'Violet'],[128,0,128,'Purple'],[139,0,139,'Dark Magenta'],
  [238,130,238,'Orchid'],[218,112,214,'Plum'],[216,191,216,'Thistle'],
  [255,0,255,'Magenta'],[210,180,140,'Tan'],[244,164,96,'Sandy Brown'],
  [222,184,135,'Burlywood'],[205,133,63,'Peru'],[139,69,19,'Saddle Brown'],
  [160,82,45,'Sienna'],[101,67,33,'Dark Brown'],[92,64,51,'Mocha Brown'],
  [245,245,220,'Beige'],[255,228,196,'Bisque'],[255,248,220,'Cream'],
  [253,245,230,'Old Lace'],[240,230,140,'Khaki'],[189,183,107,'Dark Khaki'],
  [128,128,0,'Olive'],[107,142,35,'Olive Green'],[154,205,50,'Yellow Green'],
  [80,200,120,'Emerald Green'],[0,201,87,'Emerald'],[127,255,0,'Chartreuse'],
  [255,127,80,'Coral'],[240,128,128,'Light Coral'],[250,128,114,'Salmon'],
  [233,150,122,'Dark Salmon'],[255,160,122,'Light Salmon'],
  [176,196,222,'Light Steel Blue'],[230,230,250,'Lavender'],
  [147,112,219,'Medium Purple'],[123,104,238,'Medium Slate Blue'],
  [72,61,139,'Dark Slate Blue'],[106,90,205,'Slate Blue'],
  [255,250,250,'Snow White'],[245,245,245,'Off White'],
  [112,128,144,'Slate Grey'],[47,79,79,'Dark Slate Grey'],
  [105,105,105,'Dim Grey'],[169,169,169,'Dark Grey'],
]

export function hexToColorName(hex: string): string {
  const h = hex.replace('#', '')
  if (h.length !== 6) return ''
  const r = parseInt(h.slice(0,2), 16)
  const g = parseInt(h.slice(2,4), 16)
  const b = parseInt(h.slice(4,6), 16)
  let best = '', bestDist = Infinity
  for (const [cr,cg,cb,name] of COLOR_MAP) {
    const d = (r-cr)**2 + (g-cg)**2 + (b-cb)**2
    if (d < bestDist) { bestDist = d; best = name }
  }
  return best
}

// ─── HSV ↔ hex ────────────────────────────────────────────────────────────────

interface Hsv { h: number; s: number; v: number } // h: 0–360, s/v: 0–1

function hsvToHex({ h, s, v }: Hsv): string {
  const f = (n: number) => {
    const k = (n + h / 60) % 6
    const c = v - v * s * Math.max(0, Math.min(k, 4 - k, 1))
    return Math.round(c * 255).toString(16).padStart(2, '0')
  }
  return `#${f(5)}${f(3)}${f(1)}`
}

function hexToHsv(hex: string): Hsv | null {
  const m = hex.replace('#', '')
  if (!/^[0-9a-fA-F]{6}$/.test(m)) return null
  const r = parseInt(m.slice(0,2), 16) / 255
  const g = parseInt(m.slice(2,4), 16) / 255
  const b = parseInt(m.slice(4,6), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const d = max - min
  let h = 0
  if (d !== 0) {
    if (max === r)      h = 60 * (((g - b) / d) % 6)
    else if (max === g) h = 60 * ((b - r) / d + 2)
    else                h = 60 * ((r - g) / d + 4)
  }
  if (h < 0) h += 360
  return { h, s: max === 0 ? 0 : d / max, v: max }
}

// ─── ColorWheelPicker ─────────────────────────────────────────────────────────
// In-page popover with a hue/saturation wheel + brightness slider. The wheel is
// pure CSS (conic hue ramp under a radial white ramp); pointer math converts a
// drag position to hue (angle from 12 o'clock, clockwise) and saturation
// (distance from centre). No canvas, no external dependency.

const WHEEL_SIZE = 176 // px; must match the w-44/h-44 classes on the wheel div

export function ColorWheelPicker({
  value,
  onChange,
  className,
}: {
  value?: string
  onChange: (hex: string) => void
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [hsv, setHsv] = useState<Hsv>(() => hexToHsv(value ?? '') ?? { h: 20, s: 0.5, v: 0.6 })
  const [hexDraft, setHexDraft] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const wheelRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef(false)

  const hex = hsvToHex(hsv)

  // Re-sync internal state when the popover opens so an externally-set value
  // (edit mode, hex typed elsewhere) is reflected on the wheel.
  useEffect(() => {
    if (!open) return
    const parsed = hexToHsv(value ?? '')
    if (parsed) setHsv(parsed)
    setHexDraft('')
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const commit = (next: Hsv) => {
    setHsv(next)
    onChange(hsvToHex(next))
  }

  const updateFromPointer = (e: React.PointerEvent) => {
    const rect = wheelRef.current!.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const dx = e.clientX - cx
    const dy = e.clientY - cy
    // Angle clockwise from 12 o'clock — matches the conic-gradient below
    let angle = Math.atan2(dx, -dy) * (180 / Math.PI)
    if (angle < 0) angle += 360
    const sat = Math.min(1, Math.hypot(dx, dy) / (rect.width / 2))
    commit({ h: angle, s: sat, v: hsv.v })
  }

  // Thumb position from current hue/sat (inverse of the pointer math)
  const rad = (hsv.h * Math.PI) / 180
  const thumbR = hsv.s * (WHEEL_SIZE / 2)
  const thumbX = WHEEL_SIZE / 2 + thumbR * Math.sin(rad)
  const thumbY = WHEEL_SIZE / 2 - thumbR * Math.cos(rad)

  const applyHexDraft = () => {
    const raw = hexDraft.trim().replace(/^#?/, '#')
    const parsed = hexToHsv(raw)
    if (parsed) {
      commit(parsed)
      setHexDraft('')
    }
  }

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-10 items-center justify-center rounded border border-border bg-input p-0.5 transition-colors hover:border-ring"
        title="Pick swatch colour"
        aria-label="Open colour wheel"
        aria-expanded={open}
      >
        {value ? (
          <span className="h-full w-full rounded-sm" style={{ backgroundColor: value }} />
        ) : (
          <Pipette className="h-4 w-4 text-muted" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-lg border border-border bg-surface p-4 shadow-xl">
          {/* Hue/saturation wheel */}
          <div
            ref={wheelRef}
            className="relative mx-auto h-44 w-44 cursor-crosshair rounded-full touch-none select-none"
            style={{
              background:
                'radial-gradient(circle closest-side, #ffffff 0%, rgba(255,255,255,0) 100%), ' +
                'conic-gradient(from 0deg, #f00, #ff0 60deg, #0f0 120deg, #0ff 180deg, #00f 240deg, #f0f 300deg, #f00 360deg)',
            }}
            onPointerDown={(e) => {
              draggingRef.current = true
              e.currentTarget.setPointerCapture(e.pointerId)
              updateFromPointer(e)
            }}
            onPointerMove={(e) => draggingRef.current && updateFromPointer(e)}
            onPointerUp={() => { draggingRef.current = false }}
          >
            {/* Brightness dim overlay */}
            <div
              className="pointer-events-none absolute inset-0 rounded-full"
              style={{ backgroundColor: `rgba(0,0,0,${(1 - hsv.v).toFixed(3)})` }}
            />
            {/* Thumb */}
            <div
              className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md"
              style={{ left: thumbX, top: thumbY, backgroundColor: hex }}
            />
          </div>

          {/* Brightness slider */}
          <div className="mt-4">
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(hsv.v * 100)}
              onChange={(e) => commit({ ...hsv, v: Number(e.target.value) / 100 })}
              className="h-2 w-full cursor-pointer appearance-none rounded-full outline-hidden"
              style={{
                background: `linear-gradient(to right, #000, ${hsvToHex({ h: hsv.h, s: hsv.s, v: 1 })})`,
              }}
              aria-label="Brightness"
            />
          </div>

          {/* Hex entry + name preview */}
          <div className="mt-3 flex items-center gap-2">
            <span className="h-8 w-8 shrink-0 rounded border border-border" style={{ backgroundColor: hex }} />
            <Input
              value={hexDraft || hex}
              onChange={(e) => setHexDraft(e.target.value)}
              onBlur={applyHexDraft}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); applyHexDraft() }
              }}
              className="h-8 font-mono text-xs"
              maxLength={7}
              aria-label="Hex colour"
            />
          </div>
          <p className="mt-2 text-xs text-muted">≈ {hexToColorName(hex) || '—'}</p>
        </div>
      )}
    </div>
  )
}
