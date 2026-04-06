// Applies Navbar + Footer + CartDrawer + WhatsApp button to all nested shop routes
import { Navbar } from '@/components/shop/Navbar'
import { Footer } from '@/components/shop/Footer'
import { CartDrawer } from '@/components/shop/CartDrawer'
import { WhatsAppButton } from '@/components/shop/WhatsAppButton'

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main>{children}</main>
      <Footer />
      <CartDrawer />
      <WhatsAppButton />
    </>
  )
}
