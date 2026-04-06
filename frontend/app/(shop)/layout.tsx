// Applies Navbar + Footer + CartDrawer to all nested shop routes:
// /products, /products/[slug], /cart
// The homepage (/) is at app/page.tsx and wraps these components directly.
import { Navbar } from '@/components/shop/Navbar'
import { Footer } from '@/components/shop/Footer'
import { CartDrawer } from '@/components/shop/CartDrawer'

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main>{children}</main>
      <Footer />
      <CartDrawer />
    </>
  )
}
