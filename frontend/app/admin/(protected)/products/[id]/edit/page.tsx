'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { AdminHeader } from '@/components/admin/AdminHeader'
import { ProductUploadForm } from '@/components/admin/ProductUploadForm'
import { RBACGuard } from '@/components/admin/RBACGuard'
import { productsApi } from '@/lib/api'
import type { MediaItem } from '@/components/admin/MediaUploader'

function mapMediaItem(m: any, idx: number): MediaItem {
  return {
    id:        m.id ?? String(idx),
    url:       m.url,
    type:      m.type as 'IMAGE' | 'VIDEO',
    altText:   m.altText ?? '',
    isPrimary: m.isPrimary ?? idx === 0,
    sortOrder: m.sortOrder ?? idx,
    uploading: false,
  }
}

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>()

  const [initialData, setInitialData] = useState<any>(null)
  const [initialMedia, setInitialMedia] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    productsApi.get(id)
      .then((p: any) => {
        setInitialData({
          name:        p.name,
          slug:        p.slug,
          description: p.description ?? '',
          basePrice:   Number(p.basePrice),
          categoryId:  p.category?.id ?? p.categoryId ?? '',
          isFeatured:  p.isFeatured,
          isActive:    p.isActive,
          variants:    (p.variants ?? []).map((v: any) => ({
            sku:      v.sku,
            size:     v.size     ?? '',
            color:    v.color    ?? '',
            colorHex: v.colorHex ?? '',
            fabric:   v.fabric   ?? '',
            style:    v.style    ?? '',
            price:    Number(v.price),
          })),
        })
        setInitialMedia((p.media ?? []).map(mapMediaItem))
      })
      .catch(() => setError('Failed to load product. It may have been deleted.'))
      .finally(() => setLoading(false))
  }, [id])

  return (
    <RBACGuard section="products" redirectTo="/admin/dashboard">
      <AdminHeader
        title="Edit Product"
        subtitle={initialData?.name ?? '…'}
      />

      <div className="p-6 space-y-4">
        <Link
          href="/admin/products"
          className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-on-background transition-colors"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to Products
        </Link>

        {loading && (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="skeleton h-40 rounded-lg" />
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-400">
            {error}
          </div>
        )}

        {!loading && !error && initialData && (
          <ProductUploadForm
            productId={id}
            initialData={initialData}
            initialMedia={initialMedia}
          />
        )}
      </div>
    </RBACGuard>
  )
}
