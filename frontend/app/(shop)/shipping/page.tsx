import Link from 'next/link'

export const metadata = { title: 'Shipping & Returns — Vami Clubwear' }

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-border pb-10 mb-10 last:border-0">
      <h2 className="font-display text-xl font-semibold text-on-background mb-5">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-muted">{children}</div>
    </div>
  )
}

export default function ShippingPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-32 pb-10 md:px-8">
      <div className="mb-12">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-primary-light mb-4">Policy</p>
        <h1 className="font-display text-4xl font-bold text-on-background">Shipping &amp; Returns</h1>
        <p className="mt-3 text-sm text-muted">Last updated: April 2026</p>
      </div>

      <Section title="Shipping">
        <p><strong className="text-on-background">Processing Time:</strong> All orders are processed within 1–2 business days after confirmation.</p>
        <p><strong className="text-on-background">Delivery within Kerala:</strong> 2–4 business days. Orders from Manjeri and nearby areas may arrive sooner.</p>
        <p><strong className="text-on-background">Pan-India Delivery:</strong> 4–7 business days depending on your location.</p>
        <p><strong className="text-on-background">Shipping Charges:</strong> Free shipping on all orders above ₹2,500. A flat charge of ₹80 applies for orders below ₹2,500.</p>
        <p>Once your order is dispatched, you will receive a tracking number via email or WhatsApp.</p>
      </Section>

      <Section title="Returns & Exchanges">
        <p>We accept returns within <strong className="text-on-background">7 days</strong> of delivery, provided the item is:</p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>Unworn and unused</li>
          <li>In original packaging with tags intact</li>
          <li>Not a sale / discounted item</li>
          <li>Not a custom / made-to-order piece</li>
        </ul>
        <p className="mt-3">To initiate a return, email us at <a href="mailto:hello@vamiclubwear.in" className="text-on-background underline underline-offset-2">hello@vamiclubwear.in</a> with your order number and reason. We will arrange a pickup at no extra cost within Kerala.</p>
        <p><strong className="text-on-background">Exchanges:</strong> We don't process direct exchanges. Return the original item for a refund and place a new order for your preferred size or colour.</p>
      </Section>

      <Section title="Refunds">
        <p>Once we receive and inspect the returned item, a refund will be processed within <strong className="text-on-background">5–7 business days</strong> to your original payment method.</p>
        <p>For Cash on Delivery orders, refunds are issued via bank transfer. Please provide your account details when initiating the return.</p>
        <p>If you haven't received your refund after 10 business days, contact us at <a href="mailto:hello@vamiclubwear.in" className="text-on-background underline underline-offset-2">hello@vamiclubwear.in</a>.</p>
      </Section>

      <Section title="Damaged or Wrong Items">
        <p>If you received a damaged, defective, or wrong item, please contact us within <strong className="text-on-background">48 hours</strong> of delivery with photos. We will arrange a replacement or full refund at no cost to you.</p>
      </Section>

      <div className="mt-4">
        <Link
          href="/contact"
          className="inline-flex items-center gap-2 border border-border px-6 py-3 text-xs font-semibold uppercase tracking-widest text-muted transition-colors hover:text-on-background hover:border-on-background"
        >
          Contact Us for Help
        </Link>
      </div>
    </div>
  )
}
