'use client'

import { useState, useRef, useCallback } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import { Upload, X, GripVertical, Star, Play, Image as ImageIcon, Loader2 } from 'lucide-react'
import { toast } from '@/stores/toastStore'

const ACCEPTED  = ['image/jpeg','image/png','image/webp','image/avif','video/mp4','video/webm']
const MAX_SIZE  = 50 * 1024 * 1024  // 50 MB

// Use the rewrite proxy in browser (same pattern as api.ts) — avoids CORS in dev and prod
function getApiBase() {
  return typeof window !== 'undefined'
    ? ''
    : (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001')
}

// Read JWT from Zustand persisted auth store
function getToken(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem('vami-auth')
    if (!stored) return null
    return JSON.parse(stored)?.state?.token ?? null
  } catch {
    return null
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MediaItem {
  id:        string       // temp local id
  url:       string       // Cloudinary URL after upload, or object URL before
  type:      'IMAGE' | 'VIDEO'
  altText:   string
  isPrimary: boolean
  sortOrder: number
  uploading: boolean
  error?:    string
}

interface MediaUploaderProps {
  value:    MediaItem[]
  onChange: (items: MediaItem[]) => void
}

function generateId() { return Math.random().toString(36).slice(2) }

// ─── Upload a single file to the backend /api/uploads endpoint ────────────────

async function uploadFile(file: File): Promise<{ url: string; type: 'IMAGE' | 'VIDEO' }> {
  const form = new FormData()
  form.append('files', file)

  const token = getToken()
  const res = await fetch(`${getApiBase()}/api/uploads`, {
    method:  'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body:    form,
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `Upload failed (${res.status})`)
  }

  const data: { uploads: Array<{ url: string; type: 'IMAGE' | 'VIDEO' }> } = await res.json()
  if (!data.uploads?.[0]) throw new Error('No upload result returned')
  return data.uploads[0]
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MediaUploader({ value, onChange }: MediaUploaderProps) {
  const inputRef   = useRef<HTMLInputElement>(null)
  const valueRef   = useRef<MediaItem[]>(value)
  valueRef.current = value   // keep ref in sync without re-render

  const [dragging, setDragging] = useState(false)

  const processFiles = useCallback(async (files: File[]) => {
    // Filter and validate
    const valid = files.filter((f) => {
      if (!ACCEPTED.includes(f.type)) {
        toast.error(`${f.name}: unsupported type`)
        return false
      }
      if (f.size > MAX_SIZE) {
        toast.error(`${f.name}: exceeds 50 MB`)
        return false
      }
      return true
    })
    if (!valid.length) return

    // Create placeholder items in "uploading" state
    const placeholders: MediaItem[] = valid.map((f, idx) => ({
      id:        generateId(),
      url:       URL.createObjectURL(f),  // preview while uploading
      type:      f.type.startsWith('video') ? 'VIDEO' : 'IMAGE',
      altText:   '',
      isPrimary: false,
      sortOrder: value.length + idx,
      uploading: true,
    }))

    // Merge into current list and set primary if none exists
    const merged = [...value, ...placeholders]
    const hasPrimary = merged.some((i) => i.isPrimary)
    if (!hasPrimary) {
      const firstImage = merged.find((i) => i.type === 'IMAGE')
      if (firstImage) firstImage.isPrimary = true
    }
    onChange([...merged])

    // Upload each file concurrently and update on completion
    await Promise.all(
      valid.map(async (file, idx) => {
        const placeholder = placeholders[idx]
        try {
          const result = await uploadFile(file)
          URL.revokeObjectURL(placeholder.url)
          onChange(
            valueRef.current.map((item) =>
              item.id === placeholder.id
                ? { ...item, url: result.url, type: result.type, uploading: false }
                : item
            )
          )
        } catch (err: any) {
          toast.error(`Failed to upload ${file.name}: ${err.message}`)
          onChange(
            valueRef.current.map((item) =>
              item.id === placeholder.id
                ? { ...item, uploading: false, error: err.message }
                : item
            )
          )
        }
      })
    )
  }, [value, onChange])

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) processFiles(Array.from(e.target.files))
    e.target.value = ''
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files.length) processFiles(Array.from(e.dataTransfer.files))
  }

  const remove = (id: string) => {
    const item = value.find((i) => i.id === id)
    if (item?.url.startsWith('blob:')) URL.revokeObjectURL(item.url)
    const remaining = value.filter((i) => i.id !== id)
    // Re-assign primary if removed item was primary
    if (item?.isPrimary && remaining.length > 0) {
      const firstImage = remaining.find((i) => i.type === 'IMAGE')
      if (firstImage) {
        onChange(remaining.map((i) => ({ ...i, isPrimary: i.id === firstImage.id })))
        return
      }
    }
    onChange(remaining)
  }

  const setPrimary = (id: string) => {
    onChange(value.map((i) => ({ ...i, isPrimary: i.id === id && i.type === 'IMAGE' })))
  }

  const updateAlt = (id: string, altText: string) => {
    onChange(value.map((i) => i.id === id ? { ...i, altText } : i))
  }

  const isUploading = value.some((i) => i.uploading)

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragEnter={(e) => { e.preventDefault(); setDragging(true) }}
        onDragOver={(e)  => { e.preventDefault(); setDragging(true) }}
        onDragLeave={()  => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded border-2 border-dashed py-10 transition-colors ${
          dragging
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-muted-foreground'
        }`}
      >
        <Upload className={`h-8 w-8 transition-colors ${dragging ? 'text-primary' : 'text-muted'}`} />
        <div className="text-center">
          <p className="text-sm font-medium text-on-background">
            {dragging ? 'Drop files here' : 'Drop files or click to upload'}
          </p>
          <p className="mt-1 text-xs text-muted">
            JPG, PNG, WebP, AVIF, MP4, WebM — max 50 MB each
          </p>
          {!process.env.NEXT_PUBLIC_API_URL && (
            <p className="mt-1 text-xs text-amber-400">
              Set NEXT_PUBLIC_API_URL to enable uploads
            </p>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED.join(',')}
          multiple
          className="hidden"
          onChange={onInputChange}
        />
      </div>

      {/* Upload progress indicator */}
      {isUploading && (
        <div className="flex items-center gap-2 text-xs text-muted">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Uploading to Cloudinary…
        </div>
      )}

      {/* Media list — drag to reorder */}
      {value.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-widest text-muted">
            Media ({value.length})
          </p>

          <Reorder.Group
            axis="y"
            values={value}
            onReorder={onChange}
            className="space-y-2"
          >
            <AnimatePresence initial={false}>
              {value.map((item) => (
                <Reorder.Item
                  key={item.id}
                  value={item}
                  className="cursor-grab active:cursor-grabbing"
                  dragListener={!item.uploading}
                >
                  <motion.div
                    layout
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className={`flex items-center gap-3 rounded border bg-surface-elevated p-3 ${
                      item.error ? 'border-red-500/50' : 'border-border'
                    }`}
                  >
                    <GripVertical className="h-4 w-4 flex-shrink-0 text-muted" />

                    {/* Thumbnail */}
                    <div className="relative h-14 w-12 flex-shrink-0 overflow-hidden rounded bg-surface">
                      {item.uploading ? (
                        <div className="flex h-full items-center justify-center">
                          <Loader2 className="h-4 w-4 animate-spin text-muted" />
                        </div>
                      ) : item.type === 'VIDEO' ? (
                        <div className="flex h-full items-center justify-center text-muted">
                          <Play className="h-5 w-5" />
                        </div>
                      ) : (
                        <Image
                          src={item.url}
                          alt={item.altText || 'Media'}
                          fill
                          className="object-cover"
                          sizes="48px"
                          unoptimized={item.url.startsWith('blob:')}
                        />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        {item.type === 'VIDEO'
                          ? <Play className="h-3 w-3 text-muted flex-shrink-0" />
                          : <ImageIcon className="h-3 w-3 text-muted flex-shrink-0" />
                        }
                        <span className="text-xs text-muted truncate">
                          {item.uploading ? 'Uploading…' : item.error ? `Error: ${item.error}` : item.url.split('/').pop()}
                        </span>
                      </div>
                      {!item.uploading && !item.error && (
                        <input
                          type="text"
                          value={item.altText}
                          onChange={(e) => updateAlt(item.id, e.target.value)}
                          placeholder="Alt text (optional)"
                          className="w-full border-b border-border bg-transparent text-xs text-on-background placeholder:text-muted focus:outline-none focus:border-on-background pb-0.5 transition-colors"
                        />
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {item.type === 'IMAGE' && !item.uploading && !item.error && (
                        <button
                          type="button"
                          onClick={() => setPrimary(item.id)}
                          title={item.isPrimary ? 'Primary image' : 'Set as primary'}
                          className={`transition-colors ${item.isPrimary ? 'text-amber-400' : 'text-muted hover:text-amber-400'}`}
                        >
                          <Star className="h-4 w-4" fill={item.isPrimary ? 'currentColor' : 'none'} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => remove(item.id)}
                        className="text-muted hover:text-red-400 transition-colors"
                        aria-label="Remove"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </motion.div>
                </Reorder.Item>
              ))}
            </AnimatePresence>
          </Reorder.Group>
        </div>
      )}
    </div>
  )
}
