// Applies Navbar + Footer + overlays to all nested shop routes
// Lenis smooth scroll is scoped here — does NOT affect admin pages
import { Suspense }         from 'react'
import { Navbar }           from '@/components/shop/Navbar'
import { Footer }           from '@/components/shop/Footer'
import { ShopVamiMarquee }  from '@/components/shop/ShopVamiMarquee'
import { WishlistDrawer }   from '@/components/shop/WishlistDrawer'
import { FilterDrawer }     from '@/components/shop/FilterDrawer'
import { PageTransition }   from '@/components/shop/PageTransition'
import { LenisProvider }    from '@/components/shop/LenisProvider'
import { CustomerAuthModal } from '@/components/shop/CustomerAuthModal'
import { PresencePinger }    from '@/components/shop/PresencePinger'

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <LenisProvider>
      <Navbar />
      <main>
        <PageTransition>{children}</PageTransition>
      </main>
      <ShopVamiMarquee />
      <Footer />
      <WishlistDrawer />
      {/* FilterDrawer and CustomerAuthModal both call useSearchParams(), which
          bails out of static prerendering unless it sits under a Suspense
          boundary. These are invisible overlays, so an empty fallback is
          correct — and unlike a route-level loading.tsx, a boundary here does
          not stream the page shell, so `notFound()` can still set a real 404
          status instead of a Soft-404-shaped 200. */}
      <Suspense fallback={null}>
        <FilterDrawer />
      </Suspense>
      <Suspense fallback={null}>
        <CustomerAuthModal />
      </Suspense>
      <PresencePinger />
    </LenisProvider>
  )
}
