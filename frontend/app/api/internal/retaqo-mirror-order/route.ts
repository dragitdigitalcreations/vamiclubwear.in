// Stage 51A — internal route handler that mirrors a Vami order to
// Retaqo's POST /api/public/ecommerce/orders. Called fire-and-forget
// from the checkout page after a successful payment-verify.
//
// SECURITY:
// - This route lives under /api/internal/* and is only meant to be hit
//   by Vami's own checkout page after Razorpay verifies. There is no
//   auth check because the route is a back-channel within our own
//   storefront origin; an attacker calling it directly would only be
//   triggering Retaqo's idempotency cache (no DB writes when the
//   payload's externalOrderId doesn't correspond to a real order — but
//   this could create junk rows in Retaqo).
// - For Stage 51A this is acceptable because the route is OFF by default
//   (RETAQO_ORDERS_ENABLED=0). When Stage 51C flips it on, consider
//   adding a shared-secret header check between checkout and this
//   route to harden it further.
// - RETAQO_ECOMMERCE_API_KEY is read inside submitRetaqoMirrorOrder
//   from server env only and never reaches the browser.

import { NextRequest, NextResponse } from 'next/server'
import { submitRetaqoMirrorOrder, type VamiMirrorOrderInput } from '@/lib/retaqo-orders'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function isMirrorOrderInput(b: unknown): b is VamiMirrorOrderInput {
  if (!b || typeof b !== 'object') return false
  const x = b as Record<string, unknown>
  if (typeof x.orderNumber !== 'string' || x.orderNumber.length === 0) return false
  if (typeof x.razorpayPaymentId !== 'string' || x.razorpayPaymentId.length === 0) return false
  if (typeof x.totalRupees !== 'number' || !Number.isFinite(x.totalRupees)) return false
  if (!Array.isArray(x.items) || x.items.length === 0) return false
  for (const item of x.items) {
    if (!item || typeof item !== 'object') return false
    const i = item as Record<string, unknown>
    if (typeof i.variantId !== 'string' || i.variantId.length === 0) return false
    if (typeof i.quantity !== 'number' || !Number.isInteger(i.quantity) || i.quantity <= 0) {
      return false
    }
    if (typeof i.priceRupees !== 'number' || !Number.isFinite(i.priceRupees)) return false
  }
  return true
}

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }
  if (!isMirrorOrderInput(body)) {
    return NextResponse.json({ error: 'invalid mirror payload' }, { status: 400 })
  }

  const result = await submitRetaqoMirrorOrder(body)
  // Always return 200 so the checkout fire-and-forget doesn't have to
  // worry about route-level failures — the result payload carries the
  // skipped/ok/error verdict for log inspection.
  return NextResponse.json(result, { status: 200 })
}
