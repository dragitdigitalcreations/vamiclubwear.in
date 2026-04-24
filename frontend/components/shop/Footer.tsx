import Link from 'next/link'
import { MessageCircle } from 'lucide-react'
import { VamiLogo } from '@/components/shop/VamiLogo'

const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '919XXXXXXXXX'
const WHATSAPP_MSG    = 'Hi Vami Clubwear! I have a query.'
const IG_URL          = 'https://www.instagram.com/vami_clubwear_manjeri/'

/* ──────────────────────────────────────────────────────────────────────────────
   Footer — table-style layout with 1px intersecting strokes.

   Structure:
     ┌───────────┬───────────────────────────────────────────────┐
     │  Brand    │  Pay Securely With · [UPI][Visa][MC][RuPay]   │   Row A
     │  (logo +  │                                               │
     │  divider) │                                               │
     ├───────────┴───────┬──────────┬──────────┬─────────────────┤
     │   Policy          │ Customer │  Social  │      Menu       │   Row B
     │                   │   Care   │          │                 │
     ├───────────────────┴──────────┴──────────┴─────────────────┤
     │  © Vami · Crafted by Dragit · WhatsApp                    │   Row C
     └───────────────────────────────────────────────────────────┘

   Every visible cell boundary is a 1px #C8C0B8 stroke (same colour + weight as
   the navbar hairlines). Achieved with `border` / `border-t` / `border-l` on
   the cells themselves so intersections are perfectly sharp.

   Mobile: columns collapse to 2 then 1, and every text block inside the cells
   is centre-aligned per the spec.
   ────────────────────────────────────────────────────────────────────────── */

const POLICY_LINKS = [
  { href: '/shipping', label: 'Shipping & Returns' },
  { href: '/returns',  label: 'Returns'            },
  { href: '/sizing',   label: 'Size Guide'         },
  { href: '/about',    label: 'Terms & Conditions' },
]

const CUSTOMER_CARE_LINKS = [
  { href: '/about',     label: 'About Us'    },
  { href: '/contact',   label: 'Contact'     },
  { href: '/my-orders', label: 'My Orders'   },
  { href: '/track',     label: 'Track Order' },
]

const MENU_LINKS = [
  { href: '/',                           label: 'Home'        },
  { href: '/products',                   label: 'Explore'     },
  { href: '/products',                   label: 'Collections' },
  { href: '/products?category=big-size', label: 'Big Size'    },
  { href: '/wishlist',                   label: 'Wishlist'    },
]

const PAYMENT_METHODS = ['UPI', 'Visa', 'Mastercard', 'RuPay', 'Razorpay']

const STROKE = 'border-black border-[3px]'

function ColumnHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3
      className="text-fg-1 uppercase"
      style={{
        fontFamily: 'var(--font-poppins), Poppins, sans-serif',
        fontWeight: 500,
        fontSize: 'clamp(18px, 1.6vw, 22px)',
        letterSpacing: '0.02em',
        lineHeight: 1.1,
      }}
    >
      {children}
    </h3>
  )
}

function FooterLink({ href, label, external }: { href: string; label: string; external?: boolean }) {
  const className =
    'block text-[11px] font-medium uppercase tracking-[0.1em] text-fg-3 transition-colors hover:text-fg-1 text-center md:text-left'
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {label}
      </a>
    )
  }
  return (
    <Link href={href} className={className}>
      {label}
    </Link>
  )
}

function Column({
  heading,
  children,
}: {
  heading: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="px-6 py-10 md:px-8 md:py-12 text-center md:text-left">
      <ColumnHeading>{heading}</ColumnHeading>
      <ul className="mt-6 space-y-3">{children}</ul>
    </div>
  )
}

export function Footer() {
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MSG)}`

  return (
    <footer className={`bg-[#FAF8F5] border-t ${STROKE}`}>
      <div className="mx-auto w-full max-w-[1400px] px-5 md:px-10">

        {/* ══════════ ROW A — Brand + Payment ══════════
            Two cells joined by a vertical stroke. On the brand cell, a centred
            vertical divider intersects the full row height, as spec'd. */}
        <div className={`grid grid-cols-1 md:grid-cols-[minmax(260px,340px)_1fr] border-l border-r ${STROKE}`}>

          {/* Brand cell — logo with centred intersecting vertical divider */}
          <div
            className={`relative flex items-center justify-center md:justify-start gap-6 md:gap-8 px-6 md:px-10 py-10 md:py-12 border-t ${STROKE}`}
          >
            <Link href="/" aria-label="Vami Clubwear — Home" className="flex-shrink-0">
              <VamiLogo size="lg" />
            </Link>
            {/* Centred divider — intersects top & bottom of the row (desktop only) */}
            <span
              aria-hidden
              className={`hidden md:block absolute top-0 bottom-0 right-0 w-[3px] bg-black`}
            />
          </div>

          {/* Payment cell */}
          <div
            className={`flex flex-col md:flex-row items-center md:items-center justify-center md:justify-start gap-5 md:gap-6 px-6 md:px-10 py-8 md:py-12 border-t ${STROKE} text-center md:text-left`}
          >
            <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-fg-3">
              Pay Securely With
            </span>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {PAYMENT_METHODS.map((m) => (
                <span
                  key={m}
                  className={`rounded-[5px] border border-black bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-fg-2`}
                >
                  {m}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ══════════ ROW B — 4 link columns with intersecting strokes ══════════
            Each column is a cell with top + left + right hairlines so the
            intersections are a perfect 1px cross regardless of cell content. */}
        <div className={`grid grid-cols-2 md:grid-cols-4 border-l ${STROKE}`}>
          {[
            { heading: <>Policy</>,                   links: POLICY_LINKS },
            { heading: <>Customer<br />Care</>,       links: CUSTOMER_CARE_LINKS },
          ].map((col, i) => (
            <div key={i} className={`border-t border-r ${STROKE}`}>
              <Column heading={col.heading}>
                {col.links.map((link) => (
                  <li key={link.label}>
                    <FooterLink href={link.href} label={link.label} />
                  </li>
                ))}
              </Column>
            </div>
          ))}

          {/* Social */}
          <div className={`border-t border-r ${STROKE}`}>
            <Column heading="Social">
              <li><FooterLink href={IG_URL}      label="Instagram" external /></li>
              <li><FooterLink href={whatsappUrl} label="WhatsApp"  external /></li>
              <li><FooterLink href="#"           label="Facebook"  external /></li>
              <li><FooterLink href="#"           label="Pinterest" external /></li>
            </Column>
          </div>

          {/* Menu */}
          <div className={`border-t border-r ${STROKE}`}>
            <Column heading="Menu">
              {MENU_LINKS.map((link) => (
                <li key={link.label}>
                  <FooterLink href={link.href} label={link.label} />
                </li>
              ))}
            </Column>
          </div>
        </div>

        {/* ══════════ ROW C — Copyright strip ══════════ */}
        <div
          className={`flex flex-col md:flex-row items-center justify-between gap-3 px-6 md:px-10 py-5 border-t border-l border-r border-b ${STROKE} text-center md:text-left`}
        >
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-fg-3">
            &copy; {new Date().getFullYear()} Vami Clubwear. All rights reserved.
          </p>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-fg-3">
            Crafted by <span className="text-fg-1 font-semibold">Dragit</span>
          </p>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-fg-3 hover:text-fg-1 transition-colors"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            Chat on WhatsApp
          </a>
        </div>
      </div>
    </footer>
  )
}
