// Stage 51A — Retaqo orders mirror (server-only).
//
// Architectural choice: Vami's checkout flow stays the SOURCE OF TRUTH.
// After a successful Razorpay payment-verify on Vami's backend creates
// the customer-facing Order, the storefront fire-and-forgets a request
// to a Next.js Route Handler (/api/internal/retaqo-mirror-order) which
// mirrors the order to Retaqo's POST /api/public/ecommerce/orders for
// downstream POS / inventory sync.
//
// Why mirror instead of primary write:
//   - Vami's order materialises inside the payment-verify endpoint —
//     replacing that with a Retaqo-direct write would require touching
//     the live money path, which is the highest-blast-radius change in
//     the project. Mirroring keeps the customer UX byte-identical and
//     lets us validate Retaqo on real production data without risk.
//   - The mirror failure path is "log it" — the customer's payment is
//     already verified and their order already exists in Vami; the
//     mirror lagging or erroring never affects the shopper.
//
// Server-only: this file MUST NOT be imported from a client component.
// Only the Route Handler at app/api/internal/retaqo-mirror-order/route.ts
// imports it, and that handler is automatically server-only by Next.js
// convention. RETAQO_ECOMMERCE_API_KEY is read from server env and never
// reaches the browser.

import { createHash } from 'node:crypto'

const RETAQO_API_URL = process.env.RETAQO_API_URL ?? ''
const RETAQO_ECOMMERCE_API_KEY = process.env.RETAQO_ECOMMERCE_API_KEY ?? ''

export function isRetaqoOrdersEnabled(): boolean {
  return (
    process.env.RETAQO_ORDERS_ENABLED === '1' &&
    RETAQO_API_URL.length > 0 &&
    RETAQO_ECOMMERCE_API_KEY.length > 0
  )
}

// ---------------------------------------------------------------------
// Input shape — exactly what the storefront has at the moment it fires
// the mirror request, after Razorpay verify returns success.
// ---------------------------------------------------------------------

export interface VamiMirrorOrderItem {
  /** Vami's variantId — must match a Retaqo ProductVariant.id. */
  readonly variantId: string
  readonly quantity: number
  /** Per-unit price the customer saw, in rupees. */
  readonly priceRupees: number
}

export interface VamiMirrorOrderInput {
  /** Vami's customer-facing order number — used for externalOrderId + idempotency. */
  readonly orderNumber: string
  /** Razorpay paymentId. Sent as payment reference. */
  readonly razorpayPaymentId: string
  readonly items: ReadonlyArray<VamiMirrorOrderItem>
  /** Grand total the customer paid, in rupees. */
  readonly totalRupees: number
  readonly customer?: {
    readonly name?: string
    readonly email?: string
    readonly phone?: string
  }
  /** ms-since-epoch of the order; defaults to Date.now() */
  readonly occurredAtMs?: number
}

// ---------------------------------------------------------------------
// Retaqo wire shape — mirrors `zEcomSaleCreate` from
// packages/validators/src/sale.ts. Monetary values are strings of paise
// (BigInt-safe over the wire).
// ---------------------------------------------------------------------

interface RetaqoSaleItem {
  variantId: string
  qty: number
  unitPricePaise: string
  discountPaise: string
  taxRateBps: number
  cgstPaise: string
  sgstPaise: string
  igstPaise: string
  lineSubtotalPaise: string
  lineTotalPaise: string
}

interface RetaqoPayment {
  method: 'CASH' | 'UPI' | 'CARD' | 'WALLET' | 'STORE_CREDIT' | 'OTHER'
  amountPaise: string
  reference?: string
}

export interface RetaqoSaleCreatePayload {
  externalOrderId: string
  customer?: { name: string; email?: string; phone?: string }
  items: RetaqoSaleItem[]
  payments: RetaqoPayment[]
  subtotalPaise: string
  discountPaise: string
  taxPaise: string
  totalPaise: string
  occurredAtMs: number
  idempotencyKey: string
}

// ---------------------------------------------------------------------
// Deterministic idempotency key
// ---------------------------------------------------------------------
//
// Retaqo's zIdempotencyKey requires a UUID string. Same Vami order
// retried twice (network flake, mirror retry, etc.) must produce the
// SAME UUID so Retaqo's idempotency interceptor replays the cached
// response instead of creating a duplicate sale.
//
// SHA-256 of `vami-order:<orderNumber>` → reshape into UUIDv8 format.
// UUIDv8 (RFC 9562) is the "custom UUID" version — accepts any 122
// bits of payload as long as version + variant bits are pinned. Retaqo
// validates with `z.string().uuid()` which accepts any version.
export function deterministicIdempotencyKey(orderNumber: string): string {
  const hex = createHash('sha256').update(`vami-order:${orderNumber}`).digest('hex')
  const a = hex.slice(0, 8)
  const b = hex.slice(8, 12)
  // Version nibble = 8; carry the remaining 12 bits of payload.
  const c = '8' + hex.slice(13, 16)
  // Variant bits: top 2 bits = 10. Mask the first nibble of byte[8..10].
  const variantByte = ((parseInt(hex.slice(16, 18), 16) & 0x3f) | 0x80)
    .toString(16)
    .padStart(2, '0')
  const d = variantByte + hex.slice(18, 20)
  const e = hex.slice(20, 32)
  return `${a}-${b}-${c}-${d}-${e}`
}

// ---------------------------------------------------------------------
// Pure mapper — Vami input → Retaqo wire payload
// ---------------------------------------------------------------------
//
// Retaqo's ecommerce.service.ts `recomputeTotals` (Stage 21) recomputes
// every monetary field server-side from authoritative ProductVariant
// data; the client-supplied prices and tax splits are validated for
// shape only and then overwritten. We still send sensible non-zero
// totals so the request passes the zod validator AND so an operator
// reading Retaqo logs sees roughly the customer-facing amount.
//
// Tax fields are sent as 0 / taxRateBps=0 because we don't know the
// per-variant tax rate from the storefront cart. Retaqo will recompute
// them from ProductVariant.taxRateBps.

export function mapVamiOrderToRetaqo(input: VamiMirrorOrderInput): RetaqoSaleCreatePayload {
  const occurredAtMs = input.occurredAtMs ?? Date.now()

  const items: RetaqoSaleItem[] = input.items.map((item) => {
    const unitPaise = rupeesToPaise(item.priceRupees)
    const lineTotal = unitPaise * BigInt(item.quantity)
    return {
      variantId: item.variantId,
      qty: item.quantity,
      unitPricePaise: unitPaise.toString(),
      discountPaise: '0',
      taxRateBps: 0,
      cgstPaise: '0',
      sgstPaise: '0',
      igstPaise: '0',
      lineSubtotalPaise: lineTotal.toString(),
      lineTotalPaise: lineTotal.toString(),
    }
  })

  const totalPaise = rupeesToPaise(input.totalRupees).toString()

  return {
    externalOrderId: input.orderNumber,
    ...(input.customer?.name
      ? {
          customer: {
            name: input.customer.name,
            ...(input.customer.email ? { email: input.customer.email } : {}),
            ...(input.customer.phone ? { phone: input.customer.phone } : {}),
          },
        }
      : {}),
    items,
    payments: [
      {
        method: 'OTHER', // Razorpay aggregates cards/UPI/netbanking under one rail
        amountPaise: totalPaise,
        reference: input.razorpayPaymentId.slice(0, 120),
      },
    ],
    subtotalPaise: totalPaise,
    discountPaise: '0',
    taxPaise: '0',
    totalPaise,
    occurredAtMs,
    idempotencyKey: deterministicIdempotencyKey(input.orderNumber),
  }
}

function rupeesToPaise(rupees: number): bigint {
  // BigInt(0) instead of 0n to stay compatible with the Vami tsconfig
  // target (ES2017 / ESNext-light); the runtime requirement is Node 20+
  // which has BigInt regardless of TS literal availability.
  if (!Number.isFinite(rupees) || rupees < 0) return BigInt(0)
  // 1 rupee = 100 paise. Round to handle floating-point storage artefacts
  // (e.g. 33.99 * 100 = 3399.0000000000005 in JS).
  return BigInt(Math.round(rupees * 100))
}

// ---------------------------------------------------------------------
// Server-only fetch caller
// ---------------------------------------------------------------------

export type RetaqoMirrorResult =
  | { ok: true; status: 'created' | 'replayed'; retaqoSaleId?: string }
  | { ok: false; status: number | 'network'; error: string }
  | { skipped: true; reason: 'flag-off' | 'env-incomplete' }

export async function submitRetaqoMirrorOrder(
  input: VamiMirrorOrderInput,
): Promise<RetaqoMirrorResult> {
  if (process.env.RETAQO_ORDERS_ENABLED !== '1') {
    return { skipped: true, reason: 'flag-off' }
  }
  if (RETAQO_API_URL.length === 0 || RETAQO_ECOMMERCE_API_KEY.length === 0) {
    return { skipped: true, reason: 'env-incomplete' }
  }

  const payload = mapVamiOrderToRetaqo(input)
  const url = `${RETAQO_API_URL.replace(/\/$/, '')}/api/public/ecommerce/orders`

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': RETAQO_ECOMMERCE_API_KEY,
        // Retaqo Stage 21 requires X-Idempotency-Key in addition to
        // body.idempotencyKey. Send the same UUID for both so a replay
        // hits the cached interceptor response and never touches the DB.
        'x-idempotency-key': payload.idempotencyKey,
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    })

    const replayed = res.headers.get('x-idempotent-replay') === '1'

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.error(
        `[retaqo-orders] mirror failed orderNumber=${input.orderNumber} status=${res.status} body=${body.slice(0, 400)}`,
      )
      return { ok: false, status: res.status, error: body.slice(0, 400) || res.statusText }
    }

    const body = (await res.json().catch(() => ({}))) as { saleId?: string }
    console.log(
      `[retaqo-orders] mirror ok orderNumber=${input.orderNumber} saleId=${body.saleId ?? '?'} replayed=${replayed}`,
    )
    return { ok: true, status: replayed ? 'replayed' : 'created', retaqoSaleId: body.saleId }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[retaqo-orders] mirror network err orderNumber=${input.orderNumber} ${msg}`)
    return { ok: false, status: 'network', error: msg }
  }
}
