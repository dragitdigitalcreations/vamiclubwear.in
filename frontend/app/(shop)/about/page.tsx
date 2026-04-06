import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export const metadata = { title: 'About Us — Vami Clubwear' }

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 pt-32 pb-24 md:px-8">

      <div className="mb-12">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-primary-light mb-4">Our Story</p>
        <h1 className="font-display text-4xl font-bold text-on-background md:text-5xl leading-tight">
          Where Heritage<br />Meets Modernity
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-16 md:grid-cols-2">
        <div className="space-y-6 text-sm leading-relaxed text-muted">
          <p>
            Vami Clubwear was born in Manjeri, Kerala — a city with a rich tradition of fine textiles
            and exquisite craftsmanship. We set out with a single vision: to create Indo-Western
            fashion that honours the grace of traditional wear while embracing the clean lines
            of contemporary design.
          </p>
          <p>
            Every piece in our collection is thoughtfully designed and carefully crafted. We source
            premium fabrics — Pure Silk, Georgette, Chiffon, Velvet — and work with skilled artisans
            who bring decades of expertise to each garment.
          </p>
          <p>
            Whether you're dressing for a festive occasion, a wedding, or simply want to feel
            exceptional every day, Vami Clubwear has something made for you.
          </p>
        </div>

        <div className="space-y-8">
          {[
            { num: '500+', label: 'Pieces Crafted' },
            { num: '3',    label: 'Signature Collections' },
            { num: '100%', label: 'Premium Fabrics' },
            { num: '2+',   label: 'Years of Excellence' },
          ].map(({ num, label }) => (
            <div key={label} className="border-l-2 border-primary pl-6">
              <p className="font-display text-3xl font-bold text-on-background">{num}</p>
              <p className="mt-1 text-xs font-medium uppercase tracking-widest text-muted">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-20 grid grid-cols-1 gap-6 sm:grid-cols-3">
        {[
          { title: 'Heritage Fabrics',    body: 'We use only premium Indian textiles — Pure Silk, Georgette, Chiffon, Velvet, and more — sourced from the finest weavers.' },
          { title: 'Artisan Craftsmanship', body: 'Each garment is crafted by skilled artisans in Manjeri, bringing decades of expertise in embroidery, draping, and tailoring.' },
          { title: 'Thoughtful Design',  body: 'Our designs bridge East and West — structured silhouettes meet traditional motifs, creating pieces that work for every modern woman.' },
        ].map(({ title, body }) => (
          <div key={title} className="border border-border bg-surface p-6">
            <h3 className="font-display text-sm font-semibold text-on-background mb-3">{title}</h3>
            <p className="text-xs leading-relaxed text-muted">{body}</p>
          </div>
        ))}
      </div>

      <div className="mt-16 flex flex-col sm:flex-row gap-4">
        <Link
          href="/products"
          className="inline-flex items-center justify-center gap-2 bg-primary px-8 py-3.5 text-xs font-semibold uppercase tracking-widest text-white transition-opacity hover:opacity-90"
        >
          Explore Collections
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
        <Link
          href="/contact"
          className="inline-flex items-center justify-center gap-2 border border-border px-8 py-3.5 text-xs font-semibold uppercase tracking-widest text-muted transition-colors hover:text-on-background hover:border-on-background"
        >
          Get in Touch
        </Link>
      </div>
    </div>
  )
}
