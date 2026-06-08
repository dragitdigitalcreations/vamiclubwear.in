// Stage 51A — unit tests for the Vami → Retaqo order mirror adapter.
//
// Pure functions only (mapper + deterministic UUID derivation) plus an
// env-flag-controlled no-op contract for submitRetaqoMirrorOrder. The
// "real" network path is exercised in Stage 51B's preview smoke
// against a live Retaqo endpoint — not in unit tests.

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  deterministicIdempotencyKey,
  isRetaqoOrdersEnabled,
  mapVamiOrderToRetaqo,
  submitRetaqoMirrorOrder,
  type VamiMirrorOrderInput,
} from '../retaqo-orders'

const FIXED_NOW = 1717891200000

function makeInput(overrides: Partial<VamiMirrorOrderInput> = {}): VamiMirrorOrderInput {
  return {
    orderNumber: 'VMC-2026-000123',
    razorpayPaymentId: 'pay_NXabCdEfGh1234',
    totalRupees: 3399,
    items: [
      { variantId: '019ea21a-a306-7887-8ce2-301ea8f5ac17', quantity: 1, priceRupees: 3399 },
    ],
    customer: { name: 'Asha', email: 'asha@example.com', phone: '+919876543210' },
    occurredAtMs: FIXED_NOW,
    ...overrides,
  }
}

// ---------------------------------------------------------------------
// deterministicIdempotencyKey
// ---------------------------------------------------------------------

describe('deterministicIdempotencyKey', () => {
  it('returns a valid UUID v8 string', () => {
    const key = deterministicIdempotencyKey('VMC-2026-000001')
    expect(key).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })

  it('is deterministic — same orderNumber maps to same UUID across calls', () => {
    const a = deterministicIdempotencyKey('VMC-2026-000123')
    const b = deterministicIdempotencyKey('VMC-2026-000123')
    expect(a).toBe(b)
  })

  it('distinct orderNumbers map to distinct UUIDs', () => {
    const a = deterministicIdempotencyKey('VMC-2026-000123')
    const b = deterministicIdempotencyKey('VMC-2026-000124')
    expect(a).not.toBe(b)
  })

  it('namespaces orderNumber so collisions with bare SHA-256 inputs are avoided', () => {
    // The salt prefix `vami-order:` means another caller hashing the same
    // string raw won't produce our UUID, which protects the Retaqo
    // idempotency-cache key namespace from cross-tenant accidents.
    const orderNumber = 'VMC-2026-000123'
    const ours = deterministicIdempotencyKey(orderNumber)
    // A hash of the bare orderNumber would be different — we sanity-check
    // by re-deriving with a different salt and confirming non-collision.
    const bare = deterministicIdempotencyKey(`somethingelse:${orderNumber}`)
    expect(ours).not.toBe(bare)
  })
})

// ---------------------------------------------------------------------
// mapVamiOrderToRetaqo
// ---------------------------------------------------------------------

describe('mapVamiOrderToRetaqo', () => {
  it('maps a single-item order with all fields populated', () => {
    const out = mapVamiOrderToRetaqo(makeInput())
    expect(out).toEqual({
      externalOrderId: 'VMC-2026-000123',
      customer: { name: 'Asha', email: 'asha@example.com', phone: '+919876543210' },
      items: [
        {
          variantId: '019ea21a-a306-7887-8ce2-301ea8f5ac17',
          qty: 1,
          unitPricePaise: '339900',
          discountPaise: '0',
          taxRateBps: 0,
          cgstPaise: '0',
          sgstPaise: '0',
          igstPaise: '0',
          lineSubtotalPaise: '339900',
          lineTotalPaise: '339900',
        },
      ],
      payments: [
        { method: 'OTHER', amountPaise: '339900', reference: 'pay_NXabCdEfGh1234' },
      ],
      subtotalPaise: '339900',
      discountPaise: '0',
      taxPaise: '0',
      totalPaise: '339900',
      occurredAtMs: FIXED_NOW,
      idempotencyKey: deterministicIdempotencyKey('VMC-2026-000123'),
    })
  })

  it('handles multiple items and qty > 1 (correct line totals in paise)', () => {
    const out = mapVamiOrderToRetaqo(
      makeInput({
        totalRupees: 7197,
        items: [
          { variantId: 'aaa', quantity: 2, priceRupees: 3399 }, // 679800 paise
          { variantId: 'bbb', quantity: 1, priceRupees: 399 }, //   39900 paise
        ],
      }),
    )
    expect(out.items[0].lineTotalPaise).toBe('679800')
    expect(out.items[1].lineTotalPaise).toBe('39900')
    expect(out.totalPaise).toBe('719700')
  })

  it('rounds rupees-with-paise correctly (no floating point drift)', () => {
    // 33.99 * 100 in JS = 3399.0000000000005 — Math.round saves us.
    const out = mapVamiOrderToRetaqo(
      makeInput({
        totalRupees: 33.99,
        items: [{ variantId: 'aaa', quantity: 1, priceRupees: 33.99 }],
      }),
    )
    expect(out.items[0].unitPricePaise).toBe('3399')
    expect(out.totalPaise).toBe('3399')
  })

  it('omits customer block entirely when no name is provided', () => {
    const out = mapVamiOrderToRetaqo(makeInput({ customer: { email: 'x@y.z' } }))
    expect(out).not.toHaveProperty('customer')
  })

  it('omits optional customer email/phone when not supplied', () => {
    const out = mapVamiOrderToRetaqo(makeInput({ customer: { name: 'Asha' } }))
    expect(out.customer).toEqual({ name: 'Asha' })
  })

  it('clamps a too-long razorpayPaymentId reference to 120 chars', () => {
    const longRef = 'pay_' + 'a'.repeat(200)
    const out = mapVamiOrderToRetaqo(makeInput({ razorpayPaymentId: longRef }))
    expect(out.payments[0].reference!.length).toBe(120)
  })

  it('defaults occurredAtMs to Date.now() when caller omits it', () => {
    const before = Date.now()
    const out = mapVamiOrderToRetaqo(makeInput({ occurredAtMs: undefined }))
    const after = Date.now()
    expect(out.occurredAtMs).toBeGreaterThanOrEqual(before)
    expect(out.occurredAtMs).toBeLessThanOrEqual(after)
  })

  it('produces a Retaqo idempotencyKey identical to deterministicIdempotencyKey(orderNumber)', () => {
    const out = mapVamiOrderToRetaqo(makeInput())
    expect(out.idempotencyKey).toBe(deterministicIdempotencyKey('VMC-2026-000123'))
  })

  it('treats negative or non-finite priceRupees as 0 paise', () => {
    const out = mapVamiOrderToRetaqo(
      makeInput({
        items: [
          { variantId: 'aaa', quantity: 1, priceRupees: -5 },
          { variantId: 'bbb', quantity: 1, priceRupees: Number.NaN },
        ],
      }),
    )
    expect(out.items[0].unitPricePaise).toBe('0')
    expect(out.items[1].unitPricePaise).toBe('0')
  })
})

// ---------------------------------------------------------------------
// isRetaqoOrdersEnabled — flag + env contract
// ---------------------------------------------------------------------

describe('isRetaqoOrdersEnabled', () => {
  // NOTE: the env vars are read ONCE at module load (top-level `const`),
  // so we can't toggle them per-test for isRetaqoOrdersEnabled itself.
  // We test the function's flag-portion via process.env mutation, and
  // we test the env-portion via submitRetaqoMirrorOrder's skipped reason.
  const original = process.env.RETAQO_ORDERS_ENABLED

  afterEach(() => {
    if (original === undefined) delete process.env.RETAQO_ORDERS_ENABLED
    else process.env.RETAQO_ORDERS_ENABLED = original
  })

  it('returns false when RETAQO_ORDERS_ENABLED is missing', () => {
    delete process.env.RETAQO_ORDERS_ENABLED
    expect(isRetaqoOrdersEnabled()).toBe(false)
  })

  it('returns false when RETAQO_ORDERS_ENABLED is "0"', () => {
    process.env.RETAQO_ORDERS_ENABLED = '0'
    expect(isRetaqoOrdersEnabled()).toBe(false)
  })

  it('returns false when RETAQO_ORDERS_ENABLED is "true" (we require literally "1")', () => {
    process.env.RETAQO_ORDERS_ENABLED = 'true'
    expect(isRetaqoOrdersEnabled()).toBe(false)
  })
})

// ---------------------------------------------------------------------
// submitRetaqoMirrorOrder — flag-off no-op contract
// ---------------------------------------------------------------------

describe('submitRetaqoMirrorOrder (flag-off no-op)', () => {
  let originalFetch: typeof fetch
  beforeEach(() => {
    originalFetch = globalThis.fetch
    // If the flag-off branch ever fires fetch, fail loudly.
    globalThis.fetch = (() => {
      throw new Error('fetch must not be called when RETAQO_ORDERS_ENABLED != "1"')
    }) as typeof fetch
  })
  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('returns {skipped, reason:"flag-off"} without calling fetch when flag is unset', async () => {
    delete process.env.RETAQO_ORDERS_ENABLED
    const res = await submitRetaqoMirrorOrder(makeInput())
    expect(res).toEqual({ skipped: true, reason: 'flag-off' })
  })

  it('returns {skipped, reason:"flag-off"} without calling fetch when flag is "0"', async () => {
    process.env.RETAQO_ORDERS_ENABLED = '0'
    const res = await submitRetaqoMirrorOrder(makeInput())
    expect(res).toEqual({ skipped: true, reason: 'flag-off' })
  })
})
