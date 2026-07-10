import type { Metadata, Viewport } from 'next'
import { Poppins } from 'next/font/google'
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
    // Kept under 60 chars so Google doesn't truncate the SERP title.
    default: 'Vami Clubwear — Plus Size Anarkali, Abaya | Manjeri',
    template: '%s | Vami Clubwear',
  },
  description:
    "Vami Clubwear — premium women's fashion store in Malappuram & Manjeri, Kerala. Plus size & big size aesthetic Anarkalis, abayas, salwars, shararas, churidars, gowns and dupattas up to XXXL. Modest, Malabar wedding & Indo-Western wear, shipped across India.",
  applicationName: 'Vami Clubwear',
  generator: 'Next.js',
  category: 'fashion',

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
    alternateLocale: ['ml_IN', 'hi_IN', 'ar'],
    url: SITE_URL,
    siteName: 'Vami Clubwear',
    title: "Vami Clubwear — Women's Fashion in Malappuram, Manjeri | Plus Size, Anarkali, Abaya",
    description:
      "Premium women's fashion store in Malappuram & Manjeri. Plus size & big size Anarkalis, abayas, salwars, gowns up to XXXL — modest, Malabar wedding & Indo-Western wear.",
    images: [
      {
        url: '/hero-models.webp',
        width: 1200,
        height: 630,
        alt: "Vami Clubwear — women's fashion store in Malappuram, Manjeri",
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Vami Clubwear — Women's Fashion in Malappuram, Manjeri",
    description:
      "Plus size & big size Anarkalis, abayas, salwars, gowns up to XXXL. Modest, Malabar wedding & Indo-Western wear, shipped across India.",
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
  '@id': `${SITE_URL}/#organization`,
  name: 'Vami Clubwear',
  alternateName: ['Vami', 'Vami Manjeri', 'Vami Clubwear Manjeri', 'വാമി', 'വാമി ക്ലബ്‌വെയർ'],
  url: SITE_URL,
  logo: `${SITE_URL}/logo.svg`,
  image: `${SITE_URL}/hero-models.webp`,
  description:
    "Premium women's fashion store in Malappuram & Manjeri, Kerala — plus size & big size aesthetic Anarkalis, abayas, salwars, shararas, churidars, gowns and dupattas up to XXXL. Indo-Western fusion, modest fashion and Malabar wedding wear, shipped across India.",
  slogan: "Aesthetic plus-size & modest fashion from Malabar",
  knowsLanguage: ['en', 'ml', 'hi', 'ar'],
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Manjeri',
    addressRegion: 'Kerala',
    postalCode: '676121',
    addressCountry: 'IN',
  },
  areaServed: [
    { '@type': 'City', name: 'Manjeri' },
    { '@type': 'City', name: 'Malappuram' },
    { '@type': 'City', name: 'Perinthalmanna' },
    { '@type': 'City', name: 'Kondotty' },
    { '@type': 'City', name: 'Tirur' },
    { '@type': 'City', name: 'Tirurangadi' },
    { '@type': 'City', name: 'Nilambur' },
    { '@type': 'City', name: 'Edappal' },
    { '@type': 'City', name: 'Ponnani' },
    { '@type': 'City', name: 'Kottakkal' },
    { '@type': 'City', name: 'Kozhikode' },
    { '@type': 'AdministrativeArea', name: 'Malappuram District' },
    { '@type': 'AdministrativeArea', name: 'Malabar' },
    { '@type': 'State', name: 'Kerala' },
    { '@type': 'Country', name: 'India' },
  ],
  sameAs: [
    'https://www.instagram.com/vami_clubwear_manjeri/',
  ],
}

const WEBSITE_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${SITE_URL}/#website`,
  name: 'Vami Clubwear',
  alternateName: ['Vami', 'Vami Manjeri', 'Vami Clubwear Manjeri'],
  url: SITE_URL,
  inLanguage: ['en-IN', 'ml-IN'],
  publisher: { '@id': `${SITE_URL}/#organization` },
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
        {/* Preconnect to the backend so the first /api call doesn't pay a TCP+TLS handshake */}
        <link rel="preconnect" href="https://api.vamiclubwear.in" crossOrigin="" />
        <link rel="dns-prefetch" href="https://api.vamiclubwear.in" />
        {/* Preload the body weight of Metropolis so first paint isn't served in the fallback font */}
        <link
          rel="preload"
          as="font"
          type="font/woff2"
          href="/fonts/metropolis/metropolis-latin-400-normal.woff2"
          crossOrigin=""
        />
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
