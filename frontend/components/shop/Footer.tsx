import Link from 'next/link'
import { MessageCircle } from 'lucide-react'
import { VamiLogo } from '@/components/shop/VamiLogo'

const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '919XXXXXXXXX'
const WHATSAPP_MSG    = 'Hi Vami Clubwear! I have a query.'
const IG_URL          = 'https://www.instagram.com/vami_clubwear_manjeri/'

/* ──────────────────────────────────────────────────────────────────────────────
   Footer — three-row table:
     ROW A ─ four link columns (Policy · Customer Care · Social · Menu)
     ROW B ─ brand + Pay Securely With + payment cards + UPI app badges
     ROW C ─ copyright strip

   Stroke rule: 1.5px uniform black. Each cell owns specific sides so adjacent
   cells never double up to visually 3px at intersections.
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

// ── Payment + UPI badges ─────────────────────────────────────────────────────
// Rendered as typographic pills so the row stays crisp until admin drops real
// SVGs into /public. Consistent dimensions + uppercase label keep the grid feel.
const PAYMENT_CARDS: Array<{ label: string; tone?: 'light' | 'dark' }> = [
  { label: 'Visa' },
  { label: 'Mastercard' },
  { label: 'RuPay' },
  { label: 'UPI' },
  { label: 'Razorpay' },
  { label: 'Net Banking' },
  { label: 'COD' },
]

const UPI_APPS = [
  { label: 'Google Pay' },
  { label: 'PhonePe'    },
  { label: 'Paytm'      },
  { label: 'BHIM'       },
  { label: 'Amazon Pay' },
]

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

function PaymentPill({ label }: { label: string }) {
  return (
    <span
      className="inline-flex h-8 min-w-[60px] items-center justify-center rounded-[5px] border-[1.5px] border-black bg-white px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-fg-1"
      style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}
    >
      {label}
    </span>
  )
}

export function Footer() {
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MSG)}`

  return (
    // Outer L/R edges live on the inner shell. Top edge is owned by the
    // <ShopVamiMarquee> immediately above so the strokes don't double up.
    <footer className="bg-[#FAF8F5]">
      <div className="mx-auto w-full max-w-[1400px] px-5 md:px-10 border-l-[1.5px] border-r-[1.5px] border-black">

        {/* ══════════ ROW A — 4 link columns ══════════ */}
        <div className="grid grid-cols-2 md:grid-cols-4">
          {/* Col 1 — no left border */}
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
          <div className="border-l-[1.5px] border-black">
            <Column heading={<>Customer<br />Care</>}>
              {CUSTOMER_CARE_LINKS.map((link) => (
                <li key={link.label}>
                  <FooterLink href={link.href} label={link.label} />
                </li>
              ))}
            </Column>
          </div>

          {/* Col 3 — on mobile wraps onto row 2 (top divider instead of left) */}
          <div className="md:border-l-[1.5px] md:border-black border-t-[1.5px] md:border-t-0 border-black">
            <Column heading="Social">
              <li><FooterLink href={IG_URL}      label="Instagram" external /></li>
              <li><FooterLink href={whatsappUrl} label="WhatsApp"  external /></li>
              <li><FooterLink href="#"           label="Facebook"  external /></li>
              <li><FooterLink href="#"           label="Pinterest" external /></li>
            </Column>
          </div>

          {/* Col 4 — owns its left divider */}
          <div className="border-l-[1.5px] border-black border-t-[1.5px] md:border-t-0">
            <Column heading="Menu">
              {MENU_LINKS.map((link) => (
                <li key={link.label}>
                  <FooterLink href={link.href} label={link.label} />
                </li>
              ))}
            </Column>
          </div>
        </div>

        {/* ══════════ ROW B — Brand + Pay Securely With ══════════ */}
        <div className="grid grid-cols-1 md:grid-cols-[minmax(260px,340px)_1fr] border-t-[1.5px] border-black">

          {/* Brand cell — logo left, divider lives on the payment cell */}
          <div className="flex items-center justify-center md:justify-start gap-6 md:gap-8 px-6 md:px-10 py-10 md:py-12">
            <Link href="/" aria-label="Vami Clubwear — Home" className="flex-shrink-0">
              <VamiLogo size="lg" />
            </Link>
          </div>

          {/* Payment cell — owns vertical divider (desktop) */}
          <div className="flex flex-col gap-5 md:gap-6 px-6 md:px-10 py-8 md:py-10 md:border-l-[1.5px] md:border-black text-center md:text-left">
            {/* Sub-row 1: cards */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
              <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-fg-3 whitespace-nowrap">
                Pay Securely With
              </span>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                {PAYMENT_CARDS.map((m) => (
                  <PaymentPill key={m.label} label={m.label} />
                ))}
              </div>
            </div>

            {/* Sub-row 2: UPI apps */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
              <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-fg-3 whitespace-nowrap">
                UPI Apps
              </span>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                {UPI_APPS.map((a) => (
                  <PaymentPill key={a.label} label={a.label} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ══════════ ROW C — Copyright strip ══════════ */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 px-6 md:px-10 py-5 border-t-[1.5px] border-b-[1.5px] border-black text-center md:text-left">
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
