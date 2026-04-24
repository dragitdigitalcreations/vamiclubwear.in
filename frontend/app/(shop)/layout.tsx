// Applies Navbar + Footer + overlays to all nested shop routes
// Lenis smooth scroll is scoped here — does NOT affect admin pages
import { Navbar }           from '@/components/shop/Navbar'
import { Footer }           from '@/components/shop/Footer'
import { ShopVamiMarquee }  from '@/components/shop/ShopVamiMarquee'
import { WishlistDrawer }   from '@/components/shop/WishlistDrawer'
import { FilterDrawer }     from '@/components/shop/FilterDrawer'
import { PageTransition }   from '@/components/shop/PageTransition'
import { LenisProvider }    from '@/components/shop/LenisProvider'
import { CustomerAuthModal } from '@/components/shop/CustomerAuthModal'

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
      <FilterDrawer />
      <CustomerAuthModal />
    </LenisProvider>
  )
}
