import type { Metadata } from 'next'

// The contact page itself is a client component, so it cannot export metadata.
// Without this it inherited the root layout's title and canonical, and pointed
// at the homepage — which kept it out of the index entirely.
export const metadata: Metadata = {
  title: 'Contact Us — Manjeri, Kerala',
  description:
    'Get in touch with Vami Clubwear in Manjeri, Malappuram. WhatsApp us on +91 90616 07608 for size help, order queries and store directions, or send a message from this page.',
  alternates: { canonical: '/contact' },
}

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children
}
