import Link from 'next/link'
import { MessageCircle } from 'lucide-react'

const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '919XXXXXXXXX'
const WHATSAPP_MSG    = 'Hi Vami Clubwear! I have a query.'
const IG_URL          = 'https://www.instagram.com/vami_clubwear_manjeri/'

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
    'block text-[11px] font-medium uppercase tracking-[0.1em] text-fg-3 transition-colors hover:text-fg-1'
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

export function Footer() {
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MSG)}`

  return (
    <footer className="bg-[#FAF8F5] border-t border-[#C8C0B8]">
      <div className="mx-auto w-full max-w-[1400px] px-5 md:px-10">

        {/* ── Top grid — 4 columns with vertical dividers ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-[#C8C0B8] py-12 md:py-14">

          {/* POLICY */}
          <div className="px-5 md:px-8 first:pl-0">
            <ColumnHeading>Policy</ColumnHeading>
            <ul className="mt-6 space-y-3">
              {POLICY_LINKS.map(link => (
                <li key={link.label}>
                  <FooterLink href={link.href} label={link.label} />
                </li>
              ))}
            </ul>
          </div>

          {/* CUSTOMER CARE */}
          <div className="px-5 md:px-8">
            <ColumnHeading>Customer<br />Care</ColumnHeading>
            <ul className="mt-6 space-y-3">
              {CUSTOMER_CARE_LINKS.map(link => (
                <li key={link.label}>
                  <FooterLink href={link.href} label={link.label} />
                </li>
              ))}
            </ul>
          </div>

          {/* SOCIAL */}
          <div className="px-5 md:px-8">
            <ColumnHeading>Social</ColumnHeading>
            <ul className="mt-6 space-y-3">
              <li><FooterLink href={IG_URL} label="Instagram" external /></li>
              <li><FooterLink href={whatsappUrl} label="WhatsApp" external /></li>
              <li><FooterLink href="#" label="Facebook" external /></li>
              <li><FooterLink href="#" label="Pinterest" external /></li>
            </ul>
          </div>

          {/* MENU */}
          <div className="px-5 md:px-8">
            <ColumnHeading>Menu</ColumnHeading>
            <ul className="mt-6 space-y-3">
              {MENU_LINKS.map(link => (
                <li key={link.label}>
                  <FooterLink href={link.href} label={link.label} />
                </li>
              ))}
            </ul>
          </div>

        </div>

        {/* ── Middle strip — Brand + Payment ── */}
        <div className="border-t border-[#C8C0B8] flex flex-col md:flex-row items-center justify-between gap-6 py-8">

          <Link
            href="/"
            aria-label="Vami Clubwear — Home"
            className="text-fg-1 uppercase"
            style={{
              fontFamily: 'var(--font-poppins), Poppins, sans-serif',
              fontWeight: 500,
              fontSize: 'clamp(22px, 2vw, 28px)',
              letterSpacing: '0.08em',
            }}
          >
            Vami
          </Link>

          <div className="flex flex-wrap items-center gap-3 md:gap-4">
            <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-fg-3">
              Pay Securely With
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {PAYMENT_METHODS.map(m => (
                <span
                  key={m}
                  className="rounded-md border border-[#C8C0B8] bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-fg-2"
                >
                  {m}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ── Bottom copyright ── */}
        <div className="border-t border-[#C8C0B8] flex flex-col sm:flex-row items-center justify-between gap-3 py-5">
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
            className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-fg-3 hover:text-fg-1 transition-colors"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            Chat on WhatsApp
          </a>
        </div>
      </div>
    </footer>
  )
}
