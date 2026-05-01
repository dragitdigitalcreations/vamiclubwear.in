import type { Metadata, Viewport } from 'next'
import { Poppins } from 'next/font/google'
import '@fontsource/metropolis/300.css'
import '@fontsource/metropolis/400.css'
import '@fontsource/metropolis/500.css'
import '@fontsource/metropolis/600.css'
import '@fontsource/metropolis/700.css'
import './globals.css'
import { Toaster } from '@/components/ui/Toaster'

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['200', '300', '400', '600'],
  variable: '--font-poppins',
  display: 'swap',
})

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.vamiclubwear.in'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Trendy Women's Fashion in India | Vami Clubwear",
    template: '%s | Vami Clubwear',
  },
  description:
    "Shop stylish women's clothing online at Vami Clubwear. Discover trendy tops, dresses & oversized t-shirts for modern women in India. Indo-Western fusion, modest fashion & bridal couture handcrafted in Manjeri, Kerala.",
  applicationName: 'Vami Clubwear',
  generator: 'Next.js',
  category: 'fashion',
  keywords: [
    "women's fashion India",
    'trendy outfits for women',
    'online clothing store India',
    "women's clothing online",
    'oversized t-shirts for women',
    'dresses for women',
    'tops for women online',
    'Kerala fashion',
    'Vami Clubwear',
    'Vami Manjeri',
    'Indo-Western fashion',
    'fusion wear India',
    'bridal collection',
    'modest fashion',
    'Manjeri boutique',
    'Anarkali online',
    'salwar suit online',
    'sharara set',
    'churidar online India',
    'dupatta',
    'Muslim wedding wear',
    'Kerala bridal couture',
  ],
  authors: [{ name: 'Vami Clubwear' }],
  creator: 'Vami Clubwear',
  publisher: 'Vami Clubwear',
  alternates: {
    canonical: SITE_URL,
  },
  formatDetection: { email: false, address: false, telephone: false },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: SITE_URL,
    siteName: 'Vami Clubwear',
    title: "Trendy Women's Fashion in India | Vami Clubwear",
    description:
      "Shop stylish women's clothing online at Vami Clubwear. Discover trendy tops, dresses & oversized t-shirts for modern women in India.",
    images: [
      {
        url: '/hero-models.webp',
        width: 1200,
        height: 630,
        alt: "Vami Clubwear — trendy women's fashion in India",
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Trendy Women's Fashion in India | Vami Clubwear",
    description:
      "Shop stylish women's clothing online at Vami Clubwear. Discover trendy tops, dresses & oversized t-shirts for modern women in India.",
    images: ['/hero-models.webp'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  icons: {
    icon: '/icon.svg',
    shortcut: '/logo-icon.svg',
    apple: '/logo-icon.svg',
  },
  verification: {
    // Replace with the real Search Console token. Leaving the placeholder file
    // (`google5b124ff02ad846fb.html`) in /public covers the legacy file-based path.
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
  },
}

const ORG_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'ClothingStore',
  name: 'Vami Clubwear',
  url: SITE_URL,
  logo: `${SITE_URL}/logo.svg`,
  image: `${SITE_URL}/hero-models.webp`,
  description:
    'Premium Indo-Western fusion wear, modest fashion, and bespoke bridal collections.',
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Manjeri',
    addressRegion: 'Kerala',
    addressCountry: 'IN',
  },
  areaServed: 'IN',
  sameAs: [
    'https://www.instagram.com/vami_clubwear_manjeri/',
  ],
}

const WEBSITE_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Vami Clubwear',
  url: SITE_URL,
  potentialAction: {
    '@type': 'SearchAction',
    target: `${SITE_URL}/search?q={search_term_string}`,
    'query-input': 'required name=search_term_string',
  },
}

export const viewport: Viewport = {
  themeColor: '#FFFFFF',
  colorScheme: 'light',
  width: 'device-width',
  initialScale: 1,
}

interface RootLayoutProps {
  children: React.ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://res.cloudinary.com" crossOrigin="" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
        <link rel="preload" as="image" href="/hero-models.webp" fetchPriority="high" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ORG_JSONLD) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(WEBSITE_JSONLD) }}
        />
      </head>
      <body className={`min-h-screen bg-background text-on-background ${poppins.variable}`}>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
