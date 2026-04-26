'use client'

import { useForm, FormProvider, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Loader2, Save } from 'lucide-react'

import { productsApi, ApiError } from '@/lib/api'
import { VariantBuilder } from './VariantBuilder'
import { MediaUploader, MediaItem } from './MediaUploader'
import { toast } from '@/stores/toastStore'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// ─── Zod Schema (aligned with backend: 4 dimensions) ─────────────────────────

const variantSchema = z.object({
  id:       z.string().optional(),
  sku:      z.string().min(1, 'SKU is required'),
  size:     z.string().optional(),
  color:    z.string().optional(),
  colorHex: z.string().optional(),
  fabric:   z.string().optional(),
  style:    z.string().optional(),
  price:    z.number({ invalid_type_error: 'Price must be a number' }).positive('Price must be > 0'),
  stock:    z.number().int().min(0).default(0),
})

const productSchema = z.object({
  name:            z.string().min(2, 'Product name must be at least 2 characters'),
  slug:            z.string()
                     .min(2, 'Slug is required')
                     .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only'),
  barcode:         z.string().max(128).optional(),
  perColorBarcode: z.boolean().default(false),
  description:     z.string().optional(),
  basePrice:       z.number({ invalid_type_error: 'Price must be a number' })
                     .positive('Price must be greater than ₹0'),
  categoryId:      z.string().min(1, 'Category is required'),
  isFeatured:      z.boolean().default(false),
  isActive:        z.boolean().default(true),
  variants:        z.array(variantSchema).min(1, 'At least one variant is required'),
})

type ProductFormValues = z.infer<typeof productSchema>

// ─── Slug generation from product name ────────────────────────────────────

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

// ─── Section wrapper ─────────────────────────────────────────────────────────

function Section({
  title,
  description,
  children,
  className,
}: {
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('rounded-lg border border-border bg-surface p-6', className)}>
      <div className="mb-5">
        <h2 className="font-display text-base font-semibold text-on-background">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
      </div>
      {children}
    </div>
  )
}

// (categories fetched from API in component)

// ─── ProductUploadForm ────────────────────────────────────────────────────────

interface ProductUploadFormProps {
  initialData?: Partial<ProductFormValues & {
    id: string
    colorBarcodes?: Array<{ color: string; barcode: string }>
  }>
  productId?: string
  initialMedia?: MediaItem[]
}

export function ProductUploadForm({ initialData, productId, initialMedia }: ProductUploadFormProps) {
  const router = useRouter()
  const [submitError, setSubmitError]               = useState<string | null>(null)
  const [slugConflict, setSlugConflict]             = useState(false)
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)
  const [mediaItems, setMediaItems]             = useState<MediaItem[]>(initialMedia ?? [])
  const [categories, setCategories]             = useState<Array<{ id: string; name: string }>>([])

  // Per-colour barcode map keyed by colour name. Lives outside RHF because the
  // colour list is derived from variants and changes as the admin edits rows;
  // a controlled record is simpler than a useFieldArray bound to dynamic keys.
  const [colorBarcodes, setColorBarcodes] = useState<Record<string, string>>(() => {
    const seed = initialData?.colorBarcodes ?? []
    return Object.fromEntries(seed.map((c) => [c.color, c.barcode]))
  })

  // Fetch real categories from backend
  useEffect(() => {
    productsApi.listCategories()
      .then((cats: Array<{ id: string; name: string; slug: string }>) =>
        setCategories(cats.map((c) => ({ id: c.id, name: c.name })))
      )
      .catch(() => {/* non-fatal: categories stay empty */})
  }, [])

  const methods = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name:            initialData?.name        ?? '',
      slug:            initialData?.slug        ?? '',
      barcode:         (initialData as any)?.barcode ?? '',
      perColorBarcode: (initialData as any)?.perColorBarcode ?? false,
      description:     initialData?.description ?? '',
      basePrice:       initialData?.basePrice   ?? 0,
      categoryId:      initialData?.categoryId  ?? '',
      isFeatured:      initialData?.isFeatured  ?? false,
      isActive:        initialData?.isActive    ?? true,
      variants:        initialData?.variants    ?? [],
    },
    mode: 'onBlur',
  })

  const {
    register,
    handleSubmit,
    setValue,
    control,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = methods

  const nameValue = watch('name')
  useEffect(() => {
    if (!slugManuallyEdited && nameValue) {
      setValue('slug', toSlug(nameValue), { shouldValidate: true })
    }
  }, [nameValue, slugManuallyEdited, setValue])

  const slugValue       = useWatch({ control, name: 'slug' })
  const basePrice       = useWatch({ control, name: 'basePrice' }) ?? 0
  const isFeatured      = useWatch({ control, name: 'isFeatured' })
  const isActive        = useWatch({ control, name: 'isActive' })
  const perColorBarcode = useWatch({ control, name: 'perColorBarcode' })
  const variantRows     = useWatch({ control, name: 'variants' }) ?? []

  // Distinct (colour, colorHex) pairs defined on the current variants — used
  // by MediaUploader so admins can bind images to a specific colour variant.
  const colorOptions = (() => {
    const seen = new Map<string, string | null>()
    for (const v of variantRows) {
      const name = (v?.color ?? '').trim()
      if (!name || seen.has(name)) continue
      seen.set(name, v?.colorHex ?? null)
    }
    return Array.from(seen.entries()).map(([color, colorHex]) => ({ color, colorHex }))
  })()

  const onSubmit = async (data: ProductFormValues) => {
    setSubmitError(null)

    // Block if any media is still uploading
    if (mediaItems.some((m) => m.uploading)) {
      setSubmitError('Please wait for all uploads to complete.')
      return
    }

    // Build media payload from successfully uploaded items (have Cloudinary URLs)
    const mediaPayload = mediaItems
      .filter((m) => !m.uploading && !m.error && m.url && !m.url.startsWith('blob:'))
      .map((m, idx) => ({
        url:       m.url,
        type:      m.type,
        altText:   m.altText || undefined,
        isPrimary: m.isPrimary,
        sortOrder: idx,
      }))

    // Build per-colour barcode rows from the current variant colours so we
    // never send entries for colours the admin has since removed.
    const colorBarcodesPayload = data.perColorBarcode
      ? colorOptions
          .map(({ color }) => ({ color, barcode: (colorBarcodes[color] ?? '').trim() }))
          .filter((c) => c.barcode.length > 0)
      : []

    if (data.perColorBarcode && colorOptions.length === 0) {
      setSubmitError('Add at least one variant with a colour before enabling per-colour barcodes.')
      return
    }

    const payload = {
      ...data,
      barcode: data.perColorBarcode ? '' : (data.barcode ?? ''),
      colorBarcodes: colorBarcodesPayload,
      media: mediaPayload,
    }

    try {
      if (productId) {
        await productsApi.update(productId, payload as any)
        toast.success('Product updated successfully')
      } else {
        await productsApi.create(payload as any)
        toast.success('Product created successfully')
      }
      router.push('/admin/products')
      router.refresh()
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'An unexpected error occurred.'
      setSlugConflict(false)
      setSubmitError(msg)
      toast.error(msg)
    }
  }

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">

        {/* ── 1. Core Product Information ── */}
        <Section
          title="Product Information"
          description="Basic details visible in the storefront catalogue"
        >
          <div className="space-y-5">
            {/* Name + Slug */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="name">
                  Product Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="e.g. Zari Fusion Suit"
                  {...register('name')}
                />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="slug">
                  URL Slug <span className="text-destructive">*</span>
                </Label>
                <div className={cn(
                  'flex items-center gap-1 rounded-md border bg-input focus-within:ring-1 focus-within:ring-ring overflow-hidden',
                  slugConflict ? 'border-yellow-500' : 'border-border'
                )}>
                  <span className="shrink-0 border-r border-border bg-surface-elevated px-3 py-2 text-xs text-muted select-none">
                    /products/
                  </span>
                  <input
                    id="slug"
                    className="flex-1 bg-transparent px-2 py-2 text-sm text-on-background outline-none placeholder:text-muted"
                    placeholder="zari-fusion-suit"
                    {...register('slug', {
                      onChange: () => { setSlugManuallyEdited(true); setSlugConflict(false) },
                    })}
                  />
                </div>
                {slugConflict && (
                  <p className="text-xs text-yellow-400">Slug was taken — updated above. Save again to confirm.</p>
                )}
                {errors.slug && <p className="text-xs text-destructive">{errors.slug.message}</p>}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={4}
                placeholder="Describe the style, occasion suitability, and notable design details…"
                {...register('description')}
              />
            </div>

            {/* Barcode mode toggle + inputs */}
            <div className="space-y-3 rounded-md border border-border bg-surface-elevated/30 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-0.5">
                  <Label htmlFor="perColorBarcode" className="cursor-pointer">
                    Use a separate barcode for each colour
                  </Label>
                  <p className="text-xs text-muted">
                    {perColorBarcode
                      ? 'Each colour bundle (all sizes of that colour) shares one barcode.'
                      : 'A single barcode is used for the entire product, shared by every variant.'}
                  </p>
                </div>
                <Switch
                  id="perColorBarcode"
                  checked={!!perColorBarcode}
                  onCheckedChange={(v: boolean) => setValue('perColorBarcode', v, { shouldDirty: true })}
                />
              </div>

              {!perColorBarcode && (
                <div className="space-y-1.5 pt-1">
                  <Label htmlFor="barcode" className="text-xs uppercase tracking-wide text-muted">
                    Product Barcode / QR Code
                  </Label>
                  <Input
                    id="barcode"
                    placeholder="Scan with barcode scanner or type manually…"
                    className="font-mono"
                    {...register('barcode')}
                  />
                </div>
              )}

              {perColorBarcode && (
                <div className="space-y-2 pt-1">
                  <p className="text-xs uppercase tracking-wide text-muted">
                    Per-colour barcodes
                  </p>
                  {colorOptions.length === 0 ? (
                    <p className="rounded border border-dashed border-border px-3 py-3 text-xs text-muted">
                      Add at least one variant with a colour below — a barcode field will appear here for each distinct colour.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {colorOptions.map(({ color, colorHex }) => (
                        <div
                          key={color}
                          className="grid grid-cols-[auto_1fr] items-center gap-3 rounded border border-border bg-surface px-3 py-2"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="h-4 w-4 rounded-full border border-border"
                              style={{ backgroundColor: colorHex ?? '#888888' }}
                            />
                            <span className="text-sm text-on-background min-w-[8rem]">{color}</span>
                          </div>
                          <Input
                            placeholder="Scan or type the barcode for this colour…"
                            className="font-mono"
                            value={colorBarcodes[color] ?? ''}
                            onChange={(e) =>
                              setColorBarcodes((prev) => ({ ...prev, [color]: e.target.value }))
                            }
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        </Section>

        {/* ── 2. Pricing & Category ── */}
        <Section
          title="Pricing & Category"
          description="Base price is adjusted per variant using the price modifier field"
        >
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {/* Base Price */}
            <div className="space-y-1.5">
              <Label htmlFor="basePrice">
                Base Price (₹) <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted select-none">₹</span>
                <Input
                  id="basePrice"
                  type="number"
                  min={0}
                  step={0.01}
                  className="pl-7"
                  placeholder="0.00"
                  {...register('basePrice', { valueAsNumber: true })}
                />
              </div>
              {errors.basePrice && (
                <p className="text-xs text-destructive">{errors.basePrice.message}</p>
              )}
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <Label htmlFor="categoryId">
                Category <span className="text-destructive">*</span>
              </Label>
              <select
                id="categoryId"
                {...register('categoryId')}
                className="flex h-9 w-full rounded-md border border-border bg-input px-3 py-1 text-sm text-on-background focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Select category…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {errors.categoryId && (
                <p className="text-xs text-destructive">{errors.categoryId.message}</p>
              )}
            </div>

            {/* Featured toggle */}
            <div className="flex flex-col justify-end space-y-1.5 pb-0.5">
              <Label htmlFor="isFeatured">Featured Product</Label>
              <div className="flex items-center gap-3">
                <Switch
                  id="isFeatured"
                  checked={!!isFeatured}
                  onCheckedChange={(v: boolean) => setValue('isFeatured', v)}
                />
                <span className="text-sm text-muted">
                  {isFeatured ? 'Shown on homepage hero' : 'Not featured'}
                </span>
              </div>
            </div>

            {/* Active toggle */}
            <div className="flex flex-col justify-end space-y-1.5 pb-0.5">
              <Label htmlFor="isActive">Listing Status</Label>
              <div className="flex items-center gap-3">
                <Switch
                  id="isActive"
                  checked={!!isActive}
                  onCheckedChange={(v: boolean) => setValue('isActive', v)}
                />
                <span className={`text-sm ${isActive ? 'text-green-400' : 'text-muted'}`}>
                  {isActive ? 'Active — visible in shop' : 'Inactive — hidden from shop'}
                </span>
              </div>
            </div>
          </div>
        </Section>

        {/* ── 3. Media ── */}
        <Section
          title="Product Media"
          description="Upload images and MP4 videos. Drag to reorder. Star marks the primary listing image. Bind an image to a colour variant below so the storefront swaps the preview when a customer selects that colour."
        >
          <MediaUploader value={mediaItems} onChange={setMediaItems} colorOptions={colorOptions} />
        </Section>

        {/* ── 4. Variants (5-Dimension) — main focus ── */}
        <Section
          title="Product Variants"
          description="Every purchasable unit must have a variant. The system auto-generates a unique SKU from each dimension combination."
        >
          <VariantBuilder productSlug={slugValue ?? ''} basePrice={Number(basePrice)} />
        </Section>

        {/* ── Submit bar ── */}
        <div className="sticky bottom-0 z-10 flex items-center justify-between rounded-lg border border-border bg-surface px-6 py-4 shadow-lg">
          <div className="flex items-center gap-3">
            {isDirty && (
              <Badge variant="secondary" className="text-xs">Unsaved changes</Badge>
            )}
            {submitError && (
              <p className="text-sm text-destructive">{submitError}</p>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/admin/products')}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="min-w-[120px] gap-2"
            >
              {isSubmitting ? (
                <><Loader2 className="h-4 w-4 animate-spin" />Saving…</>
              ) : (
                <><Save className="h-4 w-4" />{productId ? 'Update Product' : 'Save Product'}</>
              )}
            </Button>
          </div>
        </div>

      </form>
    </FormProvider>
  )
}
