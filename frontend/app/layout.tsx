import type { Metadata, Viewport } from 'next'
import { DM_Sans } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/Toaster'

// DM Sans — closest free match to Metropolis (used by drbydanarazik.com)
// Clean, geometric, premium feel across all weights
const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
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
    <html lang="en" className={dmSans.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-background text-on-background">
        {children}
        <Toaster />
      </body>
    </html>
  )
}
