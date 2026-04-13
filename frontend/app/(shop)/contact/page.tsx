'use client'

import { useState } from 'react'
import { MapPin, Phone, Mail, Clock, CheckCircle } from 'lucide-react'

export default function ContactPage() {
  const [form, setForm]       = useState({ name: '', email: '', phone: '', message: '' })
  const [sent, setSent]       = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.message) return
    setLoading(true)
    // Fire-and-forget WhatsApp deep link or email (no backend needed for a simple contact form)
    // In production connect to an email endpoint; for now show success
    await new Promise(r => setTimeout(r, 600))
    setSent(true)
    setLoading(false)
  }

  if (sent) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 pt-20 text-center">
        <CheckCircle className="h-14 w-14 text-green-400" />
        <h1 className="font-display text-3xl font-bold text-on-background">Message Received!</h1>
        <p className="text-muted max-w-sm text-sm">
          Thank you for reaching out. We'll get back to you within 24 hours.
        </p>
        <button
          onClick={() => { setSent(false); setForm({ name: '', email: '', phone: '', message: '' }) }}
          className="mt-2 text-xs font-medium uppercase tracking-widest text-muted underline underline-offset-4 hover:text-on-background transition-colors"
        >
          Send another message
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pt-32 pb-10 md:px-8">
      <div className="mb-12">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-primary-light mb-4">Get In Touch</p>
        <h1 className="font-display text-4xl font-bold text-on-background md:text-5xl">Contact Us</h1>
      </div>

      <div className="grid grid-cols-1 gap-16 lg:grid-cols-2">

        {/* Contact form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-medium uppercase tracking-widest text-muted mb-1.5">
              Your Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Full name"
              required
              className="w-full border border-border bg-transparent px-3 py-2.5 text-sm text-on-background placeholder:text-muted outline-none focus:border-on-background transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-medium uppercase tracking-widest text-muted mb-1.5">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="your@email.com"
              className="w-full border border-border bg-transparent px-3 py-2.5 text-sm text-on-background placeholder:text-muted outline-none focus:border-on-background transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-medium uppercase tracking-widest text-muted mb-1.5">Phone</label>
            <input
              type="tel"
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="+91 98765 43210"
              className="w-full border border-border bg-transparent px-3 py-2.5 text-sm text-on-background placeholder:text-muted outline-none focus:border-on-background transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-medium uppercase tracking-widest text-muted mb-1.5">
              Message <span className="text-red-400">*</span>
            </label>
            <textarea
              rows={5}
              value={form.message}
              onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
              placeholder="How can we help you?"
              required
              className="w-full border border-border bg-transparent px-3 py-2.5 text-sm text-on-background placeholder:text-muted outline-none focus:border-on-background transition-colors resize-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary py-3.5 text-xs font-semibold uppercase tracking-widest text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Sending…' : 'Send Message'}
          </button>
        </form>

        {/* Info */}
        <div className="space-y-8">
          {[
            { Icon: MapPin, title: 'Visit Us',     body: 'Vami Clubwear\nManjeri, Malappuram\nKerala — 676121' },
            { Icon: Phone,  title: 'Call / WhatsApp', body: '+91 XXXXX XXXXX' },
            { Icon: Mail,   title: 'Email',        body: 'hello@vamiclubwear.in' },
            { Icon: Clock,  title: 'Working Hours', body: 'Mon – Sat: 10 AM – 7 PM\nSunday: 11 AM – 5 PM' },
          ].map(({ Icon, title, body }) => (
            <div key={title} className="flex gap-4">
              <div className="flex-shrink-0 mt-0.5">
                <div className="flex h-8 w-8 items-center justify-center bg-primary/10">
                  <Icon className="h-4 w-4 text-primary-light" />
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-on-background mb-1">{title}</p>
                {body.split('\n').map((line, i) => (
                  <p key={i} className="text-sm text-muted">{line}</p>
                ))}
              </div>
            </div>
          ))}

          <div className="border-t border-border pt-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-on-background mb-3">Quick Response</p>
            <a
              href="https://wa.me/91XXXXXXXXXX?text=Hi%20Vami%20Clubwear%2C%20I%20have%20a%20query"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border border-green-600/40 bg-green-600/10 px-4 py-2.5 text-xs font-medium text-green-400 hover:bg-green-600/20 transition-colors"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Chat on WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
