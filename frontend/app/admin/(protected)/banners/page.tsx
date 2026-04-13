'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Plus, Trash2, Upload, Eye, EyeOff, GripVertical,
  Monitor, Tablet, Smartphone, ChevronDown, ChevronUp, Check,
} from 'lucide-react'
import { AdminHeader } from '@/components/admin/AdminHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { bannersApi, uploadsApi, HeroBanner } from '@/lib/api'
import { toast } from '@/stores/toastStore'

// ─── Types ─────────────────────────────────────────────────────────────────────
type BannerDraft = Partial<HeroBanner>

// ─── ImageUploadCell ──────────────────────────────────────────────────────────
function ImageUploadCell({
  label, icon: Icon, value, onUploaded,
}: {
  label: string
  icon: React.ElementType
  value: string | null
  onUploaded: (url: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const [result] = await uploadsApi.upload([file])
      onUploaded(result.url)
      toast.success(`${label} image uploaded`)
    } catch {
      toast.error('Upload failed')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted">
        <Icon className="h-3 w-3" /> {label}
      </p>

      {/* Preview / upload area */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="relative flex h-[90px] w-full items-center justify-center overflow-hidden rounded-[10px] border-2 border-dashed border-border bg-surface-elevated hover:border-primary-light hover:bg-background transition-colors disabled:opacity-50"
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt={label} className="h-full w-full object-cover rounded-[8px]" />
        ) : (
          <div className="flex flex-col items-center gap-1 text-muted">
            <Upload className="h-4 w-4" />
            <span className="text-[10px]">{uploading ? 'Uploading…' : 'Upload'}</span>
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-[8px] bg-white/70">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  )
}

// ─── BannerRow ────────────────────────────────────────────────────────────────
function BannerRow({
  banner, index, onSave, onDelete, onToggleActive,
}: {
  banner: HeroBanner
  index:  number
  onSave: (id: string, data: BannerDraft) => Promise<void>
  onDelete: (id: string) => void
  onToggleActive: (id: string, current: boolean) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [draft, setDraft] = useState<BannerDraft>({ ...banner })

  function field(key: keyof HeroBanner) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setDraft((d) => ({ ...d, [key]: e.target.value }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      await onSave(banner.id, draft)
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full rounded-[8px] border border-border bg-surface-elevated px-3 py-2 text-sm text-on-background placeholder:text-muted outline-none focus:border-ring focus:bg-white transition-colors'

  return (
    <div className={`rounded-[10px] border ${banner.isActive ? 'border-border' : 'border-border/50 opacity-60'} bg-surface overflow-hidden`}>
      {/* ── Header row ── */}
      <div className="flex items-center gap-3 px-4 py-3">
        <GripVertical className="h-4 w-4 shrink-0 text-muted cursor-grab" />

        {/* Slide # pill */}
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-elevated text-xs font-bold text-on-background">
          {index + 1}
        </span>

        {/* Title preview */}
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-medium text-on-background">
            {draft.titleLine1 || draft.titleLine2
              ? `${draft.titleLine1 ?? ''} ${draft.titleLine2 ?? ''}`.trim()
              : <span className="italic text-muted">Untitled slide</span>}
          </p>
          <p className="truncate text-xs text-muted">{draft.eyebrow ?? '—'}</p>
        </div>

        {/* Accent dot */}
        <span
          className="h-3 w-3 rounded-full border border-border shrink-0"
          style={{ backgroundColor: draft.accentColor ?? '#8B6B47' }}
          title="Accent colour"
        />

        {/* Active toggle */}
        <button
          onClick={() => onToggleActive(banner.id, banner.isActive)}
          title={banner.isActive ? 'Deactivate slide' : 'Activate slide'}
          className="shrink-0 p-1.5 text-muted hover:text-on-background transition-colors"
        >
          {banner.isActive
            ? <Eye className="h-4 w-4 text-success" />
            : <EyeOff className="h-4 w-4" />}
        </button>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="shrink-0 p-1.5 text-muted hover:text-on-background transition-colors"
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {/* ── Expanded editor ── */}
      {expanded && (
        <div className="border-t border-border px-4 pb-5 pt-4 space-y-5">

          {/* Image uploads */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
              Responsive Images
            </p>
            <div className="grid grid-cols-3 gap-3">
              <ImageUploadCell
                label="Desktop" icon={Monitor}
                value={draft.imageDesktop ?? null}
                onUploaded={(url) => setDraft((d) => ({ ...d, imageDesktop: url }))}
              />
              <ImageUploadCell
                label="Tablet" icon={Tablet}
                value={draft.imageTablet ?? null}
                onUploaded={(url) => setDraft((d) => ({ ...d, imageTablet: url }))}
              />
              <ImageUploadCell
                label="Mobile" icon={Smartphone}
                value={draft.imageMobile ?? null}
                onUploaded={(url) => setDraft((d) => ({ ...d, imageMobile: url }))}
              />
            </div>
          </div>

          {/* Text content */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
              Slide Copy
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-muted">Eyebrow label</label>
                <input className={inputCls} value={draft.eyebrow ?? ''} onChange={field('eyebrow')} placeholder="e.g. New Season — Spring 2025" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted">Accent colour (hex)</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={draft.accentColor ?? '#8B6B47'}
                    onChange={(e) => setDraft((d) => ({ ...d, accentColor: e.target.value }))}
                    className="h-9 w-12 cursor-pointer rounded-[8px] border border-border bg-surface-elevated p-1"
                  />
                  <input className={`${inputCls} flex-1`} value={draft.accentColor ?? '#8B6B47'} onChange={field('accentColor')} placeholder="#8B6B47" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted">Headline — Line 1</label>
                <input className={inputCls} value={draft.titleLine1 ?? ''} onChange={field('titleLine1')} placeholder="Where Heritage" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted">Headline — Line 2 (accent)</label>
                <input className={inputCls} value={draft.titleLine2 ?? ''} onChange={field('titleLine2')} placeholder="Meets Modernity" />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs text-muted">Subtitle text</label>
                <textarea
                  rows={2}
                  className={`${inputCls} resize-none`}
                  value={draft.subtitle ?? ''}
                  onChange={field('subtitle')}
                  placeholder="One-liner describing this collection…"
                />
              </div>
            </div>
          </div>

          {/* CTA buttons */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
              CTA Buttons
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-muted">Primary button label</label>
                <input className={inputCls} value={draft.ctaLabel ?? ''} onChange={field('ctaLabel')} placeholder="Shop Now" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted">Primary button link</label>
                <input className={inputCls} value={draft.ctaHref ?? ''} onChange={field('ctaHref')} placeholder="/products" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted">Secondary button label</label>
                <input className={inputCls} value={draft.ctaAltLabel ?? ''} onChange={field('ctaAltLabel')} placeholder="Bridal Edit" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted">Secondary button link</label>
                <input className={inputCls} value={draft.ctaAltHref ?? ''} onChange={field('ctaAltHref')} placeholder="/products?category=bridal" />
              </div>
            </div>
          </div>

          {/* Theme toggle */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <div
                onClick={() => setDraft((d) => ({ ...d, darkTheme: !d.darkTheme }))}
                className={`relative h-5 w-9 rounded-full transition-colors ${draft.darkTheme ? 'bg-on-background' : 'bg-border'}`}
              >
                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${draft.darkTheme ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </div>
              <span className="text-sm text-on-background">Dark slide theme</span>
            </label>
            <span className="text-xs text-muted">(white text on dark background)</span>
          </div>

          {/* Sort order */}
          <div className="flex items-center gap-3">
            <label className="text-xs text-muted w-20 shrink-0">Sort order</label>
            <input
              type="number"
              min={0}
              className={`${inputCls} w-24`}
              value={draft.sortOrder ?? 0}
              onChange={(e) => setDraft((d) => ({ ...d, sortOrder: parseInt(e.target.value, 10) || 0 }))}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between border-t border-border pt-4">
            <button
              type="button"
              onClick={() => onDelete(banner.id)}
              className="flex items-center gap-1.5 text-xs font-medium text-muted hover:text-destructive transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete slide
            </button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="gap-1.5 bg-on-background text-white hover:bg-primary-dark px-5 py-2 text-xs"
            >
              {saving ? (
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              Save slide
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function BannersPage() {
  const [banners, setBanners] = useState<HeroBanner[]>([])
  const [loading, setLoading] = useState(true)

  function load() {
    setLoading(true)
    bannersApi.listAll()
      .then(setBanners)
      .catch(() => toast.error('Failed to load banners'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  async function handleSave(id: string, data: BannerDraft) {
    try {
      const updated = await bannersApi.update(id, data)
      setBanners((prev) => prev.map((b) => b.id === id ? updated : b))
      toast.success('Slide saved')
    } catch {
      toast.error('Failed to save slide')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this banner slide? This cannot be undone.')) return
    try {
      await bannersApi.delete(id)
      setBanners((prev) => prev.filter((b) => b.id !== id))
      toast.success('Slide deleted')
    } catch {
      toast.error('Failed to delete')
    }
  }

  async function handleToggleActive(id: string, current: boolean) {
    try {
      const updated = await bannersApi.update(id, { isActive: !current })
      setBanners((prev) => prev.map((b) => b.id === id ? updated : b))
    } catch {
      toast.error('Failed to update')
    }
  }

  async function handleCreate() {
    try {
      const next = await bannersApi.create({
        sortOrder:   banners.length,
        isActive:    false,
        accentColor: '#8B6B47',
      })
      setBanners((prev) => [...prev, next])
      toast.success('New slide created — expand it below to configure')
    } catch {
      toast.error('Failed to create slide')
    }
  }

  const activeCount = banners.filter((b) => b.isActive).length

  return (
    <>
      <AdminHeader
        title="Hero Banners"
        subtitle="Manage the storefront carousel slides"
      />

      <div className="p-6 space-y-5">

        {/* ── Top bar ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <p className="text-sm text-muted">{banners.length} total slides</p>
            <Badge variant={activeCount > 0 ? 'default' : 'secondary'}>
              {activeCount} active
            </Badge>
          </div>
          <Button onClick={handleCreate} className="gap-2 bg-on-background text-white hover:bg-primary-dark text-xs px-4 py-2">
            <Plus className="h-3.5 w-3.5" />
            Add Slide
          </Button>
        </div>

        {/* ── Info callout ── */}
        <div className="rounded-[10px] border border-border bg-surface-elevated px-4 py-3 text-xs text-muted">
          <strong className="text-on-background">Images:</strong> Upload separate versions for{' '}
          <strong>Desktop</strong> (≥1024px), <strong>Tablet</strong> (768–1023px), and{' '}
          <strong>Mobile</strong> (&lt;768px). If a size is blank, the next larger size is used as fallback.
          Recommended aspect ratio: <strong>Desktop 16:7</strong> · <strong>Tablet 4:3</strong> · <strong>Mobile 3:4</strong>.
        </div>

        {/* ── Slides ── */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-14 w-full rounded-[10px]" />
            ))}
          </div>
        ) : banners.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[10px] border border-dashed border-border py-16 text-center">
            <p className="text-sm font-medium text-on-background">No slides yet</p>
            <p className="mt-1 text-xs text-muted">Click "Add Slide" to create your first hero banner</p>
          </div>
        ) : (
          <div className="space-y-3">
            {banners.map((banner, i) => (
              <BannerRow
                key={banner.id}
                banner={banner}
                index={i}
                onSave={handleSave}
                onDelete={handleDelete}
                onToggleActive={handleToggleActive}
              />
            ))}
          </div>
        )}
      </div>
    </>
  )
}
