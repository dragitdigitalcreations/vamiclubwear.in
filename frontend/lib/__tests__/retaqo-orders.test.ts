// Stage 51A — unit tests for the Vami → Retaqo order mirror adapter.
//
// Pure functions only (mapper + deterministic UUID derivation) plus an
// env-flag-controlled no-op contract for submitRetaqoMirrorOrder. The
// "real" network path is exercised in Stage 51B's preview smoke
// against a live Retaqo endpoint — not in unit tests.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  deterministicIdempotencyKey,
  isRetaqoOrdersEnabled,
  mapVamiOrderToRetaqo,
  processMirrorRequest,
  submitRetaqoMirrorOrder,
  verifyMirrorAgainstVami,
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

// ---------------------------------------------------------------------
// Stage 51A.1 — verifyMirrorAgainstVami (pure function)
// ---------------------------------------------------------------------

function vamiOrder(overrides: Record<string, unknown> = {}) {
  return {
    orderNumber: 'VMC-2026-000123',
    total: 3399,
    customerName: 'Asha',
    customerEmail: 'asha@example.com',
    customerPhone: '+919876543210',
    items: [{ quantity: 1, unitPrice: 3399, variant: { sku: 'ANK-M', size: 'M', color: null } }],
    ...overrides,
  } as Parameters<typeof verifyMirrorAgainstVami>[1]
}

describe('verifyMirrorAgainstVami', () => {
  it('passes when client + Vami totals + items match exactly', () => {
    expect(verifyMirrorAgainstVami(makeInput(), vamiOrder())).toEqual({ ok: true })
  })

  it('tolerates a ±1 paise drift on total (rupees-as-Number rounding)', () => {
    const input = makeInput({ totalRupees: 3399.01 }) // 339901 paise vs Vami 339900
    expect(verifyMirrorAgainstVami(input, vamiOrder())).toEqual({ ok: true })
  })

  it('rejects total-mismatch when drift exceeds 1 paise', () => {
    const input = makeInput({ totalRupees: 3500 }) // 11000 paise off
    expect(verifyMirrorAgainstVami(input, vamiOrder())).toEqual({
      ok: false,
      reason: 'total-mismatch',
    })
  })

  it('rejects item-count-mismatch when item array sizes differ', () => {
    const input = makeInput({
      items: [
        { variantId: 'aaa', quantity: 1, priceRupees: 1000 },
        { variantId: 'bbb', quantity: 1, priceRupees: 2399 },
      ],
      totalRupees: 3399,
    })
    expect(verifyMirrorAgainstVami(input, vamiOrder())).toEqual({
      ok: false,
      reason: 'item-count-mismatch',
    })
  })

  it('rejects line-mismatch when (qty, unitPrice) does not match a Vami line', () => {
    // Client claims qty=2 @ 1700 (totals to 3400 ≈ 3399 within tolerance via total
    // but the per-line pair is not in Vami's order).
    const input = makeInput({
      items: [{ variantId: 'aaa', quantity: 2, priceRupees: 1700 }],
      totalRupees: 3400,
    })
    const v = vamiOrder({ total: 3400 })
    expect(verifyMirrorAgainstVami(input, v)).toEqual({ ok: false, reason: 'line-mismatch' })
  })

  it('handles multi-item orders correctly when client lines match Vami lines in any order', () => {
    const v = vamiOrder({
      total: 7197,
      items: [
        { quantity: 1, unitPrice: 3399, variant: { sku: 'A', size: 'M', color: null } },
        { quantity: 1, unitPrice: 399, variant: { sku: 'B', size: 'M', color: null } },
        { quantity: 1, unitPrice: 3399, variant: { sku: 'C', size: 'M', color: null } },
      ],
    })
    const input = makeInput({
      totalRupees: 7197,
      items: [
        // intentionally out-of-order vs Vami
        { variantId: 'x', quantity: 1, priceRupees: 399 },
        { variantId: 'y', quantity: 1, priceRupees: 3399 },
        { variantId: 'z', quantity: 1, priceRupees: 3399 },
      ],
    })
    expect(verifyMirrorAgainstVami(input, v)).toEqual({ ok: true })
  })

  it('prevents over-claiming a single Vami line for multiple client lines', () => {
    // Vami has ONE line qty=1 @ 3399. Client tries to claim THAT line twice.
    const v = vamiOrder({
      total: 6798,
      items: [{ quantity: 1, unitPrice: 3399, variant: { sku: 'A', size: 'M', color: null } }],
    })
    const input = makeInput({
      totalRupees: 6798,
      items: [
        { variantId: 'x', quantity: 1, priceRupees: 3399 },
        { variantId: 'y', quantity: 1, priceRupees: 3399 },
      ],
    })
    expect(verifyMirrorAgainstVami(input, v)).toEqual({
      ok: false,
      reason: 'item-count-mismatch',
    })
  })
})

// ---------------------------------------------------------------------
// Stage 51A.1 — processMirrorRequest end-to-end with mocked fetch
// ---------------------------------------------------------------------

describe('processMirrorRequest (orchestration with mocked Vami + Retaqo)', () => {
  let originalFetch: typeof fetch
  let calls: Array<{ url: string; init?: RequestInit }>

  beforeEach(() => {
    originalFetch = globalThis.fetch
    calls = []
    // Env required for the env-incomplete check not to short-circuit. Note:
    // the lib reads RETAQO_API_URL + RETAQO_ECOMMERCE_API_KEY at module
    // load (top-level const) so the values seen by processMirrorRequest
    // are whatever was set when the test file was first imported. Vitest
    // imports the module fresh per worker; we set these via the test-env
    // file convention, but to keep this test self-contained we override
    // the env at the start of the suite and rely on `submitRetaqoMirrorOrder`
    // re-reading via the module-level constants — which means env-incomplete
    // is the OBSERVED behaviour today. We assert that path explicitly so
    // future readers know the constraint.
  })
  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  function mockFetch(handlers: Array<(url: string) => Response | undefined>) {
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      const u = typeof url === 'string' ? url : String(url)
      calls.push({ url: u, init })
      for (const h of handlers) {
        const r = h(u)
        if (r) return r
      }
      throw new Error(`unmocked fetch: ${u}`)
    }) as typeof fetch
  }

  it('returns flag-off skipped without any fetch when RETAQO_ORDERS_ENABLED != "1"', async () => {
    process.env.RETAQO_ORDERS_ENABLED = '0'
    mockFetch([
      () => {
        throw new Error('fetch must not run on flag-off')
      },
    ])
    const res = await processMirrorRequest(makeInput())
    expect(res).toEqual({ skipped: true, reason: 'flag-off' })
    expect(calls).toHaveLength(0)
  })

  it('returns env-incomplete when flag is "1" but RETAQO_API_URL is missing', async () => {
    process.env.RETAQO_ORDERS_ENABLED = '1'
    delete process.env.RETAQO_API_URL
    process.env.RETAQO_ECOMMERCE_API_KEY = 'rqo_live.fake.testing'
    mockFetch([
      () => {
        throw new Error('fetch must not run on env-incomplete')
      },
    ])
    const res = await processMirrorRequest(makeInput())
    expect(res).toEqual({ skipped: true, reason: 'env-incomplete' })
    expect(calls).toHaveLength(0)
  })

  it('returns env-incomplete when flag is "1" but RETAQO_ECOMMERCE_API_KEY is missing', async () => {
    process.env.RETAQO_ORDERS_ENABLED = '1'
    process.env.RETAQO_API_URL = 'http://retaqo.test'
    delete process.env.RETAQO_ECOMMERCE_API_KEY
    mockFetch([
      () => {
        throw new Error('fetch must not run on env-incomplete')
      },
    ])
    const res = await processMirrorRequest(makeInput())
    expect(res).toEqual({ skipped: true, reason: 'env-incomplete' })
    expect(calls).toHaveLength(0)
  })

  // The next group runs with RETAQO_* env already set in the test runner
  // (placeholder values). The Vami fetch is mocked at the URL level so
  // the test never touches the real network.
  describe('with flag enabled + env set', () => {
    beforeEach(() => {
      process.env.RETAQO_ORDERS_ENABLED = '1'
      process.env.NEXT_PUBLIC_API_URL = 'http://vami-backend.test'
      process.env.RETAQO_API_URL = 'http://retaqo.test'
      process.env.RETAQO_ECOMMERCE_API_KEY = 'rqo_live.fake.testing'
    })

    it('skips with vami-not-found when Vami returns 404', async () => {
      mockFetch([
        (u) => (u.includes('/api/public/orders/') ? new Response('', { status: 404 }) : undefined),
      ])
      const res = await processMirrorRequest(makeInput())
      expect(res).toEqual({ skipped: true, reason: 'vami-not-found' })
      expect(calls.some((c) => c.url.includes('/api/public/orders/'))).toBe(true)
      // Critically: Retaqo was NOT called
      expect(calls.every((c) => !c.url.includes('/public/ecommerce/orders'))).toBe(true)
    })

    it('skips with vami-not-found on malformed Vami response', async () => {
      mockFetch([
        (u) =>
          u.includes('/api/public/orders/')
            ? new Response(JSON.stringify({ unexpected: 'shape' }), { status: 200 })
            : undefined,
      ])
      const res = await processMirrorRequest(makeInput())
      expect(res).toEqual({ skipped: true, reason: 'vami-not-found' })
    })

    it('skips with total-mismatch when Vami total differs', async () => {
      mockFetch([
        (u) =>
          u.includes('/api/public/orders/')
            ? new Response(
                JSON.stringify({
                  orderNumber: 'VMC-2026-000123',
                  total: 9999, // spoofing detected
                  customerName: 'Asha',
                  customerEmail: null,
                  customerPhone: null,
                  items: [
                    { quantity: 1, unitPrice: 3399, variant: { sku: 'X', size: null, color: null } },
                  ],
                }),
                { status: 200 },
              )
            : undefined,
      ])
      const res = await processMirrorRequest(makeInput())
      expect(res).toEqual({ skipped: true, reason: 'total-mismatch' })
      // Retaqo NOT called
      expect(calls.every((c) => !c.url.includes('/public/ecommerce/orders'))).toBe(true)
    })

    it('on all-pass: calls Retaqo with reconstructed safe input and returns ok', async () => {
      mockFetch([
        (u) =>
          u.includes('/api/public/orders/')
            ? new Response(
                JSON.stringify({
                  orderNumber: 'VMC-2026-000123',
                  total: 3399,
                  customerName: 'Authoritative Name',
                  customerEmail: 'auth@example.com',
                  customerPhone: '+910000000000',
                  items: [
                    { quantity: 1, unitPrice: 3399, variant: { sku: 'ANK-M', size: 'M', color: null } },
                  ],
                }),
                { status: 200 },
              )
            : u.includes('/public/ecommerce/orders')
              ? new Response(JSON.stringify({ saleId: 'retaqo-sale-uuid-here' }), { status: 201 })
              : undefined,
      ])
      const res = await processMirrorRequest(
        makeInput({
          // Client tries to spoof customer name; verify-step should overwrite
          customer: { name: 'SPOOF', email: 'spoof@x.y', phone: '+910000' },
        }),
      )
      expect(res).toEqual({ ok: true, status: 'created', retaqoSaleId: 'retaqo-sale-uuid-here' })

      // Retaqo was called exactly once
      const retaqoCalls = calls.filter((c) => c.url.includes('/public/ecommerce/orders'))
      expect(retaqoCalls).toHaveLength(1)
      // Retaqo got Vami's authoritative customer name, not the spoof
      const sentBody = JSON.parse(String(retaqoCalls[0].init?.body))
      expect(sentBody.customer.name).toBe('Authoritative Name')
      // Retaqo got the deterministic UUID idempotency key
      expect(sentBody.idempotencyKey).toBe(deterministicIdempotencyKey('VMC-2026-000123'))
      // And the same key appears in X-Idempotency-Key header
      const headers = retaqoCalls[0].init?.headers as Record<string, string>
      expect(headers['x-idempotency-key']).toBe(deterministicIdempotencyKey('VMC-2026-000123'))
    })

    it('on Vami fetch network error: skips with vami-not-found, never calls Retaqo', async () => {
      mockFetch([
        (u) =>
          u.includes('/api/public/orders/')
            ? (() => {
                throw new Error('ECONNRESET')
              })()
            : undefined,
      ])
      const res = await processMirrorRequest(makeInput())
      expect(res).toEqual({ skipped: true, reason: 'vami-not-found' })
      expect(calls.every((c) => !c.url.includes('/public/ecommerce/orders'))).toBe(true)
    })
  })
})
