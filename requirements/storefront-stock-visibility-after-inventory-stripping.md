# Storefront stock visibility after public-API inventory stripping

## Problem

Since the security-audit commit `dbc79ba` (2026-07-11, finding F-range), the public
product endpoints (`GET /api/products`, `/api/products/:id`, `/api/products/slug/:slug`)
strip each variant's `inventory[]` array for non-admin requests and replace it with a
bare `inStock` boolean (`stripInternalFields` in `product.controller.ts`).

The storefront, however, still computes purchasability with
`getAvailableStock(variant)` (`frontend/types/product.ts`), which reads **only**
`variant.inventory[]`. With that field stripped, every variant computes to 0
available stock, so:

- Every PDP shows **Out of Stock** and disables Add to Bag / Buy Now, even for
  variants the DB says are in stock (verified live: `anarkali--6` Red Orange has
  quantity 1 in M/L/XL/XXL, yet the PDP shows the whole product sold out).
- All colour swatches render struck-through (the strike is invisible on the
  selected red-orange swatch, which made the symptom look like a colour/size
  cross-lock bug).
- Product cards show incorrect stock state across the catalog (all 64 live
  products affected).

## Scope

- Backend: `stripInternalFields` in `backend/src/modules/product/product.controller.ts`
- Frontend: `ProductVariant` type + `getAvailableStock` in `frontend/types/product.ts`
- Frontend: JSON-LD availability check in `frontend/app/(shop)/products/[slug]/page.tsx`

Out of scope: `/api/products/barcode/:barcode` (still returns full inventory and the
public `/barcode` page depends on it — flagged separately as a hardening follow-up).

## Acceptance criteria

1. Public (non-admin) product responses expose a numeric `availableStock` per
   variant = Σ max(0, quantity − reserved) across locations, plus the existing
   `inStock` boolean. Per-location rows, location names, and barcodes stay hidden.
2. `getAvailableStock` returns, in order of preference:
   - the sum over `inventory[]` when present (admin/authenticated shape),
   - `availableStock` when present (public shape),
   - `inStock ? 1 : 0` as a transitional fallback (old cached responses).
3. PDP for a product with stock (e.g. `anarkali--6`) shows the in-stock colour
   selectable, sizes purchasable, and Add to Bag enabled.
4. "Only N left" badge and qty-stepper cap keep working from `availableStock`.
5. Product JSON-LD `availability` reflects the same computation (no dead
   `v.stock` / `v.reservedStock` fields).

## Tasks

- [x] Backend: emit `availableStock` in `stripInternalFields`
- [x] Frontend: extend `ProductVariant`, update `getAvailableStock`
- [x] Frontend: JSON-LD availability via `getAvailableStock`
- [x] Typecheck backend + frontend
