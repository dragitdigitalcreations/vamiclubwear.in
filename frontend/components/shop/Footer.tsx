import Link from 'next/link'
import { MessageCircle } from 'lucide-react'
import { VamiLogo } from '@/components/shop/VamiLogo'

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

// Real payment & UPI marks — single horizontal row.
const PAYMENT_ICONS: Array<{ label: string; src: string }> = [
  { label: 'Mastercard',       src: '/payments/mastercard.svg' },
  { label: 'American Express', src: '/payments/amex.png'        },
  { label: 'Discover',         src: '/payments/discover.png'    },
  { label: 'Diners Club',      src: '/payments/diners.svg'      },
  { label: 'RuPay',            src: '/payments/rupay.png'       },
  { label: 'Google Pay',       src: '/payments/gpay.svg'        },
  { label: 'PhonePe',          src: '/payments/phonepe.png'     },
  { label: 'ICICI Net Banking', src: '/payments/icici.png'      },
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

function PaymentMark({ label, src }: { label: string; src: string }) {
  return (
    <span
      className="inline-flex h-9 w-[64px] items-center justify-center rounded-[6px] border-[1.5px] border-black bg-white px-2"
      title={label}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={label}
        className="h-full w-full object-contain"
        draggable={false}
      />
    </span>
  )
}

export function Footer() {
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MSG)}`

  // Brand cell width tracks Col 1 (1/4) so the vertical divider in ROW B
  // lines up exactly under the Policy↔Customer Care divider in ROW A.
  return (
    <footer className="bg-[#FAF8F5]">
      <div className="mx-auto w-full max-w-[1400px] px-5 md:px-10 border-l-[1.5px] border-r-[1.5px] border-black">

        {/* ROW A — 4 link columns */}
        <div className="grid grid-cols-2 md:grid-cols-4">
          <div>
            <Column heading={<>Policy</>}>
              {POLICY_LINKS.map((link) => (
                <li key={link.label}>
                  <FooterLink href={link.href} label={link.label} />
                </li>
              ))}
            </Column>
          </div>

          <div className="border-l-[1.5px] border-black">
            <Column heading={<>Customer<br />Care</>}>
              {CUSTOMER_CARE_LINKS.map((link) => (
                <li key={link.label}>
                  <FooterLink href={link.href} label={link.label} />
                </li>
              ))}
            </Column>
          </div>

          <div className="md:border-l-[1.5px] md:border-black border-t-[1.5px] md:border-t-0 border-black">
            <Column heading="Social">
              <li><FooterLink href={IG_URL}      label="Instagram" external /></li>
              <li><FooterLink href={whatsappUrl} label="WhatsApp"  external /></li>
              <li><FooterLink href="#"           label="Facebook"  external /></li>
              <li><FooterLink href="#"           label="Pinterest" external /></li>
            </Column>
          </div>

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

        {/* ROW B — Brand cell aligned to 1 of 4 cols so its right divider
            sits directly under the Policy↔Customer Care divider above. */}
        <div className="grid grid-cols-1 md:grid-cols-4 border-t-[1.5px] border-black">
          <div className="md:col-span-1 flex items-center justify-center md:justify-start gap-6 md:gap-8 px-6 md:px-8 py-10 md:py-12">
            <Link href="/" aria-label="Vami Clubwear — Home" className="flex-shrink-0">
              <VamiLogo size="lg" />
            </Link>
          </div>

          <div className="md:col-span-3 flex flex-col gap-3 px-6 md:px-10 py-8 md:py-10 md:border-l-[1.5px] md:border-black text-center md:text-left">
            <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-fg-3">
              Pay Securely With
            </span>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
              {PAYMENT_ICONS.map((m) => (
                <PaymentMark key={m.label} label={m.label} src={m.src} />
              ))}
            </div>
          </div>
        </div>

        {/* ROW C — Copyright strip; bottom border sits flush with edges */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 px-6 md:px-10 py-5 border-t-[1.5px] border-b-[1.5px] border-black text-center md:text-left">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-fg-3">
            &copy; {new Date().getFullYear()} Vami Clubwear. All rights reserved.
          </p>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-fg-3">
            Crafted by{' '}
            <a
              href="https://www.instagram.com/dragit.in/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-fg-1 font-semibold transition-colors hover:text-primary"
              aria-label="Visit Dragit on Instagram"
            >
              Dragit
            </a>
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
