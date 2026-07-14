import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Product, getPrimaryImage } from '@/types/product'
import { cloudinaryUrl } from '@/lib/cloudinary'

function displayPrice(p: Product): number {
  const active = p.variants?.filter((v) => v.isActive) ?? []
  const min = active.length ? Math.min(...active.map((v) => Number(v.price))) : Number(p.basePrice)
  return min
}

// The content→commerce bridge: products the operator tied to the post, shown
// right after the story while intent is high. Server component (no client JS).
export function ShopThisStory({ products }: { products: Product[] }) {
  if (products.length === 0) return null

  return (
    <section className="mt-16 border-t border-border pt-10">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand">Shop this Story</p>
          <h2 className="mt-1 font-display text-2xl text-on-background">Get the look</h2>
        </div>
        <Link href="/products" className="hidden items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-on-background hover:text-brand sm:inline-flex">
          View all <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((p) => {
          const raw = getPrimaryImage(p)
          const img = raw ? cloudinaryUrl(raw, { w: 500 }) : null
          return (
            <Link key={p.id} href={`/products/${p.slug}`} className="group block">
              <div className="relative aspect-4/5 overflow-hidden rounded-xs bg-surface-elevated">
                {img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={img} alt={p.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]" />
                ) : (
                  <div className="flex h-full items-center justify-center"><span className="font-display text-2xl text-muted/30">Vami</span></div>
                )}
              </div>
              <h3 className="mt-2.5 line-clamp-1 text-sm font-medium text-on-background transition-colors group-hover:text-brand-dark">{p.name}</h3>
              <p className="mt-0.5 text-sm font-semibold text-on-background">₹{displayPrice(p).toLocaleString('en-IN')}</p>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
