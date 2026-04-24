'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, CheckCircle, Loader2, AlertTriangle } from 'lucide-react'
import { returnsApi } from '@/lib/api'
import { toast } from '@/stores/toastStore'

interface ReturnForm {
  orderNumber:   string
  customerName:  string
  customerEmail: string
  customerPhone: string
  description:   string
}

const EMPTY: ReturnForm = {
  orderNumber: '', customerName: '', customerEmail: '',
  customerPhone: '', description: '',
}

export default function ReturnsPage() {
  const [form,        setForm]        = useState<ReturnForm>(EMPTY)
  const [errors,      setErrors]      = useState<Partial<ReturnForm>>({})
  const [submitting,  setSubmitting]  = useState(false)
  const [submitted,   setSubmitted]   = useState<string | null>(null)

  function validate(): boolean {
    const e: Partial<ReturnForm> = {}
    if (!form.orderNumber.trim())   e.orderNumber   = 'Order number is required'
    if (!form.customerName.trim())  e.customerName  = 'Name is required'
    if (!form.customerEmail.trim()) e.customerEmail = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.customerEmail))
      e.customerEmail = 'Enter a valid email'
    if (!form.customerPhone.trim()) e.customerPhone = 'Phone is required'
    if (form.description.trim().length < 10) e.description = 'Please describe the damage (min 10 characters)'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    try {
      const res = await returnsApi.submit(form)
      setSubmitted(res.id)
    } catch (err: any) {
      const msg = err?.message ?? 'Submission failed. Please try again.'
      // Surface order-specific errors on the order-number field for clarity
      if (/order.*not found/i.test(msg) || /order number/i.test(msg)) {
        setErrors(prev => ({ ...prev, orderNumber: msg }))
      } else if (/email or phone/i.test(msg) || /contact details/i.test(msg)) {
        setErrors(prev => ({ ...prev, customerEmail: msg, customerPhone: msg }))
      }
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  function f(key: keyof ReturnForm) {
    return {
      value: form[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm(prev => ({ ...prev, [key]: e.target.value })),
    }
  }

  const inp = (err?: string) =>
    `w-full border ${err ? 'border-red-500' : 'border-border'} bg-transparent px-3 py-2.5 text-sm text-on-background placeholder:text-muted outline-none focus:border-on-background transition-colors`

  if (submitted) {
    return (
      <div className="pt-24 min-h-screen">
        <div className="mx-auto w-full max-w-lg px-4 py-20 flex flex-col items-center text-center gap-6">
          <motion.div
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
          >
            <CheckCircle className="h-16 w-16 text-green-400" />
          </motion.div>
          <h1 className="font-display text-3xl font-bold text-on-background">Request Submitted</h1>
          <p className="text-sm text-muted max-w-sm">
            We've received your damage return request. Our team will review it and contact you
            within 2–3 business days.
          </p>
          <div className="bg-surface border border-border px-6 py-3 w-full">
            <p className="text-xs text-muted uppercase tracking-widest">Reference ID</p>
            <p className="mt-1 font-mono text-sm font-bold text-on-background">{submitted}</p>
          </div>
          <p className="text-xs text-muted">
            Please keep this reference ID and your order number for follow-up.
          </p>
          <Link
            href="/products"
            className="flex w-full items-center justify-center gap-2 bg-primary px-8 py-3.5 text-xs font-semibold uppercase tracking-widest text-white transition-opacity hover:opacity-90"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="pt-24 min-h-screen">

      {/* Page header */}
      <div className="border-b border-border">
        <div className="mx-auto w-full px-4 sm:px-6 md:px-8 lg:px-10">
          <div className="flex items-end gap-5 py-10">
            <Link href="/" className="mb-1 text-muted hover:text-on-background transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <p className="mb-1 t-micro">Support</p>
              <h1 className="t-h1">Return Request</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-2xl px-4 sm:px-6 md:px-8 py-10">

        {/* Notice — light-theme friendly: solid cream-yellow bg + deep amber text for AA contrast */}
        <div className="flex gap-3 bg-[#FFF3D4] border border-[#D79B16] p-4 mb-8 rounded-[4px]">
          <AlertTriangle className="h-4 w-4 text-[#8A5A00] shrink-0 mt-0.5" />
          <p className="text-sm leading-relaxed text-[#4A3100]">
            Returns are accepted only for <strong className="text-[#2A1B00]">damaged goods</strong>.
            Please provide your order number and a clear description of the damage.
            Our team will verify and contact you within 2–3 business days.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">

          {/* Order details */}
          <div className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-on-background">Order Details</h2>
            <div>
              <input
                {...f('orderNumber')}
                placeholder="Order Number (e.g. VCW-250405-0001) *"
                className={inp(errors.orderNumber)}
              />
              {errors.orderNumber && <p className="mt-1 text-xs text-red-400">{errors.orderNumber}</p>}
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-on-background">Your Contact</h2>
            <div>
              <input {...f('customerName')} placeholder="Full Name *" className={inp(errors.customerName)} />
              {errors.customerName && <p className="mt-1 text-xs text-red-400">{errors.customerName}</p>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <input {...f('customerPhone')} type="tel" placeholder="Phone *" className={inp(errors.customerPhone)} />
                {errors.customerPhone && <p className="mt-1 text-xs text-red-400">{errors.customerPhone}</p>}
              </div>
              <div>
                <input {...f('customerEmail')} type="email" placeholder="Email *" className={inp(errors.customerEmail)} />
                {errors.customerEmail && <p className="mt-1 text-xs text-red-400">{errors.customerEmail}</p>}
              </div>
            </div>
          </div>

          {/* Damage description */}
          <div className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-on-background">Damage Description</h2>
            <div>
              <textarea
                {...f('description')}
                rows={5}
                placeholder="Describe the damage in detail — what is damaged, how it arrived, etc. *"
                className={`w-full border ${errors.description ? 'border-red-500' : 'border-border'} bg-transparent px-3 py-2.5 text-sm text-on-background placeholder:text-muted outline-none focus:border-on-background transition-colors resize-none`}
              />
              {errors.description && <p className="mt-1 text-xs text-red-400">{errors.description}</p>}
              <p className="mt-1 text-[11px] text-muted">{form.description.length} / 2000 characters</p>
            </div>
          </div>

          <div className="pb-10">
            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 bg-primary py-4 text-sm font-semibold uppercase tracking-widest text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? (
                <><Loader2 className="h-4 w-4 animate-spin" />Submitting…</>
              ) : (
                'Submit Return Request'
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}
