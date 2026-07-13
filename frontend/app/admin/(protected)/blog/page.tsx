'use client'

// Admin Blog — manage Style Journal posts (/blog on the storefront).
// List + editor + "Generate with AI" (Claude drafts a post server-side; it
// lands here as a DRAFT for review before publishing).

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Plus, Sparkles, Trash2, ExternalLink } from 'lucide-react'
import { blogApi, AdminBlogPost, ApiError } from '@/lib/api'
import { toast } from '@/stores/toastStore'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

function toSlug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
}

interface EditorState {
  id?:         string
  title:       string
  slug:        string
  description: string
  body:        string
  coverImage:  string
  tags:        string
  status:      'DRAFT' | 'PUBLISHED'
}

const EMPTY: EditorState = {
  title: '', slug: '', description: '', body: '', coverImage: '', tags: '', status: 'DRAFT',
}

export default function AdminBlogPage() {
  const [posts, setPosts]           = useState<AdminBlogPost[]>([])
  const [loading, setLoading]       = useState(true)
  const [editor, setEditor]         = useState<EditorState | null>(null)
  const [saving, setSaving]         = useState(false)
  const [generating, setGenerating] = useState(false)
  const [topic, setTopic]           = useState('')
  const [slugTouched, setSlugTouched] = useState(false)

  const load = useCallback(async () => {
    try {
      setPosts(await blogApi.adminList())
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to load posts')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const openPost = (p: AdminBlogPost) => {
    setSlugTouched(true)
    setEditor({
      id: p.id, title: p.title, slug: p.slug, description: p.description,
      body: p.body, coverImage: p.coverImage ?? '', tags: p.tags.join(', '), status: p.status,
    })
  }

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const post = await blogApi.generate(topic.trim() || undefined)
      toast.success('Draft generated — review it, then publish')
      setTopic('')
      await load()
      openPost(post)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  const handleSave = async (statusOverride?: 'DRAFT' | 'PUBLISHED') => {
    if (!editor) return
    const payload = {
      title:       editor.title.trim(),
      slug:        editor.slug.trim(),
      description: editor.description.trim(),
      body:        editor.body,
      coverImage:  editor.coverImage.trim() || null,
      tags:        editor.tags.split(',').map((t) => t.trim()).filter(Boolean),
      status:      statusOverride ?? editor.status,
    }
    if (payload.title.length < 3 || payload.description.length < 10 || payload.body.length < 50) {
      toast.error('Title, description and body are required (body at least 50 characters)')
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
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (p: AdminBlogPost) => {
    if (!window.confirm(`Delete "${p.title}"? This cannot be undone.`)) return
    try {
      await blogApi.remove(p.id)
      toast.success('Post deleted')
      if (editor?.id === p.id) setEditor(null)
      await load()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Delete failed')
    }
  }

  const togglePublish = async (p: AdminBlogPost) => {
    try {
      const next = p.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED'
      await blogApi.update(p.id, { status: next })
      toast.success(next === 'PUBLISHED' ? `Published — live at /blog/${p.slug}` : 'Unpublished (back to draft)')
      await load()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Update failed')
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-xl font-semibold text-on-background">Blog — Style Journal</h1>
          <p className="mt-1 text-xs text-muted">
            Posts appear at <span className="font-mono">/blog</span>. Drafts are only visible here.
          </p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => { setSlugTouched(false); setEditor({ ...EMPTY }) }}>
          <Plus className="h-4 w-4" /> New Post
        </Button>
      </div>

      {/* AI generation */}
      <div className="rounded-lg border border-border bg-surface p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" />
          <h2 className="text-sm font-semibold text-on-background">Generate with AI</h2>
        </div>
        <p className="text-xs text-muted">
          Claude writes a full SEO draft (with links to your live products) and saves it below for review.
          Uses the backend&apos;s ANTHROPIC_API_KEY — pay-per-use, roughly a few rupees per draft.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            placeholder="Topic (optional — leave blank and it picks a strong evergreen one)"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            disabled={generating}
            className="flex-1"
          />
          <Button onClick={handleGenerate} disabled={generating} className="gap-2 min-w-[170px]">
            {generating
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Writing… (~1 min)</>
              : <><Sparkles className="h-4 w-4" /> Generate Draft</>}
          </Button>
        </div>
      </div>

      {/* Editor */}
      {editor && (
        <div className="rounded-lg border border-accent/40 bg-surface p-5 space-y-4">
          <h2 className="text-sm font-semibold text-on-background">
            {editor.id ? 'Edit post' : 'New post'}
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input
                value={editor.title}
                onChange={(e) => setEditor({
                  ...editor,
                  title: e.target.value,
                  slug: slugTouched ? editor.slug : toSlug(e.target.value),
                })}
                placeholder="How to style an Anarkali for a wedding"
              />
            </div>
            <div className="space-y-1.5">
              <Label>URL Slug <span className="text-muted text-xs font-normal">(/blog/…)</span></Label>
              <Input
                value={editor.slug}
                onChange={(e) => { setSlugTouched(true); setEditor({ ...editor, slug: e.target.value }) }}
                placeholder="style-anarkali-wedding"
                className="font-mono"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Meta description <span className="text-muted text-xs font-normal">(what Google shows — 140–160 chars)</span></Label>
            <Textarea
              rows={2}
              value={editor.description}
              onChange={(e) => setEditor({ ...editor, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Cover image URL <span className="text-muted text-xs font-normal">(optional)</span></Label>
              <Input
                value={editor.coverImage}
                onChange={(e) => setEditor({ ...editor, coverImage: e.target.value })}
                placeholder="https://…"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tags <span className="text-muted text-xs font-normal">(comma separated)</span></Label>
              <Input
                value={editor.tags}
                onChange={(e) => setEditor({ ...editor, tags: e.target.value })}
                placeholder="plus size, anarkali, wedding guest"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Body <span className="text-muted text-xs font-normal">(HTML — h2/h3/p/ul/li/a)</span></Label>
            <Textarea
              rows={16}
              value={editor.body}
              onChange={(e) => setEditor({ ...editor, body: e.target.value })}
              className="font-mono text-xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => handleSave()} disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save
            </Button>
            {editor.status !== 'PUBLISHED' && (
              <Button variant="outline" onClick={() => handleSave('PUBLISHED')} disabled={saving}>
                Save &amp; Publish
              </Button>
            )}
            <Button variant="ghost" onClick={() => setEditor(null)} disabled={saving}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <Separator />

      {/* Post list */}
      {loading ? (
        <div className="flex items-center gap-2 py-10 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading posts…
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-12 text-center">
          <p className="text-sm text-muted">No posts yet.</p>
          <p className="mt-1 text-xs text-muted">Generate a draft with AI above, or write one with New Post.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {posts.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => openPost(p)}
                  className="block max-w-full truncate text-left text-sm font-medium text-on-background hover:underline"
                >
                  {p.title}
                </button>
                <p className="mt-0.5 text-xs text-muted font-mono truncate">
                  /blog/{p.slug} · {new Date(p.createdAt).toLocaleDateString('en-IN')}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {p.aiGenerated && <Badge variant="secondary" className="gap-1"><Sparkles className="h-3 w-3" /> AI</Badge>}
                <Badge
                  variant="secondary"
                  className={cn(p.status === 'PUBLISHED' ? 'bg-success/15 text-success' : 'text-muted')}
                >
                  {p.status === 'PUBLISHED' ? 'Published' : 'Draft'}
                </Badge>
                <Button variant="outline" size="sm" onClick={() => togglePublish(p)}>
                  {p.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
                </Button>
                {p.status === 'PUBLISHED' && (
                  <a
                    href={`/blog/${p.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded p-1.5 text-muted hover:text-on-background transition-colors"
                    title="View on site"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => handleDelete(p)}
                  className="rounded p-1.5 text-muted hover:text-destructive transition-colors"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
