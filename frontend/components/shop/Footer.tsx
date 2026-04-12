import Link from 'next/link'
import { Instagram, Facebook, Youtube } from 'lucide-react'
import { VamiLogo } from '@/components/shop/VamiLogo'

const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '919XXXXXXXXX'
const WHATSAPP_MSG    = 'Hi Vami Clubwear! I have a query.'

const SHOP_LINKS = [
  { href: '/products',                 label: 'All Collections' },
  { href: '/products?category=fusion', label: 'Fusion Wear' },
  { href: '/products?category=bridal', label: 'Bridal' },
  { href: '/products?category=modest', label: 'Modest Fashion' },
]

const INFO_LINKS = [
  { href: '/about',    label: 'About Us' },
  { href: '/contact',  label: 'Contact' },
  { href: '/shipping', label: 'Shipping & Returns' },
  { href: '/sizing',   label: 'Size Guide' },
]

export function Footer() {
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MSG)}`

  return (
    <footer className="border-t border-border bg-surface mt-24">
      <div className="mx-auto max-w-7xl px-4 py-16 md:px-8">

        <div className="grid grid-cols-1 gap-12 md:grid-cols-4">

          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/" aria-label="Vami Clubwear — Home">
              <VamiLogo height={60} />
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-muted max-w-xs">
              Premium Indo-Western fashion for the modern woman. Crafted with intention, worn with grace.
            </p>
            <div className="mt-6 flex gap-4">
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram"
                className="text-muted transition-colors hover:text-on-background">
                <Instagram className="h-4 w-4" />
              </a>
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook"
                className="text-muted transition-colors hover:text-on-background">
                <Facebook className="h-4 w-4" />
              </a>
              <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" aria-label="YouTube"
                className="text-muted transition-colors hover:text-on-background">
                <Youtube className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Shop */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-on-background">Shop</h3>
            <ul className="mt-4 space-y-3">
              {SHOP_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-muted transition-colors hover:text-on-background">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Information */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-on-background">Information</h3>
            <ul className="mt-4 space-y-3">
              {INFO_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-muted transition-colors hover:text-on-background">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact + WhatsApp */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-on-background">Contact</h3>
            <address className="mt-4 not-italic space-y-2 text-sm text-muted">
              <p>Vami Clubwear</p>
              <p>Manjeri, Kerala</p>
              <p>India — 676121</p>
              <a href="mailto:vamiclubwear@gmail.com" className="block mt-1 transition-colors hover:text-on-background">
                vamiclubwear@gmail.com
              </a>
            </address>

            {/* WhatsApp CTA */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 flex items-center gap-2.5 w-full rounded bg-[#25D366]/10 border border-[#25D366]/25 px-4 py-3 transition-colors hover:bg-[#25D366]/20 group"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#25D366]">
                <svg viewBox="0 0 24 24" fill="white" className="h-4 w-4">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </span>
              <div>
                <p className="text-xs font-semibold text-[#25D366]">Chat on WhatsApp</p>
                <p className="text-[11px] text-muted group-hover:text-muted/80">We reply within minutes</p>
              </div>
            </a>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 sm:flex-row">
          <p className="text-xs text-muted">&copy; {new Date().getFullYear()} Vami Clubwear. All rights reserved.</p>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">Crafted by Dragit</p>
        </div>
      </div>
    </footer>
  )
}
