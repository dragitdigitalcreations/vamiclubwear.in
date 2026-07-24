'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Plus, Pencil, Trash2, Eye, Search } from 'lucide-react'
import { AdminHeader } from '@/components/admin/AdminHeader'
import { RBACGuard } from '@/components/admin/RBACGuard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { productsApi } from '@/lib/api'
import { toast } from '@/stores/toastStore'
import type { ProductListItem } from '@/types/admin'

// The backend list endpoint caps `limit` at 100. That comfortably covers the
// current catalogue; if it ever grows past this we switch to server paging.
const PAGE_LIMIT = 100

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductListItem[]>([])
  const [total,    setTotal]    = useState(0)
  const [loading,  setLoading]  = useState(true)
  const [query,    setQuery]    = useState('')

  function load() {
    setLoading(true)
    productsApi.list({ limit: PAGE_LIMIT })
      .then((r) => {
        const mapped = (r.data as any[]).map((p: any): ProductListItem => ({
          id:              p.id,
          name:            p.name,
          slug:            p.slug,
          basePrice:       Number(p.basePrice),
          category:        p.category?.name ?? p.category ?? '—',
          variantCount:    Array.isArray(p.variants) ? p.variants.length : (p.variantCount ?? 0),
          isActive:        p.isActive,
          isFeatured:      p.isFeatured,
          createdAt:       p.createdAt,
          barcode:         p.barcode ?? null,
          perColorBarcode: !!p.perColorBarcode,
          colorBarcodes:   Array.isArray(p.colorBarcodes) ? p.colorBarcodes : [],
        }))
        setProducts(mapped)
        setTotal(r.total ?? mapped.length)
      })
      .catch(() => toast.error('Failed to load products'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  // Client-side filter across name, slug and every scan code (single + per-colour)
  // so the operator can paste the barcode printed on the label and jump straight
  // to the product.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return products
    return products.filter((p) => {
      if (p.name.toLowerCase().includes(q)) return true
      if (p.slug.toLowerCase().includes(q)) return true
      if (p.barcode && p.barcode.toLowerCase().includes(q)) return true
      return p.colorBarcodes.some(
        (c) => c.barcode.toLowerCase().includes(q) || c.color.toLowerCase().includes(q),
      )
    })
  }, [products, query])

  async function handleDelete(p: ProductListItem) {
    if (!confirm(`Delete "${p.name}"? Products with order history are archived (hidden) to preserve sales records.`)) return
    try {
      const res: any = await productsApi.delete(p.id)
      setProducts((prev) => prev.filter((x) => x.id !== p.id))
      toast.success(res?.soft ? `"${p.name}" archived (had orders)` : `"${p.name}" deleted`)
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Failed to delete product'
      toast.error(msg)
    }
  }

  return (
    <RBACGuard section="products">
      <AdminHeader title="Products" subtitle={`${total} total`} />

      <div className="p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, slug or scan code…"
              className="pl-9"
            />
          </div>
          <Button asChild className="gap-2">
            <Link href="/admin/products/new">
              <Plus className="h-4 w-4" />
              Add Product
            </Link>
          </Button>
        </div>

        {total > PAGE_LIMIT && (
          <p className="rounded-md border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-400">
            Showing the first {PAGE_LIMIT} of {total} products. Search covers only the loaded set for now.
          </p>
        )}

        <div className="rounded-lg border border-border bg-surface">
          {loading ? (
            <div className="space-y-2 p-4">
              {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-12 rounded" />)}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Base Price</TableHead>
                  <TableHead className="text-center">Variants</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-on-background">{p.name}</p>
                        <p className="font-mono text-xs text-muted">{p.slug}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {p.perColorBarcode ? (
                        p.colorBarcodes.length > 0 ? (
                          <div className="space-y-0.5">
                            {p.colorBarcodes.map((c) => (
                              <p key={c.color} className="font-mono text-xs text-on-background whitespace-nowrap">
                                <span className="text-muted">{c.color}:</span> {c.barcode}
                              </p>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted">per-colour (none set)</span>
                        )
                      ) : p.barcode ? (
                        <span className="font-mono text-xs text-on-background">{p.barcode}</span>
                      ) : (
                        <span className="text-xs text-muted">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{p.category}</TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      ₹{p.basePrice.toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{p.variantCount}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${p.isActive ? 'bg-success' : 'bg-muted'}`} />
                        <span className="text-xs text-muted">{p.isActive ? 'Active' : 'Inactive'}</span>
                        {p.isFeatured && <Badge className="text-xs">Featured</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/products/${p.slug}`} target="_blank" title="View on storefront">
                            <Eye className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/admin/products/${p.id}/edit`} title="Edit product">
                            <Pencil className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Delete product"
                          onClick={() => handleDelete(p)}
                          className="text-muted hover:text-red-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-sm text-muted">
                      {query ? `No products match “${query}”.` : 'No products yet.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </RBACGuard>
  )
}
