import Link from 'next/link'
import { MessageCircle } from 'lucide-react'
import { VamiLogo } from '@/components/shop/VamiLogo'

const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '919XXXXXXXXX'
const WHATSAPP_MSG    = 'Hi Vami Clubwear! I have a query.'
const IG_URL          = 'https://www.instagram.com/vami_clubwear_manjeri/'

/* ──────────────────────────────────────────────────────────────────────────────
   Footer — table-style layout with uniform 2px black intersecting strokes.

   Stroke rule: every cell declares its borders with explicit per-side widths
   (`border-t-[2px]`, `border-r-[2px]`, etc.) so Tailwind can never collapse a
   side to its 1px default. Intersections are authored so that any given edge
   is drawn by EXACTLY ONE cell — adjacent cells drop the shared side — which
   prevents 2px + 2px stacking into a visually 4px line.
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
    // Top edge of the footer + left/right outer edges of the table live on the
    // <footer> itself — so no row declares them, no stacking possible.
    <footer className="bg-[#FAF8F5] border-t-[2px] border-black">
      <div className="mx-auto w-full max-w-[1400px] px-5 md:px-10 border-l-[2px] border-r-[2px] border-black">

        {/* ══════════ ROW A — Brand + Payment ══════════ */}
        <div className="grid grid-cols-1 md:grid-cols-[minmax(260px,340px)_1fr]">

          {/* Brand cell — no borders here; divider lives on the payment cell */}
          <div className="flex items-center justify-center md:justify-start gap-6 md:gap-8 px-6 md:px-10 py-10 md:py-12">
            <Link href="/" aria-label="Vami Clubwear — Home" className="flex-shrink-0">
              <VamiLogo size="lg" />
            </Link>
          </div>

          {/* Payment cell — owns the vertical divider (left edge, desktop only) */}
          <div className="flex flex-col md:flex-row items-center justify-center md:justify-start gap-5 md:gap-6 px-6 md:px-10 py-8 md:py-12 md:border-l-[2px] md:border-black text-center md:text-left">
            <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-fg-3">
              Pay Securely With
            </span>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {PAYMENT_METHODS.map((m) => (
                <span
                  key={m}
                  className="rounded-[5px] border-[2px] border-black bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-fg-2"
                >
                  {m}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ══════════ ROW B — 4 link columns ══════════
            Row B owns its own top edge. Each cell past the first owns its left
            edge only → no adjacent cell duplicates the same stroke. */}
        <div className="grid grid-cols-2 md:grid-cols-4 border-t-[2px] border-black">
          {/* Col 1 — no left border (matches outer left) */}
          <div>
            <Column heading={<>Policy</>}>
              {POLICY_LINKS.map((link) => (
                <li key={link.label}>
                  <FooterLink href={link.href} label={link.label} />
                </li>
              ))}
            </Column>
          </div>

          {/* Col 2 — owns its left divider */}
          <div className="border-l-[2px] border-black">
            <Column heading={<>Customer<br />Care</>}>
              {CUSTOMER_CARE_LINKS.map((link) => (
                <li key={link.label}>
                  <FooterLink href={link.href} label={link.label} />
                </li>
              ))}
            </Column>
          </div>

          {/* Col 3 — owns its left divider (desktop only; on mobile it wraps onto row 2 and gets a top border instead) */}
          <div className="md:border-l-[2px] md:border-black border-t-[2px] md:border-t-0 border-black">
            <Column heading="Social">
              <li><FooterLink href={IG_URL}      label="Instagram" external /></li>
              <li><FooterLink href={whatsappUrl} label="WhatsApp"  external /></li>
              <li><FooterLink href="#"           label="Facebook"  external /></li>
              <li><FooterLink href="#"           label="Pinterest" external /></li>
            </Column>
          </div>

          {/* Col 4 — owns its left divider */}
          <div className="border-l-[2px] border-black border-t-[2px] md:border-t-0">
            <Column heading="Menu">
              {MENU_LINKS.map((link) => (
                <li key={link.label}>
                  <FooterLink href={link.href} label={link.label} />
                </li>
              ))}
            </Column>
          </div>
        </div>

        {/* ══════════ ROW C — Copyright strip ══════════
            Owns its top + bottom edges; left/right already provided by the
            outer wrapper so we don't redeclare them here. */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 px-6 md:px-10 py-5 border-t-[2px] border-b-[2px] border-black text-center md:text-left">
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
