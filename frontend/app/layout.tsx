import type { Metadata, Viewport } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/Toaster'

// Body font — clean, modern
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

// Display font — luxury editorial feel for product names, headers
const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Vami Clubwear — Indo-Western Fusion & Bridal Couture',
    template: '%s | Vami Clubwear',
  },
  description:
    'Premium Indo-Western fusion wear, modest fashion, and bespoke bridal collections. Based in Manjeri, Kerala.',
  keywords: [
    'Indo-Western fashion',
    'fusion wear',
    'bridal collection',
    'modest fashion',
    'Kerala fashion',
    'Manjeri',
    'churidar',
    'salwar',
    'dupatta',
  ],
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    siteName: 'Vami Clubwear',
  },
}

export const viewport: Viewport = {
  themeColor: '#121212',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
}

interface RootLayoutProps {
  children: React.ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    // 'dark' class is always applied — app is dark-mode only per CLAUDE.md
    <html lang="en" className={`dark ${inter.variable} ${playfair.variable}`} suppressHydrationWarning>
      <body className="min-h-screen bg-background text-on-background">
        {children}
        <Toaster />
      </body>
    </html>
  )
}
