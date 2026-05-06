import Link from 'next/link'

export const metadata = {
  title: 'Terms & Conditions — Vami Clubwear',
  description:
    'The terms and conditions that govern your use of vamiclubwear.in and any orders you place with Vami Clubwear.',
  alternates: { canonical: '/terms' },
}

const LAST_UPDATED = '5 May 2026'

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-32 pb-16 md:px-8">

      <div className="mb-10">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-primary-light mb-4">Legal</p>
        <h1 className="font-display text-4xl font-bold text-on-background md:text-5xl leading-tight">
          Terms &amp; Conditions
        </h1>
        <p className="mt-3 text-xs text-muted">Last updated: {LAST_UPDATED}</p>
      </div>

      <div className="space-y-10 text-sm leading-relaxed text-muted">

        <section>
          <p>
            These terms govern your use of <a href="https://www.vamiclubwear.in" className="text-on-background underline underline-offset-4">vamiclubwear.in</a>{' '}
            (the &ldquo;site&rdquo;) and any order you place with Vami Clubwear (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;).
            By browsing the site, creating an account or placing an order you accept these terms in full.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-on-background mb-3">1. Eligibility</h2>
          <p>
            You must be at least 18 years old, or be transacting with the consent and supervision of a
            parent or legal guardian, to place an order. By placing an order you confirm that the
            information you provide is accurate and that you are authorised to use the payment method
            chosen.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-on-background mb-3">2. Products, descriptions &amp; colour</h2>
          <p>
            We make every effort to display products accurately. Photographs are taken under studio
            lighting; actual colour may vary slightly with your screen and ambient light. Embroidery,
            handwork and weave details are produced by hand and small variations are part of the
            character of each piece, not a defect.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-on-background mb-3">3. Pricing &amp; payment</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>All prices are listed in Indian Rupees (₹) and are inclusive of applicable GST.</li>
            <li>We accept online prepaid payments only &mdash; UPI, debit and credit cards, net-banking and supported wallets, processed by Razorpay. <strong className="text-on-background">We do not offer Cash on Delivery.</strong></li>
            <li>An order is confirmed only after we receive a successful payment confirmation from Razorpay.</li>
            <li>If a price is displayed incorrectly due to a system or pricing error we may cancel the order and refund the full amount.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-on-background mb-3">4. Order acceptance &amp; cancellation</h2>
          <p>
            Placing an order is an offer to buy; an order is only accepted by us once payment is
            captured and we send a confirmation. Until then, we may decline an order at our discretion
            (for example, if the item is no longer available, if the address is outside our delivery
            area, or if we suspect fraud). In any such case the full amount is refunded.
          </p>
          <p className="mt-3">
            You may cancel an unshipped order by contacting us within 4 hours of payment. Once an order
            has been packed or handed to the courier, it cannot be cancelled and is governed by our{' '}
            <Link href="/returns" className="text-on-background underline underline-offset-4">Returns Policy</Link>.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-on-background mb-3">5. Delivery &amp; pickup</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>We ship across India through reputed courier partners. Delivery typically takes 3&ndash;7 business days depending on your pincode.</li>
            <li>Delivery is free for orders above ₹2,400; a flat ₹80 fee applies otherwise.</li>
            <li>Customers in Manjeri may choose <strong className="text-on-background">Store Pickup</strong> at no charge &mdash; we&rsquo;ll email you the moment the order is ready to collect.</li>
            <li>We are not responsible for courier-side delays caused by weather, strikes, regional disruptions or incorrect addresses provided at checkout.</li>
          </ul>
          <p className="mt-3">Full details: <Link href="/shipping" className="text-on-background underline underline-offset-4">Shipping &amp; Returns</Link>.</p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-on-background mb-3">6. Returns &amp; refunds</h2>
          <p>
            We accept returns within 7 days of delivery for items that arrive damaged, defective or
            materially different from what was ordered. Custom-stitched, altered, intimate-wear and
            sale items are not eligible for return. Refunds are credited back to the original payment
            method within 5&ndash;10 business days of us receiving and inspecting the returned item.
            Full details: <Link href="/returns" className="text-on-background underline underline-offset-4">Returns Policy</Link>.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-on-background mb-3">7. User accounts</h2>
          <p>
            Adding items to your cart and accessing your profile both require you to sign in. We use
            Google Sign-In so we never see or store your password. You are responsible for keeping
            your Google account secure. We may suspend or close an account that is used to attempt
            fraud, payment-reversal abuse or any unlawful activity.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-on-background mb-3">8. Acceptable use</h2>
          <p>You agree not to:</p>
          <ul className="list-disc pl-6 space-y-2 mt-3">
            <li>Reproduce, copy, scrape, resell or systematically download any portion of the site or product imagery without our written permission.</li>
            <li>Use the site to send spam, malware, or attempt to disrupt service.</li>
            <li>Place fraudulent orders or use payment instruments you are not authorised to use.</li>
            <li>Use the site in any way that violates Indian law or the rights of any third party.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-on-background mb-3">9. Intellectual property</h2>
          <p>
            The Vami Clubwear name, logo, product photography, copy and site design are the property
            of Vami Clubwear and protected by Indian and international copyright and trademark law.
            All rights not expressly granted are reserved.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-on-background mb-3">10. Liability</h2>
          <p>
            To the extent permitted by law, our liability for any claim arising from a purchase is
            limited to the amount paid for the affected item. We are not liable for indirect or
            consequential losses, lost profits or loss of goodwill.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-on-background mb-3">11. Governing law &amp; jurisdiction</h2>
          <p>
            These terms are governed by the laws of India. Any dispute arising out of or in connection
            with these terms is subject to the exclusive jurisdiction of the courts at Manjeri,
            Malappuram, Kerala.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-on-background mb-3">12. Changes</h2>
          <p>
            We may update these terms from time to time. The &ldquo;Last updated&rdquo; date at the top will
            change. Material changes will be communicated through the site. Continued use of the site
            after a change means you accept the updated terms.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-on-background mb-3">13. Contact</h2>
          <div className="border border-border bg-surface p-5 space-y-1.5">
            <p className="text-on-background font-medium">Vami Clubwear</p>
            <p>Manjeri, Malappuram, Kerala &mdash; 676121, India</p>
            <p>
              Email:{' '}
              <a href="mailto:vamiclubwear@gmail.com" className="text-on-background underline underline-offset-4">
                vamiclubwear@gmail.com
              </a>
            </p>
          </div>
        </section>

        <p className="pt-6 text-xs">
          See also our{' '}
          <Link href="/privacy" className="text-on-background underline underline-offset-4">Privacy Policy</Link>,{' '}
          <Link href="/shipping" className="text-on-background underline underline-offset-4">Shipping Policy</Link> and{' '}
          <Link href="/returns" className="text-on-background underline underline-offset-4">Returns Policy</Link>.
        </p>
      </div>
    </div>
  )
}
