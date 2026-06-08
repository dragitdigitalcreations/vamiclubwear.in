// Stage 51A + 51A.1 — internal route handler that mirrors a Vami order
// to Retaqo's POST /api/public/ecommerce/orders. Called fire-and-
// forget from the checkout page after a successful payment-verify.
//
// SECURITY MODEL (Stage 51A.1):
//
// The route is publicly POST-able — there is no browser-shipped shared
// secret because anything sent from browser JS would leak. Instead the
// route uses the **Vami backend itself as the trust anchor**:
//
//   1. Client POSTs the order details it just received from Razorpay
//      verify (`{orderNumber, razorpayPaymentId, items, totalRupees, …}`).
//   2. `processMirrorRequest` calls Vami's `GET /api/public/orders/{n}`
//      server-side. Unknown orderNumber → skip with `vami-not-found`.
//   3. The authoritative Vami order's `total` + `items[].(qty,unitPrice)`
//      are compared to the request. Any mismatch → skip with
//      `total-mismatch` / `item-count-mismatch` / `line-mismatch`.
//   4. Customer name/email/phone are overwritten with Vami's values so
//      a spoofed payload can't poison Retaqo's customer record.
//   5. Only then does Retaqo's mirror endpoint get called, with a
//      deterministic UUIDv8 idempotency key derived from orderNumber.
//
// An attacker who fakes an orderNumber gets a 200 with
// {skipped: true, reason: 'vami-not-found'} — no Retaqo call, no DB
// row. An attacker who knows a REAL orderNumber but spoofs amounts/
// items gets {skipped, reason: '<which>-mismatch'}.
//
// Soft defence (logged, not enforced): origin/referer is recorded so
// suspicious traffic patterns surface in server logs.
//
// Always returns 200 so the storefront's fire-and-forget caller never
// sees a route-level failure — the verdict payload carries the real
// outcome for log inspection.

import { NextRequest, NextResponse } from 'next/server'
import { processMirrorRequest, type VamiMirrorOrderInput } from '@/lib/retaqo-orders'

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
  // Soft defence — log the origin so unusual traffic shows up.
  // Same-origin checkout fire-and-forget POSTs include this header;
  // an external caller posting via curl/Postman wouldn't, which is
  // the signal we want to spot in `vercel logs`.
  const origin = req.headers.get('origin') ?? req.headers.get('referer') ?? '(none)'

  let body: unknown
  try {
    body = await req.json()
  } catch {
    console.warn(`[retaqo-orders] mirror rejected — invalid json origin=${origin}`)
    return NextResponse.json({ skipped: true, reason: 'invalid-json' }, { status: 200 })
  }
  if (!isMirrorOrderInput(body)) {
    console.warn(`[retaqo-orders] mirror rejected — invalid payload shape origin=${origin}`)
    return NextResponse.json({ skipped: true, reason: 'invalid-payload' }, { status: 200 })
  }

  console.log(
    `[retaqo-orders] mirror request received orderNumber=${body.orderNumber} origin=${origin}`,
  )
  const result = await processMirrorRequest(body)
  return NextResponse.json(result, { status: 200 })
}
