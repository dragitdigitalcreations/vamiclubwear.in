'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { AdminHeader } from '@/components/admin/AdminHeader'
import { RBACGuard } from '@/components/admin/RBACGuard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { productsApi } from '@/lib/api'
import { toast } from '@/stores/toastStore'
import type { ProductListItem } from '@/types/admin'

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductListItem[]>([])
  const [loading,  setLoading]  = useState(true)

  function load() {
    setLoading(true)
    productsApi.list()
      .then((r) => {
        const mapped = (r.data as any[]).map((p: any): ProductListItem => ({
          id:           p.id,
          name:         p.name,
          slug:         p.slug,
          basePrice:    Number(p.basePrice),
          category:     p.category?.name ?? p.category ?? '—',
          variantCount: Array.isArray(p.variants) ? p.variants.length : (p.variantCount ?? 0),
          isActive:     p.isActive,
          isFeatured:   p.isFeatured,
          createdAt:    p.createdAt,
        }))
        setProducts(mapped)
      })
      .catch(() => toast.error('Failed to load products'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  async function handleDelete(p: ProductListItem) {
    if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return
    try {
      await productsApi.delete(p.id)
      setProducts((prev) => prev.filter((x) => x.id !== p.id))
      toast.success(`"${p.name}" deleted`)
    } catch {
      toast.error('Failed to delete product')
    }
  }

  return (
    <RBACGuard section="products">
      <AdminHeader title="Products" subtitle={`${products.length} total`} />

      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted">Manage your catalogue and variant SKUs</p>
          <Button asChild className="gap-2">
            <Link href="/admin/products/new">
              <Plus className="h-4 w-4" />
              Add Product
            </Link>
          </Button>
        </div>

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
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Base Price</TableHead>
                  <TableHead className="text-center">Variants</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-on-background">{p.name}</p>
                        <p className="font-mono text-xs text-muted">{p.slug}</p>
                      </div>
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
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </RBACGuard>
  )
}
