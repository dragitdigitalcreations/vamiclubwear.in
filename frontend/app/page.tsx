// Root page — wraps shop layout components directly since this is outside the (shop) route group.
// ISR: cache at edge, revalidate every 10 minutes
export const revalidate = 600

import { Navbar }          from '@/components/shop/Navbar'
import { Footer }          from '@/components/shop/Footer'
import { CartDrawer }      from '@/components/shop/CartDrawer'
import { HomePageContent } from '@/components/shop/HomePageContent'

export default function RootPage() {
  return (
    <>
      {/* Preload LCP hero image — only on the home page (was global, wasted on every other route) */}
      <link rel="preload" as="image" href="/hero-models.webp" fetchPriority="high" />
      <Navbar />
      <main>
        <HomePageContent />
      </main>
      <Footer />
      <CartDrawer />
    </>
  )
}
