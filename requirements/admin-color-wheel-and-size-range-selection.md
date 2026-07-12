# REQ: Admin Product Form — Color Wheel Picker & Size Range Selection

**Status:** Implemented
**Date:** 2026-07-11
**Scope:** Admin panel product add/edit form (`ProductUploadForm` → `VariantBuilder`)

## Problem

1. **Color selection** currently uses the native OS `<input type="color">` dialog.
   The operator wants an in-page **color wheel** to pick an *estimated* swatch
   color, while still being able to type the color name manually (e.g.
   "Rani Pink", "Mehendi Green") — names that no picker can guess.

2. **Size selection** is a one-size-per-row dropdown. Adding a product that
   comes in S–XXXL means manually creating and configuring six variant rows.
   The operator wants size *frames* (chips) with **range selection**: clicking
   `S` and then `XXXL` should auto-select every size in between; clicking an
   already-selected size frame should unselect only that one.

## Acceptance Criteria

### Color wheel
- [ ] Clicking the swatch next to the "Colour Name" field opens an in-page
      popover containing a hue/saturation wheel and a brightness slider.
- [ ] Dragging on the wheel updates the swatch, hex readout, and auto-fills
      the Colour Name field with the nearest named color (existing
      `hexToColorName` behavior preserved).
- [ ] A hex text field in the popover allows exact entry.
- [ ] The Colour Name input remains free text — the operator can overwrite
      the suggested name at any time and the manual name is what is saved.
- [ ] Popover closes on outside click or Escape. No external dependency added.

### Size range selection
- [ ] The size dropdown per variant row is replaced with a grid of size chips
      (`XS…7XL`, `Free Size`, `Custom`).
- [ ] Clicking an unselected chip selects it (fills the current row's size if
      empty, otherwise creates a sibling variant row cloned from the current
      row — same color/fabric/style/price/stock — with that size).
- [ ] Clicking a second unselected chip after another selection auto-selects
      **every ordered size between them** (range fill), creating one variant
      row per size. `Free Size` and `Custom` never participate in ranges.
- [ ] Clicking a selected chip unselects **only that size**: the matching
      sibling row is removed; if it is the current row's own size the size is
      cleared (the row is kept so pricing/stock aren't lost).
- [ ] Each generated row remains an independent SKU with individually
      editable price and stock (big-size pricing can differ per size).
- [ ] Colour edits (name or wheel) propagate to every sibling row in the same
      size group — one group = one colour block, whichever order the operator
      works in (sizes-then-colour or colour-then-sizes).
- [ ] SKU auto-generation, per-color barcodes, media color binding, and the
      edit-product flow keep working unchanged.

## Design / Data Notes

- Variant rows gain a client-only `groupId` linking rows created from the same
  chip grid (one "color block" = one group). It is stripped from the API
  payload on submit; the backend contract is unchanged (one variant = one
  size, as before).
- Rows also carry a client-only `rowKey` used as the React key. react-hook-form
  regenerates `field.id` on every `setValue` (the SKU auto-fill effect fires
  one per change), which remounts rows and wipes row-local UI state — the
  range anchor and the wheel popover both broke without a stable key. The
  range anchor additionally lives in a parent-level ref keyed by `groupId`.
  Verified end-to-end 2026-07-12 (34 checks, Playwright against the real
  admin flow: login → add product → chips → wheel → submit payload).
- On edit, existing variants are grouped by `color|fabric|style` so the chip
  grid shows all sizes of that combination as selected.
- Range order: `XS S M L XL XXL XXXL 4XL 5XL 6XL 7XL`.
- The wheel is CSS-gradient based (conic hue + radial saturation + brightness
  overlay) with pointer-event math — no canvas, no new npm dependency.

## Task Breakdown

1. `frontend/components/admin/ColorWheelPicker.tsx` — new self-contained
   popover wheel component; exports `hexToColorName` (moved from
   VariantBuilder).
2. `frontend/components/admin/VariantBuilder.tsx` — replace native color input
   with `ColorWheelPicker`; replace size `<select>` with `SizeChipGrid`;
   add group-aware `toggleSize` (range fill + single deselect).
3. `frontend/components/admin/ProductUploadForm.tsx` — add optional `groupId`
   to the variant schema, assign group ids to initial variants on edit, strip
   `groupId` from the submit payload.
