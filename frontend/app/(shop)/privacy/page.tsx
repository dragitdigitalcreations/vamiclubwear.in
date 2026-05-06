import Link from 'next/link'

export const metadata = {
  title: 'Privacy Policy — Vami Clubwear',
  description:
    'How Vami Clubwear collects, stores and uses your personal data. Compliant with the Digital Personal Data Protection Act, 2023 (DPDP Act).',
  alternates: { canonical: '/privacy' },
}

const LAST_UPDATED = '5 May 2026'

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-32 pb-16 md:px-8">

      <div className="mb-10">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-primary-light mb-4">Legal</p>
        <h1 className="font-display text-4xl font-bold text-on-background md:text-5xl leading-tight">
          Privacy Policy
        </h1>
        <p className="mt-3 text-xs text-muted">Last updated: {LAST_UPDATED}</p>
      </div>

      <div className="space-y-10 text-sm leading-relaxed text-muted">

        <section>
          <p>
            Vami Clubwear (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) operates the website{' '}
            <a href="https://www.vamiclubwear.in" className="text-on-background underline underline-offset-4">vamiclubwear.in</a>{' '}
            and a physical store in Manjeri, Malappuram, Kerala, India. This policy explains what
            personal data we collect, why we collect it, how we use and store it, and the rights you
            have over it. We follow the requirements of India&rsquo;s Digital Personal Data Protection Act,
            2023 (DPDP Act).
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-on-background mb-3">1. Data we collect</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong className="text-on-background">Account &amp; identity:</strong> name, email address, profile picture (when you sign in with Google).</li>
            <li><strong className="text-on-background">Order &amp; delivery:</strong> phone number, delivery address, pincode, city, state, order notes.</li>
            <li><strong className="text-on-background">Payment:</strong> we do <em>not</em> store card numbers, UPI IDs, or net-banking credentials. Payments are processed by Razorpay; we receive only a payment ID and status.</li>
            <li><strong className="text-on-background">Usage:</strong> pages visited, items viewed, basic device and browser information, cookies needed for the cart, sign-in session and basic analytics.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-on-background mb-3">2. How we use your data</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Process, fulfil and ship your orders, including handover to courier partners.</li>
            <li>Communicate order status, delivery updates and replies to your queries by email, SMS or WhatsApp.</li>
            <li>Issue invoices and meet our tax and accounting obligations.</li>
            <li>Prevent fraud, abuse and chargebacks.</li>
            <li>Improve the website &mdash; understand which products and pages are popular.</li>
          </ul>
          <p className="mt-3">
            We do not sell your personal data. We do not use it for advertising profiling beyond the
            basic analytics needed to keep the site working.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-on-background mb-3">3. Who we share data with</h2>
          <p>
            We share the minimum data required with the following processors so we can deliver your order:
          </p>
          <ul className="list-disc pl-6 space-y-2 mt-3">
            <li><strong className="text-on-background">Razorpay</strong> &mdash; payment processing.</li>
            <li><strong className="text-on-background">Courier partners</strong> (e.g. Delhivery, India Post, Shiprocket) &mdash; name, phone, address, pincode for shipping.</li>
            <li><strong className="text-on-background">Google</strong> &mdash; only your basic profile (name, email, picture) when you choose to sign in with Google.</li>
            <li><strong className="text-on-background">WhatsApp Business</strong> &mdash; phone number when you message us via WhatsApp.</li>
          </ul>
          <p className="mt-3">
            We may disclose data when required to comply with Indian law, a court order or a lawful
            request from a government authority.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-on-background mb-3">4. How long we keep it</h2>
          <p>
            Order, invoice and tax records are kept for the period required by Indian tax law
            (currently up to 8 years). Account data is kept while your account is active and is
            deleted (or anonymised) within 90 days of you asking us to close it.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-on-background mb-3">5. Cookies</h2>
          <p>
            We use a small number of essential cookies and browser-storage entries to remember your
            cart, your sign-in session and your saved delivery address. These cannot be disabled
            without breaking core checkout functionality.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-on-background mb-3">6. Your rights under the DPDP Act</h2>
          <p>You have the right to:</p>
          <ul className="list-disc pl-6 space-y-2 mt-3">
            <li>Access the personal data we hold about you.</li>
            <li>Request that we correct, complete or update inaccurate data.</li>
            <li>Request that we erase your data (subject to legal retention obligations).</li>
            <li>Withdraw your consent for any processing that is based on consent.</li>
            <li>Nominate another person to exercise these rights on your behalf.</li>
            <li>File a grievance with us &mdash; we will respond within a reasonable time.</li>
          </ul>
          <p className="mt-3">
            To exercise any of these rights, write to us at the contact address below.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-on-background mb-3">7. Children</h2>
          <p>
            Our products are intended for adult shoppers. We do not knowingly collect personal data
            from anyone under 18. If you believe a minor has shared data with us, please contact us
            and we will delete it.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-on-background mb-3">8. Security</h2>
          <p>
            The website is served over HTTPS. Passwords are not stored &mdash; sign-in is delegated to
            Google OAuth. Database access is restricted to authorised staff. We follow industry
            practice to protect your data, but no internet service can be guaranteed 100% secure.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-on-background mb-3">9. Changes to this policy</h2>
          <p>
            We may update this policy from time to time. The &ldquo;Last updated&rdquo; date at the top will
            change. Material changes will be communicated by email or via a notice on the site.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-on-background mb-3">10. Contact &amp; grievance officer</h2>
          <div className="border border-border bg-surface p-5 space-y-1.5">
            <p className="text-on-background font-medium">Vami Clubwear</p>
            <p>Manjeri, Malappuram, Kerala &mdash; 676121, India</p>
            <p>
              Email:{' '}
              <a href="mailto:vamiclubwear@gmail.com" className="text-on-background underline underline-offset-4">
                vamiclubwear@gmail.com
              </a>
            </p>
            <p>
              For privacy concerns or to exercise your DPDP rights, please use the email address above
              with the subject line &ldquo;DPDP Request&rdquo;.
            </p>
          </div>
        </section>

        <p className="pt-6 text-xs">
          See also our{' '}
          <Link href="/terms" className="text-on-background underline underline-offset-4">Terms &amp; Conditions</Link>,{' '}
          <Link href="/shipping" className="text-on-background underline underline-offset-4">Shipping Policy</Link> and{' '}
          <Link href="/returns" className="text-on-background underline underline-offset-4">Returns Policy</Link>.
        </p>
      </div>
    </div>
  )
}
