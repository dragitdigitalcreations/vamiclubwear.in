import type { Metadata, Viewport } from 'next'
import '@fontsource/metropolis/300.css'
import '@fontsource/metropolis/400.css'
import '@fontsource/metropolis/500.css'
import '@fontsource/metropolis/600.css'
import '@fontsource/metropolis/700.css'
import './globals.css'
import { Toaster } from '@/components/ui/Toaster'

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
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-on-background">
        {children}
        <Toaster />
      </body>
    </html>
  )
}
