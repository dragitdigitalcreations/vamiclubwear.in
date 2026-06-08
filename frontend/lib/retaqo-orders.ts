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

// Stage 51A.1 — env vars read at call-time (not module-load) so test
// overrides via process.env mutation behave intuitively. The cost is a
// few extra process.env lookups per request, which is negligible
// compared to the network calls involved.
function retaqoApiUrl(): string {
  return process.env.RETAQO_API_URL ?? ''
}
function retaqoApiKey(): string {
  return process.env.RETAQO_ECOMMERCE_API_KEY ?? ''
}

export function isRetaqoOrdersEnabled(): boolean {
  return (
    process.env.RETAQO_ORDERS_ENABLED === '1' &&
    retaqoApiUrl().length > 0 &&
    retaqoApiKey().length > 0
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
// Stage 51A.1 — server-side verification against Vami's authoritative
// order endpoint. The mirror route accepts client-supplied payload but
// trusts NOTHING on its face — every field worth caring about (order
// exists, total, item-count, item lines) is re-checked against Vami's
// own backend by orderNumber before the mirror fires.
//
// Defence model:
//   - An attacker who guesses or steals a real orderNumber CAN trigger
//     a mirror of that real order, but the mirror would use the same
//     real data Vami already has — no new false rows in Retaqo.
//   - An attacker who fabricates an orderNumber gets a 200 with
//     {skipped: true, reason: 'vami-not-found'} — no Retaqo call.
//   - An attacker who spoofs total / item-count / line breakdown for a
//     real orderNumber gets {skipped, reason: '<which-check>-mismatch'}
//     — no Retaqo call. They would need to know the exact qty/price
//     breakdown of the real order to pass; even then the mirror would
//     reproduce the real order.
//   - The browser-visible "shared secret" anti-pattern is deliberately
//     not used — Stage 51A.1's note `do-not-put-secrets-in-the-browser`.
// ---------------------------------------------------------------------

interface VamiOrderItemAuthoritative {
  readonly quantity: number
  readonly unitPrice: number
  // SKU + variant identifiers — Vami's public endpoint does not expose
  // variantId on items, so the mirror trusts the client's variantId by
  // necessity and uses the (qty, unitPrice) pair to confirm the line
  // belongs to this order.
  readonly variant: {
    readonly sku: string
    readonly size: string | null
    readonly color: string | null
  }
}

interface VamiOrderAuthoritative {
  readonly orderNumber: string
  readonly total: number
  readonly customerName: string | null
  readonly customerEmail: string | null
  readonly customerPhone: string | null
  readonly items: ReadonlyArray<VamiOrderItemAuthoritative>
}

/**
 * Fetch the authoritative order record straight from Vami's backend.
 * Returns null when the order is missing, the backend is unreachable,
 * or the response shape is unrecognisable. Never throws — the caller
 * (`POST /api/internal/retaqo-mirror-order`) decides what to do with
 * a null result.
 */
export async function fetchVamiOrder(orderNumber: string): Promise<VamiOrderAuthoritative | null> {
  const base = process.env.NEXT_PUBLIC_API_URL
  if (!base || base.length === 0) {
    console.error('[retaqo-orders] NEXT_PUBLIC_API_URL not set; cannot verify orderNumber against Vami backend')
    return null
  }
  const url = `${base.replace(/\/$/, '')}/api/public/orders/${encodeURIComponent(orderNumber)}`
  // Hard timeout — Vami backend slowness must not pin the fire-and-
  // forget mirror route. 5s is generous for an indexed primary-key
  // lookup on the orders table.
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), 5_000)
  try {
    const res = await fetch(url, {
      headers: { 'content-type': 'application/json' },
      cache: 'no-store',
      signal: controller.signal,
    })
    if (res.status === 404) return null
    if (!res.ok) {
      console.error(`[retaqo-orders] vami order lookup failed status=${res.status} orderNumber=${orderNumber}`)
      return null
    }
    const body = (await res.json().catch(() => null)) as VamiOrderAuthoritative | null
    if (!body || typeof body !== 'object') return null
    if (body.orderNumber !== orderNumber) return null
    if (!Array.isArray(body.items)) return null
    return body
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[retaqo-orders] vami order lookup err orderNumber=${orderNumber} ${msg}`)
    return null
  } finally {
    clearTimeout(t)
  }
}

// ---------------------------------------------------------------------
// Verification — compare the client-supplied mirror payload against the
// authoritative Vami order. Pure function so it's easy to test.
// ---------------------------------------------------------------------

export type VerifyResult =
  | { ok: true }
  | { ok: false; reason: VerifyFailReason }

export type VerifyFailReason =
  | 'total-mismatch'
  | 'item-count-mismatch'
  | 'line-mismatch'

export function verifyMirrorAgainstVami(
  input: VamiMirrorOrderInput,
  vami: VamiOrderAuthoritative,
): VerifyResult {
  // Compare totals in paise to sidestep float-equality. Allow ±1 paise
  // for rounding (Vami's `total` is stored as rupees-as-number which
  // can introduce a single-paise drift on certain orders).
  const inputPaise = rupeesToPaise(input.totalRupees)
  const vamiPaise = rupeesToPaise(vami.total)
  const diff = inputPaise > vamiPaise ? inputPaise - vamiPaise : vamiPaise - inputPaise
  if (diff > BigInt(1)) {
    return { ok: false, reason: 'total-mismatch' }
  }

  if (input.items.length !== vami.items.length) {
    return { ok: false, reason: 'item-count-mismatch' }
  }

  // Match each client item to a Vami item by (qty, unitPricePaise) pair.
  // Mark Vami items as consumed so duplicates can't be over-claimed.
  const consumed = new Array<boolean>(vami.items.length).fill(false)
  for (const item of input.items) {
    const itemPaise = rupeesToPaise(item.priceRupees)
    const idx = vami.items.findIndex((v, i) => {
      if (consumed[i]) return false
      if (v.quantity !== item.quantity) return false
      const vp = rupeesToPaise(v.unitPrice)
      return vp === itemPaise
    })
    if (idx < 0) return { ok: false, reason: 'line-mismatch' }
    consumed[idx] = true
  }

  return { ok: true }
}

// ---------------------------------------------------------------------
// Server-only fetch caller
// ---------------------------------------------------------------------

export type RetaqoMirrorResult =
  | { ok: true; status: 'created' | 'replayed'; retaqoSaleId?: string }
  | { ok: false; status: number | 'network'; error: string }
  | {
      skipped: true
      reason:
        | 'flag-off'
        | 'env-incomplete'
        | 'vami-not-found'
        | 'total-mismatch'
        | 'item-count-mismatch'
        | 'line-mismatch'
    }

/**
 * Stage 51A.1 — full orchestration entry-point used by the route
 * handler. Checks the flag, verifies the order against Vami's backend,
 * then mirrors to Retaqo. Returns a verdict the handler can log /
 * return verbatim. Never throws.
 *
 * The route handler is intentionally thin — all decision logic lives
 * here so it's unit-testable with a mocked `fetch`.
 */
export async function processMirrorRequest(
  input: VamiMirrorOrderInput,
): Promise<RetaqoMirrorResult> {
  if (process.env.RETAQO_ORDERS_ENABLED !== '1') {
    return { skipped: true, reason: 'flag-off' }
  }
  if (retaqoApiUrl().length === 0 || retaqoApiKey().length === 0) {
    return { skipped: true, reason: 'env-incomplete' }
  }

  // Trust anchor: the orderNumber MUST resolve to a real Vami order.
  const vami = await fetchVamiOrder(input.orderNumber)
  if (!vami) {
    console.warn(
      `[retaqo-orders] mirror skipped — orderNumber not found in Vami orderNumber=${input.orderNumber}`,
    )
    return { skipped: true, reason: 'vami-not-found' }
  }

  // Defence in depth: the client-supplied totals + line breakdown must
  // match the authoritative Vami order. Mismatch = potential spoof,
  // reject without calling Retaqo.
  const verify = verifyMirrorAgainstVami(input, vami)
  if (!verify.ok) {
    console.warn(
      `[retaqo-orders] mirror skipped — ${verify.reason} orderNumber=${input.orderNumber}`,
    )
    return { skipped: true, reason: verify.reason }
  }

  // Reconstruct the input from Vami's authoritative customer fields so
  // a spoofed name/email/phone never reaches Retaqo. variantId and
  // priceRupees stay from the client (the verify step proved they
  // describe the real order's lines).
  const safeInput: VamiMirrorOrderInput = {
    ...input,
    totalRupees: vami.total,
    customer: {
      name: vami.customerName ?? input.customer?.name,
      email: vami.customerEmail ?? input.customer?.email,
      phone: vami.customerPhone ?? input.customer?.phone,
    },
  }

  return submitRetaqoMirrorOrder(safeInput)
}

export async function submitRetaqoMirrorOrder(
  input: VamiMirrorOrderInput,
): Promise<RetaqoMirrorResult> {
  if (process.env.RETAQO_ORDERS_ENABLED !== '1') {
    return { skipped: true, reason: 'flag-off' }
  }
  if (retaqoApiUrl().length === 0 || retaqoApiKey().length === 0) {
    return { skipped: true, reason: 'env-incomplete' }
  }

  const payload = mapVamiOrderToRetaqo(input)
  const url = `${retaqoApiUrl().replace(/\/$/, '')}/api/public/ecommerce/orders`

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': retaqoApiKey(),
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
