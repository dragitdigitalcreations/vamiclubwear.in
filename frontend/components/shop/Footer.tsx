import Link from 'next/link'
import { MessageCircle } from 'lucide-react'
import { VamiLogo } from '@/components/shop/VamiLogo'

const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '919XXXXXXXXX'
const WHATSAPP_MSG    = 'Hi Vami Clubwear! I have a query.'
const IG_HANDLE       = '@vamiclubwear'

const COLLECTIONS = [
  { href: '/products',                          label: 'All Collections' },
  { href: '/products?category=anarkali',        label: 'Anarkali'        },
  { href: '/products?category=salwar',          label: 'Salwar'          },
  { href: '/products?category=sharara-set',     label: 'Sharara Set'     },
  { href: '/products?category=churidar-bit',    label: 'Churidar Bit'    },
  { href: '/products?category=cotton-salwar',   label: 'Cotton Salwar'   },
  { href: '/products?category=modest-wear',     label: 'Modest Wear'     },
  { href: '/products?category=pants',           label: 'Pants'           },
  { href: '/products?category=duppatta',        label: 'Duppatta'        },
  { href: '/products?category=big-size',        label: 'Big Size'        },
]

const INFO_LINKS = [
  { href: '/about',    label: 'About Us'         },
  { href: '/contact',  label: 'Contact'          },
  { href: '/shipping', label: 'Shipping & Returns' },
  { href: '/sizing',   label: 'Size Guide'       },
]

const ACCOUNT_LINKS = [
  { href: '/wishlist',  label: 'Wishlist'     },
  { href: '/my-orders', label: 'My Orders'    },
  { href: '/track',     label: 'Track Order'  },
  { href: '/cart',      label: 'Cart'         },
]

export function Footer() {
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MSG)}`

  return (
    <footer className="border-t border-border bg-surface mt-12">
      <div className="mx-auto w-full px-6 py-16 md:py-20">

        {/* ── Main grid (5-col, logo spans 2) ── */}
        <div className="grid grid-cols-1 gap-12 md:grid-cols-5">

          {/* Col 1–2 — Brand */}
          <div className="md:col-span-2 flex flex-col gap-6">
            <Link href="/" aria-label="Vami Clubwear — Home">
              <VamiLogo height={72} />
            </Link>
            <p className="max-w-xs text-sm leading-relaxed text-muted/80">
              Premium Indo-Western fashion for the modern woman.
              Crafted with intention, worn with grace.
            </p>
            <a
              href="mailto:vamiclubwear@gmail.com"
              className="text-sm text-muted transition-colors hover:text-on-background"
            >
              vamiclubwear@gmail.com
            </a>
            <div className="flex items-center gap-4 pt-1">
              <a
                href="https://instagram.com/vamiclubwear"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="text-muted transition-colors hover:text-on-background"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none"/></svg>
              </a>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                className="text-muted transition-colors hover:text-on-background"
              >
                <MessageCircle className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Col 3 — Collections */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-on-background">
              Collections
            </h3>
            <ul className="mt-5 space-y-3.5">
              {COLLECTIONS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted/90 transition-colors hover:text-on-background"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4 — Information */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-on-background">
              Information
            </h3>
            <ul className="mt-5 space-y-3.5">
              {INFO_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted/90 transition-colors hover:text-on-background"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 5 — Account */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-on-background">
              Account
            </h3>
            <ul className="mt-5 space-y-3.5">
              {ACCOUNT_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted/90 transition-colors hover:text-on-background"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

        </div>

        {/* ── Bottom bar (3-part, matches reference) ── */}
        <div className="mt-12 border-t border-border pt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <p className="text-xs text-muted">
            &copy; {new Date().getFullYear()} Vami Clubwear. All rights reserved.
          </p>

          <div className="flex items-center gap-6">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs text-muted transition-colors hover:text-on-background"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              <span className="font-semibold uppercase tracking-widest">Chat on WhatsApp</span>
            </a>
            <a
              href="https://instagram.com/vamiclubwear"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs text-muted transition-colors hover:text-on-background"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none"/></svg>
              <span className="font-semibold uppercase tracking-widest">{IG_HANDLE}</span>
            </a>
          </div>

          <p className="text-xs text-muted">Crafted by <span className="font-bold text-fg-1 uppercase">Dragit</span></p>

        </div>
      </div>
    </footer>
  )
}
