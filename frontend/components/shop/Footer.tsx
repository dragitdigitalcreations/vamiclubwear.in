import Link from 'next/link'
import { Instagram, Facebook, Youtube } from 'lucide-react'

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
  return (
    <footer className="border-t border-border bg-surface mt-24">
      <div className="mx-auto max-w-7xl px-4 py-16 md:px-8">

        <div className="grid grid-cols-1 gap-12 md:grid-cols-4">

          {/* Brand */}
          <div className="md:col-span-1">
            <Link
              href="/"
              className="font-display text-2xl font-bold tracking-[0.2em] text-on-background uppercase"
            >
              Vami
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-muted max-w-xs">
              Premium Indo-Western fashion for the modern woman. Crafted with intention, worn with grace.
            </p>
            <div className="mt-6 flex gap-4">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="text-muted transition-colors hover:text-on-background"
              >
                <Instagram className="h-4 w-4" />
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="text-muted transition-colors hover:text-on-background"
              >
                <Facebook className="h-4 w-4" />
              </a>
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="YouTube"
                className="text-muted transition-colors hover:text-on-background"
              >
                <Youtube className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Shop */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-on-background">
              Shop
            </h3>
            <ul className="mt-4 space-y-3">
              {SHOP_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted transition-colors hover:text-on-background"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Info */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-on-background">
              Information
            </h3>
            <ul className="mt-4 space-y-3">
              {INFO_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted transition-colors hover:text-on-background"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-on-background">
              Contact
            </h3>
            <address className="mt-4 not-italic space-y-2 text-sm text-muted">
              <p>Vami Clubwear</p>
              <p>Manjeri, Kerala</p>
              <p>India — 676121</p>
              <a
                href="mailto:hello@vami.in"
                className="block mt-3 transition-colors hover:text-on-background"
              >
                hello@vami.in
              </a>
            </address>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 sm:flex-row">
          <p className="text-xs text-muted">
            &copy; {new Date().getFullYear()} Vami Clubwear. All rights reserved.
          </p>
          <p className="text-xs text-muted">
            Crafted in Kerala
          </p>
        </div>
      </div>
    </footer>
  )
}
