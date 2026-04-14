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

// ─── Option lists ─────────────────────────────────────────────────────────────

const SIZE_OPTIONS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free Size', 'Custom']
const FABRIC_OPTIONS = [
  'Pure Silk', 'Georgette', 'Chiffon', 'Velvet', 'Cotton', 'Linen',
  'Crepe', 'Net', 'Organza', 'Brocade', 'Satin', 'Rayon',
]
const STYLE_OPTIONS = [
  'Anarkali', 'Straight Cut', 'A-Line', 'Lehenga', 'Palazzo Set',
  'Sharara Set', 'Salwar Kameez', 'Indo-Western', 'Kurti', 'Co-ord Set',
]

// ─── SKU generator (matches backend convention) ────────────────────────────────

function generateSku(slug: string, color: string, size: string, fabric: string): string {
  const clean = (s: string) =>
    s.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4)
  const parts = [
    'VCW',
    clean(slug),
    clean(color),
    clean(size),
    clean(fabric),
  ].filter(Boolean)
  return parts.join('-')
}

// ─── Form shape (matches ProductUploadForm's productSchema) ────────────────────

interface VariantFormRow {
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
  const colorHex = useWatch({ control, name: `variants.${index}.colorHex` }) ?? '#888888'

  // Auto-generate SKU from slug + dimensions
  useEffect(() => {
    if (productSlug && color && size && fabric) {
      setValue(`variants.${index}.sku`, generateSku(productSlug, color, size, fabric), {
        shouldValidate: true,
      })
    }
  }, [productSlug, color, size, fabric, index, setValue])

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
                      onChange={(e) => field.onChange(e.target.value)}
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
          append(last ? { ...last, sku: '' } : { ...BLANK_VARIANT })
        }}
      >
        <Plus className="h-4 w-4" />
        Add Variant
      </Button>
    </div>
  )
}
