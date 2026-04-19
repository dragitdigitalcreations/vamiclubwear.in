'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { Barcode, X, ArrowRight, AlertTriangle } from 'lucide-react'
import { productsApi } from '@/lib/api'

interface BarcodeVariant {
  id:     string
  sku:    string
  size:   string | null
  color:  string | null
  fabric: string | null
  style:  string | null
  price:  number
  inventory: Array<{ quantity: number; reserved: number }>
}

interface BarcodeProduct {
  id:       string
  name:     string
  slug:     string
  variants: BarcodeVariant[]
}

export default function BarcodeLookupPage() {
  const searchParams = useSearchParams()
  const router       = useRouter()
  const inputRef     = useRef<HTMLInputElement>(null)

  const initial = searchParams.get('code') ?? ''
  const [code,    setCode]    = useState(initial)
  const [loading, setLoading] = useState(false)
  const [product, setProduct] = useState<BarcodeProduct | null>(null)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    inputRef.current?.focus()
    if (initial) lookup(initial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function lookup(barcode: string) {
    const trimmed = barcode.trim()
    if (!trimmed) return
    setLoading(true)
    setError(null)
    setProduct(null)
    try {
      const result = await productsApi.getProductByBarcode(trimmed) as any
      setProduct(result)
      const params = new URLSearchParams(searchParams.toString())
      params.set('code', trimmed)
      router.replace(`/barcode?${params}`)
    } catch (e: any) {
      setError(e?.message ?? 'No product found for this barcode.')
    } finally {
      setLoading(false)
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    lookup(code)
  }

  const availability = (v: BarcodeVariant) =>
    Math.max(0, (v.inventory[0]?.quantity ?? 0) - (v.inventory[0]?.reserved ?? 0))

  return (
    <div className="pt-24">
      <div className="border-b border-border">
        <div className="mx-auto w-full px-4 sm:px-6 md:px-8 lg:px-10">
          <div className="py-10">
            <p className="mb-1 t-micro">Vami</p>
            <h1 className="t-h1">Find by Barcode</h1>
            <p className="mt-2 max-w-xl text-sm text-muted">
              Have the physical piece in hand? Scan or type its barcode below to pull up
              the exact product online.
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-2xl px-4 sm:px-6 md:px-8 lg:px-10 py-10">
        <form onSubmit={onSubmit} className="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-3">
          <Barcode className="h-5 w-5 shrink-0 text-muted" />
          <input
            ref={inputRef}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Scan or type barcode…"
            className="flex-1 bg-transparent text-base text-on-background placeholder:text-muted outline-none"
            autoComplete="off"
            spellCheck={false}
            inputMode="text"
          />
          {code && (
            <button
              type="button"
              onClick={() => { setCode(''); setProduct(null); setError(null); inputRef.current?.focus() }}
              className="text-muted hover:text-on-background"
              aria-label="Clear"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="ml-1 rounded-md bg-primary px-4 py-2 text-xs font-medium uppercase tracking-widest text-white disabled:opacity-40"
          >
            {loading ? 'Looking up…' : 'Find'}
          </button>
        </form>

        {error && (
          <div className="mt-6 flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/8 px-4 py-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
            <div className="text-sm text-red-400">
              {error}
            </div>
          </div>
        )}

        {product && (
          <div className="mt-8 rounded-xl border border-border bg-surface p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted">Match found</p>
            <h2 className="mt-1 font-display text-2xl font-semibold text-on-background">{product.name}</h2>

            <p className="mt-3 text-xs uppercase tracking-widest text-muted">
              {product.variants.length} variant{product.variants.length !== 1 ? 's' : ''}
            </p>
            <ul className="mt-2 divide-y divide-border border-t border-b border-border">
              {product.variants.map((v) => {
                const avail = availability(v)
                const attrs = [v.size, v.color, v.fabric, v.style].filter(Boolean).join(' · ')
                return (
                  <li key={v.id} className="flex items-center justify-between py-3">
                    <div className="min-w-0">
                      <p className="text-sm text-on-background">{attrs || v.sku}</p>
                      <p className="mt-0.5 font-mono text-[10px] text-muted">{v.sku}</p>
                    </div>
                    <div className="ml-3 shrink-0 text-right">
                      <p className="text-sm font-semibold text-on-background">
                        ₹{Number(v.price).toLocaleString('en-IN')}
                      </p>
                      <p className={`mt-0.5 text-[10px] font-medium uppercase tracking-widest ${avail > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {avail > 0 ? `${avail} in stock` : 'Out of stock'}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>

            <Link
              href={`/products/${product.slug}`}
              className="mt-6 inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-xs font-medium uppercase tracking-widest text-white"
            >
              View product <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}

        {!product && !error && !loading && (
          <p className="mt-10 text-center text-xs text-muted/70">
            Tip: your scanner will submit automatically on Enter.
          </p>
        )}
      </div>
    </div>
  )
}
