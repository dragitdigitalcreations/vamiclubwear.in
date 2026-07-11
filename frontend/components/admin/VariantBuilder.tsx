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
import { ColorWheelPicker, hexToColorName } from './ColorWheelPicker'

// ─── Option lists ─────────────────────────────────────────────────────────────

// Ordered sizes participate in range selection (click S then XXXL → everything
// between gets selected). Free Size / Custom only ever toggle individually.
const RANGE_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', '4XL', '5XL', '6XL', '7XL']
const SIZE_OPTIONS = [...RANGE_SIZES, 'Free Size', 'Custom']

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

// ─── Variant grouping ──────────────────────────────────────────────────────────
// groupId links the sibling rows spawned from one size-chip grid (one colour
// block = one group). Client-only: stripped from the API payload on submit.

export function newGroupId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `g-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

// ─── Form shape (matches ProductUploadForm's productSchema) ────────────────────

interface VariantFormRow {
  id?:       string
  sku:       string
  size?:     string
  color?:    string
  colorHex?: string
  fabric?:   string
  style?:    string
  price:     number
  stock?:    number
  groupId?:  string
}

interface FormValues {
  slug:     string
  basePrice: number
  variants: VariantFormRow[]
}

// ─── Size chip grid ───────────────────────────────────────────────────────────

function SizeChipGrid({
  ownSize,
  groupSizes,
  onToggle,
}: {
  ownSize:    string
  groupSizes: string[]
  onToggle:   (size: string) => void
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1.5">
        {SIZE_OPTIONS.map((s) => {
          const isOwn      = s === ownSize
          const isSelected = groupSizes.includes(s)
          return (
            <button
              key={s}
              type="button"
              onClick={() => onToggle(s)}
              aria-pressed={isSelected}
              className={cn(
                'min-w-10 rounded border px-2.5 py-1.5 text-xs font-medium transition-colors',
                isOwn
                  ? 'border-accent bg-accent text-accent-foreground'
                  : isSelected
                    ? 'border-accent/60 bg-accent/15 text-on-background'
                    : 'border-border bg-input text-muted hover:border-ring hover:text-on-background',
              )}
            >
              {s}
            </button>
          )
        })}
      </div>
      <p className="text-xs text-muted">
        Tap one size, then another, to auto-select every size between them.
        Tap a selected size to remove just that one — each size stays its own row with its own price &amp; stock.
      </p>
    </div>
  )
}

// ─── Single row ───────────────────────────────────────────────────────────────

function VariantRow({
  index,
  productSlug,
  groupSizes,
  onToggleSize,
  onRemove,
}: {
  index:        number
  productSlug:  string
  groupSizes:   string[]
  onToggleSize: (size: string, anchor: string | null) => string | null
  onRemove:     () => void
}) {
  const [expanded, setExpanded] = useState(true)
  // Last clicked (still-selected) size — the start point of a range selection
  const [anchor, setAnchor] = useState<string | null>(null)
  const { register, setValue, control, formState: { errors } } = useFormContext<FormValues>()

  const size     = useWatch({ control, name: `variants.${index}.size` })
  const color    = useWatch({ control, name: `variants.${index}.color` })
  const fabric   = useWatch({ control, name: `variants.${index}.fabric` })
  const style    = useWatch({ control, name: `variants.${index}.style` })

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

          {/* SIZE — multi-select chips with range fill */}
          <div className="space-y-1.5">
            <Label>Sizes</Label>
            <SizeChipGrid
              ownSize={size ?? ''}
              groupSizes={groupSizes}
              onToggle={(s) => setAnchor(onToggleSize(s, anchor))}
            />
          </div>

          {/* COLOR — free-text name + colour wheel (wheel suggests, name wins) */}
          <div className="space-y-1.5">
            <Label>Colour Name</Label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. Emerald Green"
                className="max-w-xs"
                {...register(`variants.${index}.color`)}
              />
              <Controller
                control={control}
                name={`variants.${index}.colorHex`}
                render={({ field }) => (
                  <ColorWheelPicker
                    value={field.value}
                    onChange={(hex) => {
                      field.onChange(hex)
                      const name = hexToColorName(hex)
                      if (name) setValue(`variants.${index}.color`, name, { shouldValidate: true })
                    }}
                  />
                )}
              />
            </div>
            <p className="text-xs text-muted">
              Pick an estimated shade on the wheel — the name auto-fills, but you can overwrite it with your own.
            </p>
          </div>

          {/* Row 2: Fabric + Style */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* FABRIC — preset list with a "Custom" option that reveals a free-text field.
                The persisted value stays under `fabric` (no extra schema field), so the
                preset/custom distinction is purely a UI-side toggle. */}
            <Controller
              control={control}
              name={`variants.${index}.fabric`}
              render={({ field }) => {
                const value     = field.value ?? ''
                const isPreset  = value === '' || FABRIC_OPTIONS.includes(value)
                const selectVal = value === '' ? '' : isPreset ? value : '__custom__'
                return (
                  <div className="space-y-1.5">
                    <Label>Fabric</Label>
                    <select
                      value={selectVal}
                      onChange={(e) => {
                        const v = e.target.value
                        if (v === '__custom__') {
                          // Switching to custom — clear so the input starts blank
                          // (preserve any existing custom string instead of clobbering)
                          field.onChange(isPreset ? '' : value)
                        } else {
                          field.onChange(v)
                        }
                      }}
                      className="flex h-9 w-full border border-border bg-input px-3 py-1 text-sm text-on-background focus:outline-hidden focus:ring-1 focus:ring-ring"
                    >
                      <option value="">Select fabric…</option>
                      {FABRIC_OPTIONS.map((f) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                      <option value="__custom__">Custom…</option>
                    </select>
                    {selectVal === '__custom__' && (
                      <Input
                        autoFocus
                        placeholder="Enter custom fabric (e.g. Tussar Silk)"
                        value={value}
                        onChange={(e) => field.onChange(e.target.value)}
                        maxLength={50}
                      />
                    )}
                  </div>
                )
              }}
            />

            {/* STYLE */}
            <div className="space-y-1.5">
              <Label>Style / Cut</Label>
              <select
                className="flex h-9 w-full border border-border bg-input px-3 py-1 text-sm text-on-background focus:outline-hidden focus:ring-1 focus:ring-ring"
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

function newBlankVariant(): VariantFormRow {
  return {
    sku: '', size: '', color: '', colorHex: '', fabric: '', style: '',
    price: 0, stock: 0, groupId: newGroupId(),
  }
}

export function VariantBuilder({ productSlug, basePrice: _basePrice }: { productSlug: string; basePrice: number }) {
  const { control, getValues, setValue, formState: { errors } } = useFormContext<FormValues>()
  const { fields, append, remove } = useFieldArray({ control, name: 'variants' })
  const watchedRows = useWatch({ control, name: 'variants' }) ?? []

  // Sizes currently selected in a row's group (drives the chip grid highlight)
  const groupSizesFor = (index: number): string[] => {
    const gid = watchedRows[index]?.groupId
    if (!gid) return watchedRows[index]?.size ? [watchedRows[index].size!] : []
    return watchedRows
      .filter((r) => r?.groupId === gid && r?.size)
      .map((r) => r.size!)
  }

  // Chip click handler. Returns the next range anchor for the clicking row.
  // - unselected chip + no usable anchor → select just that size
  // - unselected chip + anchor          → select every ordered size in [anchor..clicked]
  // - selected chip                     → unselect only that size (remove its row;
  //   if it's the clicking row's own size, clear it but keep the row)
  const toggleSize = (rowIndex: number, clicked: string, anchor: string | null): string | null => {
    const rows = getValues('variants')
    const row = rows[rowIndex]
    if (!row) return null
    const gid = row.groupId

    const selectedIdx = new Map<string, number>()
    rows.forEach((r, i) => {
      if (gid ? r.groupId === gid : i === rowIndex) {
        if (r.size) selectedIdx.set(r.size, i)
      }
    })

    if (selectedIdx.has(clicked)) {
      const idx = selectedIdx.get(clicked)!
      if (idx === rowIndex) {
        setValue(`variants.${rowIndex}.size`, '', { shouldDirty: true, shouldValidate: true })
      } else {
        remove(idx)
      }
      return null
    }

    let range = [clicked]
    const a = anchor ? RANGE_SIZES.indexOf(anchor) : -1
    const b = RANGE_SIZES.indexOf(clicked)
    if (a !== -1 && b !== -1 && anchor && selectedIdx.has(anchor)) {
      range = RANGE_SIZES.slice(Math.min(a, b), Math.max(a, b) + 1)
    }
    const missing = range.filter((s) => !selectedIdx.has(s))

    // Fill this row first if it has no size yet, then clone siblings for the
    // rest (same colour/fabric/style/price/stock; fresh SKU, no backend id).
    let toAppend = missing
    if (!row.size && missing.length > 0) {
      const own = missing.includes(clicked) ? clicked : missing[0]
      setValue(`variants.${rowIndex}.size`, own, { shouldDirty: true, shouldValidate: true })
      toAppend = missing.filter((s) => s !== own)
    }
    if (toAppend.length > 0) {
      append(toAppend.map((s) => ({ ...row, id: undefined, sku: '', size: s })))
    }
    return clicked
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted">
            Each variant = one purchasable SKU (Size × Colour × Fabric × Style).
            Selecting multiple sizes creates one row per size automatically.
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
              groupSizes={groupSizesFor(index)}
              onToggleSize={(size, anchor) => toggleSize(index, size, anchor)}
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
          // Clone dimensions but drop id + sku and start a fresh size group so
          // the new block's chip grid begins with only its own size selected.
          append(last ? { ...last, id: undefined, sku: '', groupId: newGroupId() } : newBlankVariant())
        }}
      >
        <Plus className="h-4 w-4" />
        Add Variant
      </Button>
    </div>
  )
}
