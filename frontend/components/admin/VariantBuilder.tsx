'use client'

import { useFieldArray, useFormContext, useWatch, Controller } from 'react-hook-form'
import { useEffect, useState } from 'react'
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

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

function hexToColorName(hex: string): string {
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

// ─── Option lists ─────────────────────────────────────────────────────────────

const SIZE_OPTIONS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', '4XL', '5XL', '6XL', '7XL', 'Free Size', 'Custom']
const FABRIC_OPTIONS = [
  'Pure Silk', 'Georgette', 'Chiffon', 'Velvet', 'Cotton', 'Linen',
  'Crepe', 'Net', 'Organza', 'Brocade', 'Satin', 'Rayon',
  'Chinon', 'Mal Cotton', 'Shimmer',
]
const STYLE_OPTIONS = [
  'Anarkali', 'Straight Cut', 'A-Line', 'Lehenga', 'Palazzo Set',
  'Sharara Set', 'Salwar Kameez', 'Indo-Western', 'Kurti', 'Co-ord Set',
]

// ─── SKU generator (matches backend convention) ────────────────────────────────
// Format: VCW-{SLUG}-{COLOR}-{SIZE}-{FABRIC}-{STYLE}-{NN}
// Missing dimensions fall back to "NA"; the 1-based index suffix guarantees
// uniqueness across variants of the same product (backend rejects duplicates).

function generateSku(
  slug: string,
  color: string,
  size: string,
  fabric: string,
  style: string,
  index: number,
): string {
  const clean = (s: string) =>
    s.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4)
  const slugCode   = clean(slug)   || 'PROD'
  const colorCode  = clean(color)  || 'NA'
  const sizeCode   = clean(size)   || 'NA'
  const fabricCode = clean(fabric) || 'NA'
  const styleCode  = clean(style)  || 'NA'
  const idx        = String(index + 1).padStart(2, '0')
  return `VCW-${slugCode}-${colorCode}-${sizeCode}-${fabricCode}-${styleCode}-${idx}`
}

// ─── Form shape (matches ProductUploadForm's productSchema) ────────────────────

interface VariantFormRow {
  id?:      string
  sku:      string
  size?:    string
  color?:   string
  colorHex?: string
  fabric?:  string
  style?:   string
  price:    number
  stock?:   number
}

interface FormValues {
  slug:     string
  basePrice: number
  variants: VariantFormRow[]
}

// ─── Single row ───────────────────────────────────────────────────────────────

function VariantRow({
  index,
  productSlug,
  onRemove,
}: {
  index:       number
  productSlug: string
  onRemove:    () => void
}) {
  const [expanded, setExpanded] = useState(true)
  const { register, setValue, control, formState: { errors } } = useFormContext<FormValues>()

  const size     = useWatch({ control, name: `variants.${index}.size` })
  const color    = useWatch({ control, name: `variants.${index}.color` })
  const fabric   = useWatch({ control, name: `variants.${index}.fabric` })
  const style    = useWatch({ control, name: `variants.${index}.style` })
  const colorHex = useWatch({ control, name: `variants.${index}.colorHex` }) ?? '#888888'

  // Auto-generate SKU from slug + dimensions. Runs unconditionally so every
  // variant always has a valid, unique SKU — even with partial dimensions.
  useEffect(() => {
    setValue(
      `variants.${index}.sku`,
      generateSku(productSlug, color ?? '', size ?? '', fabric ?? '', style ?? '', index),
      { shouldValidate: true },
    )
  }, [productSlug, color, size, fabric, style, index, setValue])

  const variantErrors = errors.variants?.[index]
  const summary = [color, size, fabric].filter(Boolean).join(' / ') || 'New variant'

  return (
    <div className={cn(
      'rounded-lg border transition-colors',
      Object.keys(variantErrors ?? {}).length > 0 ? 'border-destructive/50' : 'border-border'
    )}>
      {/* Header */}
      <div
        className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-surface-elevated/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && setExpanded(!expanded)}
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-on-background truncate">{summary}</p>
          <p className="mt-0.5 font-mono text-xs text-muted">
            {useWatch({ control, name: `variants.${index}.sku` }) || 'SKU auto-generates'}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRemove() }}
            className="rounded p-1 text-muted hover:text-destructive transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          {expanded ? <ChevronUp className="h-4 w-4 text-muted" /> : <ChevronDown className="h-4 w-4 text-muted" />}
        </div>
      </div>

      {/* Body */}
      {expanded && (
        <div className="border-t border-border px-4 pb-4 pt-4 space-y-5">

          {/* Row 1: Size + Color */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* SIZE */}
            <div className="space-y-1.5">
              <Label>Size</Label>
              <select
                className="flex h-9 w-full border border-border bg-input px-3 py-1 text-sm text-on-background focus:outline-none focus:ring-1 focus:ring-ring"
                {...register(`variants.${index}.size`)}
              >
                <option value="">Select size…</option>
                {SIZE_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* COLOR */}
            <div className="space-y-1.5">
              <Label>Colour Name</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. Emerald Green"
                  {...register(`variants.${index}.color`)}
                />
                <Controller
                  control={control}
                  name={`variants.${index}.colorHex`}
                  render={({ field }) => (
                    <input
                      type="color"
                      value={field.value ?? '#888888'}
                      onChange={(e) => {
                        field.onChange(e.target.value)
                        const name = hexToColorName(e.target.value)
                        if (name) setValue(`variants.${index}.color`, name, { shouldValidate: true })
                      }}
                      className="h-9 w-10 cursor-pointer rounded border border-border bg-input p-0.5"
                      title="Pick swatch colour"
                    />
                  )}
                />
              </div>
              {colorHex && colorHex !== '#888888' && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="h-4 w-4 rounded-full border border-border" style={{ backgroundColor: colorHex }} />
                  <span className="text-xs text-muted font-mono">{colorHex}</span>
                </div>
              )}
            </div>
          </div>

          {/* Row 2: Fabric + Style */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* FABRIC */}
            <div className="space-y-1.5">
              <Label>Fabric</Label>
              <select
                className="flex h-9 w-full border border-border bg-input px-3 py-1 text-sm text-on-background focus:outline-none focus:ring-1 focus:ring-ring"
                {...register(`variants.${index}.fabric`)}
              >
                <option value="">Select fabric…</option>
                {FABRIC_OPTIONS.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>

            {/* STYLE */}
            <div className="space-y-1.5">
              <Label>Style / Cut</Label>
              <select
                className="flex h-9 w-full border border-border bg-input px-3 py-1 text-sm text-on-background focus:outline-none focus:ring-1 focus:ring-ring"
                {...register(`variants.${index}.style`)}
              >
                <option value="">Select style…</option>
                {STYLE_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <Separator />

          {/* Price + Stock + SKU */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>
                Price (₹) <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">₹</span>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  className="pl-7"
                  placeholder="0.00"
                  {...register(`variants.${index}.price`, { valueAsNumber: true })}
                />
              </div>
              {variantErrors?.price && (
                <p className="text-xs text-destructive">{variantErrors.price.message as string}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Stock Qty</Label>
              <Input
                type="number"
                min={0}
                step={1}
                placeholder="0"
                {...register(`variants.${index}.stock`, { valueAsNumber: true })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>SKU <span className="text-muted text-xs font-normal">(auto-generated)</span></Label>
              <Input
                readOnly
                {...register(`variants.${index}.sku`)}
                className="font-mono bg-surface text-muted cursor-not-allowed"
              />
              {variantErrors?.sku && (
                <p className="text-xs text-destructive">{variantErrors.sku.message as string}</p>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  )
}

// ─── VariantBuilder ────────────────────────────────────────────────────────────

const BLANK_VARIANT: VariantFormRow = {
  sku: '', size: '', color: '', colorHex: '#000000', fabric: '', style: '', price: 0, stock: 0,
}

export function VariantBuilder({ productSlug, basePrice: _basePrice }: { productSlug: string; basePrice: number }) {
  const { control, getValues, formState: { errors } } = useFormContext<FormValues>()
  const { fields, append, remove } = useFieldArray({ control, name: 'variants' })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted">
            Each variant = one purchasable SKU (Size × Colour × Fabric × Style)
          </p>
        </div>
        <Badge variant="secondary">{fields.length} variant{fields.length !== 1 ? 's' : ''}</Badge>
      </div>

      {typeof errors.variants?.message === 'string' && (
        <p className="text-sm text-destructive">{errors.variants.message}</p>
      )}

      {fields.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-10 text-center">
          <p className="text-sm text-muted">No variants yet.</p>
          <p className="mt-1 text-xs text-muted">Add at least one variant to make this product purchasable.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {fields.map((field, index) => (
            <VariantRow
              key={field.id}
              index={index}
              productSlug={productSlug}
              onRemove={() => remove(index)}
            />
          ))}
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        className="w-full gap-2"
        onClick={() => {
          const all = getValues('variants')
          const last = all.length > 0 ? all[all.length - 1] : null
          // Clone dimensions but drop id + sku so the new row is clearly a fresh
          // variant (backend creates it; no accidental match against the sibling).
          append(last ? { ...last, id: undefined, sku: '' } : { ...BLANK_VARIANT })
        }}
      >
        <Plus className="h-4 w-4" />
        Add Variant
      </Button>
    </div>
  )
}
