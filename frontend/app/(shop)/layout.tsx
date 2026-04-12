// Applies Navbar + Footer + CartDrawer to all nested shop routes
// Lenis smooth scroll is scoped here — does NOT affect admin pages
import { Navbar }           from '@/components/shop/Navbar'
import { Footer }           from '@/components/shop/Footer'
import { CartDrawer }       from '@/components/shop/CartDrawer'
import { WishlistDrawer }   from '@/components/shop/WishlistDrawer'
import { PageTransition }   from '@/components/shop/PageTransition'
import { LenisProvider }    from '@/components/shop/LenisProvider'

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <LenisProvider>
      <Navbar />
      <main>
        <PageTransition>{children}</PageTransition>
      </main>
      <Footer />
      <CartDrawer />
      <WishlistDrawer />
    </LenisProvider>
  )
}
