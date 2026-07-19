'use client'

// Admin Blog — author the storefront Style Journal (/blog). No AI/API: a
// non-technical operator gets a starter-template picker (beats the blank
// page), a formatting toolbar (so they never type raw HTML), and a live
// preview that renders exactly what the storefront will show.

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Loader2, Plus, Trash2, ExternalLink, Eye, Search, X, Star, FileText, Save, Upload, ScanBarcode,
} from 'lucide-react'
import { blogApi, productsApi, uploadsApi, AdminBlogPost, BLOG_CATEGORIES, ApiError } from '@/lib/api'
import type { ProductListItem } from '@/types/admin'
import { toast } from '@/stores/toastStore'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'

function toSlug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
}
function prettifySlug(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

// ─── Starter templates — the free replacement for "generate with AI" ──────────
// Each seeds a proven post structure so the operator fills blanks instead of
// facing an empty editor. Categories map to the storefront filter.

interface Template { label: string; category: string; description: string; body: string }

const TEMPLATES: Template[] = [
  {
    label: 'Styling Guide',
    category: 'Styling Guides',
    description: 'A how-to-wear guide that positions a silhouette for an occasion.',
    body: `<p>Open with the reader's goal — the occasion, the body type, or the look they want to pull off. One or two warm, confident sentences.</p>
<h2>Why this silhouette works</h2>
<p>Explain the flattering points in plain language — where it skims, where it structures, who it suits.</p>
<h3>1. Start with the base</h3>
<p>Describe the core piece and how to fit it.</p>
<h3>2. Layer and drape</h3>
<p>Dupatta draping, jacket, or layering notes.</p>
<h3>3. Finish the look</h3>
<ul>
<li>Footwear suggestion</li>
<li>Jewellery / accessories</li>
<li>Hair &amp; makeup direction</li>
</ul>
<h2>Shop this look</h2>
<p>Point readers to the pieces below, and invite them to WhatsApp for size guidance.</p>`,
  },
  {
    label: 'Occasion Lookbook',
    category: 'Occasion Edit',
    description: 'Several outfit ideas built around one event (wedding guest, Eid, engagement).',
    body: `<p>Set the scene for the occasion and what to aim for as a guest — festive but not over the top, comfortable for a long day, etc.</p>
<h2>Look 1 — The classic</h2>
<p>Describe the outfit and when it shines.</p>
<h2>Look 2 — The statement</h2>
<p>Describe the bolder option.</p>
<h2>Look 3 — The understated</h2>
<p>Describe the modest / minimal option.</p>
<h2>Shop the edit</h2>
<p>Tie the looks to the pieces below.</p>`,
  },
  {
    label: 'Fabric & Care',
    category: 'Fabric & Care',
    description: 'Explain a fabric and how to care for it — builds trust at a premium price.',
    body: `<p>Introduce the fabric and why it matters for this kind of garment.</p>
<h2>What makes it special</h2>
<p>Texture, drape, breathability, occasion suitability.</p>
<h2>How to care for it</h2>
<ul>
<li>Washing — hand wash / dry clean, water temperature</li>
<li>Drying — shade dry, avoid wringing</li>
<li>Storing — fold vs hang, protecting embroidery / zari</li>
<li>Ironing — heat setting, press cloth</li>
</ul>
<h2>Explore the collection</h2>
<p>Link the pieces in this fabric below.</p>`,
  },
  {
    label: 'Size & Fit Guide',
    category: 'Size & Fit',
    description: 'Plus-size / big-size fit guidance up to XXXL — a size-inclusive trust builder.',
    body: `<p>Reassure the reader: size-inclusive fashion should fit beautifully, not just "go up to" a number.</p>
<h2>How to measure yourself</h2>
<ul>
<li>Bust — around the fullest part</li>
<li>Waist — the narrowest point</li>
<li>Hips — the fullest part</li>
</ul>
<h2>Choosing your size</h2>
<p>How our sizing runs, and what to do between two sizes.</p>
<h2>Fit tips for every body</h2>
<p>Silhouette advice for different shapes.</p>
<h2>Still unsure?</h2>
<p>Invite a WhatsApp message for personal size help.</p>`,
  },
  {
    label: 'Blank post',
    category: '',
    description: 'Start from scratch.',
    body: `<h2>Section heading</h2>
<p>Start writing here…</p>`,
  },
]

// ─── Formatting toolbar — wraps the textarea selection in HTML so the operator
// never types tags by hand. Text-label buttons (clearer than icons here). ────

function FormatToolbar({
  textareaRef, value, onChange,
}: {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  value: string
  onChange: (next: string) => void
}) {
  const apply = (transform: (sel: string) => string, caretOffset = 0) => {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const selected = value.slice(start, end)
    const replacement = transform(selected)
    const next = value.slice(0, start) + replacement + value.slice(end)
    onChange(next)
    requestAnimationFrame(() => {
      ta.focus()
      const caret = start + (selected ? replacement.length : caretOffset)
      ta.selectionStart = ta.selectionEnd = caret
    })
  }

  const block = (tag: string) => apply(
    (s) => `\n<${tag}>${s || 'Text'}</${tag}>\n`,
    `\n<${tag}>`.length,
  )
  const inline = (tag: string) => apply((s) => `<${tag}>${s || 'text'}</${tag}>`, `<${tag}>`.length)
  const list = () => apply((s) => {
    const items = (s || 'First item\nSecond item').split('\n').filter(Boolean)
    return `\n<ul>\n${items.map((i) => `  <li>${i}</li>`).join('\n')}\n</ul>\n`
  })
  const link = () => {
    const url = window.prompt('Link URL (use /products/... for your own products, or a full https:// link):', '/products/')
    if (!url) return
    apply((s) => `<a href="${url}">${s || 'link text'}</a>`, `<a href="${url}">`.length)
  }

  const btn = 'rounded border border-border bg-input px-2.5 py-1 text-xs font-medium text-on-background transition-colors hover:border-ring hover:bg-surface-elevated'
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button type="button" className={cn(btn, 'font-semibold')} onClick={() => block('h2')} title="Section heading">H2</button>
      <button type="button" className={btn} onClick={() => block('h3')} title="Sub-heading">H3</button>
      <button type="button" className={btn} onClick={() => block('p')} title="Paragraph">¶ Text</button>
      <span className="mx-0.5 h-4 w-px bg-border" />
      <button type="button" className={cn(btn, 'font-bold')} onClick={() => inline('strong')} title="Bold">B</button>
      <button type="button" className={cn(btn, 'italic')} onClick={() => inline('em')} title="Italic">I</button>
      <button type="button" className={btn} onClick={list} title="Bulleted list">• List</button>
      <button type="button" className={btn} onClick={link} title="Insert link">Link</button>
    </div>
  )
}

// ─── Related-products picker ───────────────────────────────────────────────────

// The list/barcode APIs return each product's variants (fabric, style, colour,
// hex) even though ProductListItem under-declares them — surface those details
// on dropdown rows so identically-named products are tellable apart.
interface PickerVariant {
  fabric?: string | null
  style?: string | null
  color?: string | null
  colorHex?: string | null
}
type PickerProduct = ProductListItem & { variants?: PickerVariant[] }

function variantMeta(variants: PickerVariant[] | undefined) {
  const vs = variants ?? []
  const uniq = (key: 'fabric' | 'style') =>
    Array.from(new Set(vs.map((v) => v[key]).filter(Boolean))) as string[]
  const colors: Array<{ color: string; colorHex: string | null }> = []
  const seen = new Set<string>()
  for (const v of vs) {
    if (v.color && !seen.has(v.color)) {
      seen.add(v.color)
      colors.push({ color: v.color, colorHex: v.colorHex ?? null })
    }
  }
  return { fabrics: uniq('fabric'), styles: uniq('style'), colors }
}

// Secondary line + swatches for a dropdown row: "Chinon · Anarkali" ●●● ₹4,999
function RowMeta({ variants, basePrice }: { variants?: PickerVariant[]; basePrice?: number | string }) {
  const { fabrics, styles, colors } = variantMeta(variants)
  const label = [...fabrics, ...styles].join(' · ')
  const price = basePrice != null && Number(basePrice) > 0 ? `₹${Number(basePrice).toLocaleString('en-IN')}` : ''
  if (!label && colors.length === 0 && !price) return null
  return (
    <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
      {label && <span className="truncate">{label}</span>}
      {colors.slice(0, 4).map((c) => (
        <span
          key={c.color}
          title={c.color}
          className="h-2.5 w-2.5 shrink-0 rounded-full border border-border/60"
          style={{ backgroundColor: c.colorHex ?? '#888888' }}
        />
      ))}
      {colors.length > 4 && <span className="shrink-0 text-[10px]">+{colors.length - 4}</span>}
      {price && <span className="ml-auto shrink-0 font-medium text-fg-3">{price}</span>}
    </span>
  )
}

function ProductPicker({
  selected, onChange,
}: {
  selected: string[]                 // product slugs
  onChange: (slugs: string[]) => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PickerProduct[]>([])
  // Barcode hit shown at the top of the dropdown — the same scanner the POS
  // uses types the code and sends Enter, so scanning a garment's tag adds it.
  const [barcodeHit, setBarcodeHit] = useState<{ id: string; name: string; slug: string; variants?: PickerVariant[] } | null>(null)
  const [searching, setSearching] = useState(false)
  const [names, setNames] = useState<Record<string, string>>({})
  // Store's featured products — one-tap quick-adds when the box is empty.
  const [featured, setFeatured] = useState<ProductListItem[]>([])

  useEffect(() => {
    productsApi.list({ isFeatured: 'true', limit: 8 })
      .then((r) => setFeatured(r.data))
      .catch(() => {/* non-fatal — quick-adds just don't show */})
  }, [])

  useEffect(() => {
    if (!query.trim()) { setResults([]); setBarcodeHit(null); return }
    let live = true
    setSearching(true)
    const t = setTimeout(() => {
      const q = query.trim()
      Promise.allSettled([
        productsApi.list({ search: q, limit: 6 }),
        // Also try the code as a barcode (product-level or per-colour) —
        // 404s are expected while typing a name, so failures are silent.
        q.length >= 3 ? productsApi.getProductByBarcode(q) : Promise.reject(new Error('skip')),
      ]).then(([nameRes, barcodeRes]) => {
        if (!live) return
        setResults(nameRes.status === 'fulfilled' ? (nameRes.value.data as PickerProduct[]) : [])
        setBarcodeHit(
          barcodeRes.status === 'fulfilled'
            ? {
                id: barcodeRes.value.id,
                name: barcodeRes.value.name,
                slug: barcodeRes.value.slug,
                variants: barcodeRes.value.variants as PickerVariant[],
              }
            : null,
        )
      }).finally(() => { if (live) setSearching(false) })
    }, 300)
    return () => { live = false; clearTimeout(t) }
  }, [query])

  const add = (p: { slug: string; name: string }) => {
    if (!selected.includes(p.slug)) {
      onChange([...selected, p.slug])
      setNames((n) => ({ ...n, [p.slug]: p.name }))
    }
    setQuery('')
    setResults([])
    setBarcodeHit(null)
  }
  const remove = (slug: string) => onChange(selected.filter((s) => s !== slug))

  // Scanner flow: barcode guns terminate with Enter. Resolve everything fresh
  // here — the debounced dropdown state can be a query behind when Enter lands
  // (scanners type faster than the 300ms debounce), so trusting it would add
  // the previous query's first result.
  const handleEnter = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const q = query.trim()
    if (!q) return
    try {
      const p = await productsApi.getProductByBarcode(q)
      if (p?.slug) { add({ slug: p.slug, name: p.name }); toast.success(`Added ${p.name} (barcode)`); return }
    } catch { /* not a barcode — fall through to a fresh name search */ }
    try {
      const r = await productsApi.list({ search: q, limit: 1 })
      if (r.data.length > 0) { add(r.data[0]); return }
    } catch { /* fall through to the error toast */ }
    toast.error(`No product found for “${q}” — try a name or scan the barcode again.`)
  }

  const quickAdds = featured.filter((p) => !selected.includes(p.slug))

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleEnter}
          placeholder="Search by name — or scan / type a barcode…"
          className="pl-8"
        />
        {(results.length > 0 || barcodeHit || searching) && (
          <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-border bg-surface shadow-xl">
            {searching && <p className="px-3 py-2 text-xs text-muted">Searching…</p>}
            {barcodeHit && (
              <button
                key={barcodeHit.id}
                type="button"
                onClick={() => add(barcodeHit)}
                className="block w-full px-3 py-2 text-left text-sm text-on-background hover:bg-surface-elevated"
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-2">
                    <ScanBarcode className="h-3.5 w-3.5 shrink-0 text-accent" />
                    <span className="truncate">{barcodeHit.name}</span>
                  </span>
                  <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-accent">Barcode match</span>
                </span>
                <RowMeta variants={barcodeHit.variants} />
              </button>
            )}
            {results.filter((p) => p.slug !== barcodeHit?.slug).map((p) => {
              // The list API returns category as { id, name, slug } (the
              // ProductListItem type says string, but the relation is included
              // — see product.service listInclude). Render the name defensively.
              const catLabel =
                typeof p.category === 'string'
                  ? p.category
                  : (p.category as { name?: string } | null | undefined)?.name ?? ''
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => add(p)}
                  className="block w-full px-3 py-2 text-left text-sm text-on-background hover:bg-surface-elevated"
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate">{p.name}</span>
                    {catLabel && <span className="shrink-0 text-xs text-muted">{catLabel}</span>}
                  </span>
                  <RowMeta variants={p.variants} basePrice={p.basePrice} />
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Featured quick-adds — shown while the search box is empty */}
      {!query.trim() && quickAdds.length > 0 && (
        <div className="space-y-1">
          <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted">
            <Star className="h-3 w-3 fill-accent text-accent" /> Quick add · featured products
          </p>
          <div className="flex flex-wrap gap-1.5">
            {quickAdds.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => add(p)}
                className="flex items-center gap-1 rounded-full border border-dashed border-border px-2.5 py-1 text-xs text-fg-3 transition-colors hover:border-accent hover:text-accent"
              >
                <Plus className="h-3 w-3" /> {p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((slug) => (
            <span key={slug} className="flex items-center gap-1 rounded-full border border-border bg-surface-elevated px-2.5 py-1 text-xs text-on-background">
              {names[slug] ?? prettifySlug(slug)}
              <button type="button" onClick={() => remove(slug)} className="text-muted hover:text-destructive" aria-label={`Remove ${slug}`}>
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Cover image uploader ─────────────────────────────────────────────────────
// Upload straight from the operator's device to Cloudinary (same endpoint the
// product photos use) — no pasting URLs. Stores the returned URL in coverImage.

function CoverImageUploader({
  value, onChange,
}: {
  value: string
  onChange: (url: string) => void
}) {
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const handleFiles = async (files: FileList | null) => {
    const file = files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error('Please choose an image file (JPG, PNG or WebP).'); return }
    if (file.size > 10 * 1024 * 1024) { toast.error('That image is over 10 MB — please use a smaller photo.'); return }
    setUploading(true)
    try {
      const [uploaded] = await uploadsApi.upload([file])
      if (uploaded?.url) { onChange(uploaded.url); toast.success('Cover image uploaded') }
      else toast.error('Upload failed — please try again.')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''   // allow re-picking the same file
    }
  }

  return (
    <>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
      {value ? (
        <div className="relative overflow-hidden rounded-md border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Cover preview" className="aspect-[16/9] w-full object-cover" />
          <div className="absolute right-2 top-2 flex gap-1.5">
            <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
              className="rounded bg-black/60 px-2 py-1 text-[11px] font-medium text-white backdrop-blur transition-colors hover:bg-black/75">
              {uploading ? 'Uploading…' : 'Replace'}
            </button>
            <button type="button" onClick={() => onChange('')} aria-label="Remove cover image"
              className="rounded bg-black/60 p-1 text-white backdrop-blur transition-colors hover:bg-black/75">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={() => !uploading && inputRef.current?.click()}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click() } }}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) }}
          className={cn(
            'flex w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-md border border-dashed py-9 text-center transition-colors',
            dragOver ? 'border-accent bg-accent/5' : 'border-border hover:border-ring',
          )}
        >
          {uploading ? (
            <><Loader2 className="h-5 w-5 animate-spin text-muted" /><span className="text-xs text-muted">Uploading…</span></>
          ) : (
            <>
              <Upload className="h-5 w-5 text-muted" />
              <span className="text-sm font-medium text-on-background">Upload cover image</span>
              <span className="text-xs text-muted">Click to choose, or drag a photo here · JPG, PNG or WebP</span>
            </>
          )}
        </div>
      )}
    </>
  )
}

// ─── Editor state ──────────────────────────────────────────────────────────────

interface EditorState {
  id?:                 string
  title:               string
  slug:                string
  description:         string
  body:                string
  coverImage:          string
  category:            string
  tags:                string
  featured:            boolean
  relatedProductSlugs: string[]
  status:              'DRAFT' | 'PUBLISHED'
}

const EMPTY: EditorState = {
  title: '', slug: '', description: '', body: '', coverImage: '', category: '',
  tags: '', featured: false, relatedProductSlugs: [], status: 'DRAFT',
}

export default function AdminBlogPage() {
  const [posts, setPosts]     = useState<AdminBlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [editor, setEditor]   = useState<EditorState | null>(null)
  const [saving, setSaving]   = useState(false)
  const [slugTouched, setSlugTouched] = useState(false)
  const bodyRef = useRef<HTMLTextAreaElement | null>(null)

  const load = useCallback(async () => {
    try { setPosts(await blogApi.adminList()) }
    catch (err) { toast.error(err instanceof ApiError ? err.message : 'Failed to load posts') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  const openNew = () => { setSlugTouched(false); setEditor({ ...EMPTY }) }
  const openPost = (p: AdminBlogPost) => {
    setSlugTouched(true)
    setEditor({
      id: p.id, title: p.title, slug: p.slug, description: p.description, body: p.body,
      coverImage: p.coverImage ?? '', category: p.category ?? '', tags: p.tags.join(', '),
      featured: p.featured, relatedProductSlugs: p.relatedProductSlugs ?? [], status: p.status,
    })
  }

  const applyTemplate = (t: Template) => {
    if (!editor) return
    if (editor.body.trim() && !window.confirm('Replace the current body with this template?')) return
    setEditor({ ...editor, body: t.body, category: editor.category || t.category })
  }

  const save = async (statusOverride?: 'DRAFT' | 'PUBLISHED') => {
    if (!editor) return
    const payload = {
      title:               editor.title.trim(),
      slug:                editor.slug.trim(),
      description:         editor.description.trim(),
      body:                editor.body,
      coverImage:          editor.coverImage.trim() || null,
      category:            editor.category || null,
      tags:                editor.tags.split(',').map((t) => t.trim()).filter(Boolean),
      featured:            editor.featured,
      relatedProductSlugs: editor.relatedProductSlugs,
      status:              statusOverride ?? editor.status,
    }
    if (payload.title.length < 3 || payload.description.length < 10 || payload.body.length < 50) {
      toast.error('Add a title, a description (10+ chars) and a body (50+ chars) before saving.')
      return
    }
    setSaving(true)
    try {
      if (editor.id) await blogApi.update(editor.id, payload)
      else           await blogApi.create(payload)
      toast.success(payload.status === 'PUBLISHED' ? 'Published to /blog' : 'Saved as draft')
      setEditor(null)
      await load()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Save failed')
    } finally { setSaving(false) }
  }

  const del = async (p: AdminBlogPost) => {
    if (!window.confirm(`Delete "${p.title}"? This cannot be undone.`)) return
    try {
      await blogApi.remove(p.id)
      toast.success('Post deleted')
      if (editor?.id === p.id) setEditor(null)
      await load()
    } catch (err) { toast.error(err instanceof ApiError ? err.message : 'Delete failed') }
  }

  const togglePublish = async (p: AdminBlogPost) => {
    try {
      const next = p.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED'
      await blogApi.update(p.id, { status: next })
      toast.success(next === 'PUBLISHED' ? `Published — live at /blog/${p.slug}` : 'Unpublished (back to draft)')
      await load()
    } catch (err) { toast.error(err instanceof ApiError ? err.message : 'Update failed') }
  }

  const descLen = editor?.description.length ?? 0

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-xl font-semibold text-on-background">Style Journal</h1>
          <p className="mt-1 text-xs text-muted">
            Posts appear at <span className="font-mono">/blog</span>. Drafts stay private until you publish.
          </p>
        </div>
        <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> New Post</Button>
      </div>

      {editor ? (
        // ── Two-column editor: form on the left, live preview on the right ──
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_minmax(320px,420px)]">
          {/* Left: form */}
          <div className="space-y-5">
            {/* Templates */}
            <div className="rounded-lg border border-border bg-surface p-4">
              <div className="mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4 text-accent" />
                <h2 className="text-sm font-semibold text-on-background">Start from a template</h2>
              </div>
              <p className="mb-3 text-xs text-muted">Pick a proven structure and fill in the blanks — no writing from scratch.</p>
              <div className="flex flex-wrap gap-2">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.label}
                    type="button"
                    onClick={() => applyTemplate(t)}
                    title={t.description}
                    className="rounded-md border border-border bg-input px-3 py-1.5 text-xs font-medium text-on-background transition-colors hover:border-accent hover:text-accent"
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Title + slug */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Title</Label>
                <Input
                  value={editor.title}
                  onChange={(e) => setEditor({ ...editor, title: e.target.value, slug: slugTouched ? editor.slug : toSlug(e.target.value) })}
                  placeholder="How to style an Anarkali for a wedding"
                />
              </div>
              <div className="space-y-1.5">
                <Label>URL Slug <span className="text-xs font-normal text-muted">(/blog/…)</span></Label>
                <Input
                  value={editor.slug}
                  onChange={(e) => { setSlugTouched(true); setEditor({ ...editor, slug: e.target.value }) }}
                  placeholder="style-anarkali-wedding"
                  className="font-mono"
                />
              </div>
            </div>

            {/* Category + featured */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <select
                  value={editor.category}
                  onChange={(e) => setEditor({ ...editor, category: e.target.value })}
                  className="flex h-9 w-full rounded-md border border-border bg-input px-3 py-1 text-sm text-on-background focus:outline-hidden focus:ring-1 focus:ring-ring"
                >
                  <option value="">Uncategorised</option>
                  {BLOG_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex flex-col justify-end space-y-1.5 pb-0.5">
                <Label htmlFor="featured">Feature on the journal</Label>
                <div className="flex items-center gap-3">
                  <Switch id="featured" checked={editor.featured} onCheckedChange={(v: boolean) => setEditor({ ...editor, featured: v })} />
                  <span className="flex items-center gap-1 text-sm text-muted">
                    <Star className={cn('h-3.5 w-3.5', editor.featured && 'fill-accent text-accent')} />
                    {editor.featured ? 'Shown as the hero story' : 'Normal placement'}
                  </span>
                </div>
              </div>
            </div>

            {/* Meta description */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Meta description <span className="text-xs font-normal text-muted">(the Google snippet + listing excerpt)</span></Label>
                <span className={cn('text-xs', descLen > 160 ? 'text-destructive' : descLen >= 120 ? 'text-success' : 'text-muted')}>{descLen}/160</span>
              </div>
              <Textarea rows={2} value={editor.description} onChange={(e) => setEditor({ ...editor, description: e.target.value })} placeholder="One or two compelling lines with the main search phrase." />
            </div>

            {/* Cover image — upload from device */}
            <div className="space-y-1.5">
              <Label>Cover image <span className="text-xs font-normal text-muted">(shown on the journal + used as the social share preview)</span></Label>
              <CoverImageUploader value={editor.coverImage} onChange={(url) => setEditor({ ...editor, coverImage: url })} />
            </div>

            {/* Tags */}
            <div className="space-y-1.5">
              <Label>Tags <span className="text-xs font-normal text-muted">(comma separated)</span></Label>
              <Input value={editor.tags} onChange={(e) => setEditor({ ...editor, tags: e.target.value })} placeholder="plus size, anarkali, wedding guest" />
            </div>

            {/* Body with toolbar */}
            <div className="space-y-2">
              <Label>Body</Label>
              <FormatToolbar textareaRef={bodyRef} value={editor.body} onChange={(next) => setEditor({ ...editor, body: next })} />
              <Textarea
                ref={bodyRef}
                rows={18}
                value={editor.body}
                onChange={(e) => setEditor({ ...editor, body: e.target.value })}
                className="font-mono text-xs leading-relaxed"
                placeholder="Select text and use the buttons above to format it — or start from a template."
              />
            </div>

            {/* Shop this Story */}
            <div className="space-y-1.5">
              <Label>Shop this Story <span className="text-xs font-normal text-muted">(products shown under the post — the conversion bridge)</span></Label>
              <ProductPicker selected={editor.relatedProductSlugs} onChange={(slugs) => setEditor({ ...editor, relatedProductSlugs: slugs })} />
            </div>

            {/* Actions */}
            <div className="sticky bottom-0 -mx-1 flex flex-wrap items-center gap-3 border-t border-border bg-background/95 px-1 py-3 backdrop-blur">
              <Button onClick={() => save()} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
              </Button>
              {editor.status !== 'PUBLISHED' && (
                <Button variant="outline" onClick={() => save('PUBLISHED')} disabled={saving}>Save &amp; Publish</Button>
              )}
              <Button variant="ghost" onClick={() => setEditor(null)} disabled={saving}>Cancel</Button>
            </div>
          </div>

          {/* Right: live preview */}
          <div className="lg:sticky lg:top-6 lg:h-fit">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted">
              <Eye className="h-3.5 w-3.5" /> Live preview
            </div>
            <div className="overflow-hidden rounded-lg border border-border bg-white">
              {editor.coverImage
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={editor.coverImage} alt="" className="aspect-[16/10] w-full object-cover" />
                : <div className="flex aspect-[16/10] w-full items-center justify-center bg-neutral-100 text-xs text-neutral-400">Cover image preview</div>}
              <div className="p-5">
                {editor.category && <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8b6b47]">{editor.category}</p>}
                <h1 className="font-display text-2xl leading-tight text-neutral-900">{editor.title || 'Your title appears here'}</h1>
                <p className="mt-2 text-xs text-neutral-500">{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                <div
                  className="blog-body mt-4 text-sm text-neutral-700"
                  style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}
                  dangerouslySetInnerHTML={{ __html: editor.body || '<p class="text-neutral-400">Body preview — start from a template or write above.</p>' }}
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        // ── Post list ──
        loading ? (
          <div className="flex items-center gap-2 py-10 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin" /> Loading posts…</div>
        ) : posts.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border py-14 text-center">
            <p className="text-sm text-muted">No posts yet.</p>
            <p className="mt-1 text-xs text-muted">Click <span className="font-medium text-on-background">New Post</span>, pick a template, and you&apos;re writing in seconds.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {posts.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3">
                <div className="min-w-0 flex-1">
                  <button type="button" onClick={() => openPost(p)} className="flex max-w-full items-center gap-2 text-left text-sm font-medium text-on-background hover:underline">
                    {p.featured && <Star className="h-3.5 w-3.5 shrink-0 fill-accent text-accent" />}
                    <span className="truncate">{p.title}</span>
                  </button>
                  <p className="mt-0.5 truncate font-mono text-xs text-muted">/blog/{p.slug} · {new Date(p.createdAt).toLocaleDateString('en-IN')}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {p.category && <Badge variant="secondary" className="hidden sm:inline-flex">{p.category}</Badge>}
                  <Badge variant="secondary" className={cn(p.status === 'PUBLISHED' ? 'bg-success/15 text-success' : 'text-muted')}>
                    {p.status === 'PUBLISHED' ? 'Published' : 'Draft'}
                  </Badge>
                  <Button variant="outline" size="sm" onClick={() => togglePublish(p)}>{p.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}</Button>
                  {p.status === 'PUBLISHED' && (
                    <a href={`/blog/${p.slug}`} target="_blank" rel="noreferrer" className="rounded p-1.5 text-muted transition-colors hover:text-on-background" title="View on site">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                  <button type="button" onClick={() => del(p)} className="rounded p-1.5 text-muted transition-colors hover:text-destructive" title="Delete">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  )
}
