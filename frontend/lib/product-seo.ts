// Product SEO derivation.
//
// Why this exists: the catalog is imported from the POS, where `name` is the
// bare garment type ("ANARKALI", "SALWAR", "GOWN") and `description` is almost
// always an empty string. Rendered as-is that produced 14 pages titled
// "ANARKALI | Vami Clubwear" with no meta description — near-duplicate, thin
// documents that Google discovers and then declines to index.
//
// The variant rows, however, carry genuinely distinguishing attributes
// (colour, fabric, style, size run, price). This module folds those into a
// unique title, a real meta description and a short block of on-page copy, so
// every product page is a distinct document without anyone having to hand-write
// copy for 100+ SKUs. Editor-supplied `description` always wins when present.

import type { Product, ProductVariant } from '@/types/product'

// Title budget. Next appends the "%s | Vami Clubwear" template (17 chars), and
// Google truncates SERP titles around 60 — so keep the derived half under ~44.
const TITLE_BUDGET = 44

// Meta descriptions are truncated near 160 characters.
const DESCRIPTION_BUDGET = 160

const SIZE_ORDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'FREE SIZE']

// Size codes stay upper-case ("XL", not "Xl"); anything wordier ("Free Size")
// gets normal title casing.
const SIZE_CODE = /^(?:x*[sml]|\d+)$/i

export interface ProductFacets {
  colors: string[]
  fabrics: string[]
  styles: string[]
  sizes: string[]
  minPrice: number
  maxPrice: number
  inStock: boolean
}

/** "MUSTARD YELLOW" -> "Mustard Yellow"; leaves already-cased text alone. */
function titleCase(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .map((word) =>
      // Only re-case words that are all-caps or all-lower; "A-Line" and
      // "McQueen" style casing from the POS is left untouched.
      /^[A-Z]+$/.test(word) || /^[a-z]+$/.test(word)
        ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        : word,
    )
    .join(' ')
}

function uniqueStrings(
  values: Array<string | null | undefined>,
  format: (value: string) => string = titleCase,
): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of values) {
    const value = raw?.trim()
    if (!value) continue
    const key = value.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(format(value))
  }
  return out
}

function formatSize(value: string): string {
  return SIZE_CODE.test(value.trim()) ? value.trim().toUpperCase() : titleCase(value)
}

/** "a Kurti" / "an A-Line" — keeps the generated copy grammatical. */
function withArticle(noun: string): string {
  return `${/^[aeiou]/i.test(noun) ? 'an' : 'a'} ${noun}`
}

function sortSizes(sizes: string[]): string[] {
  return [...sizes].sort((a, b) => {
    const ai = SIZE_ORDER.indexOf(a.toUpperCase())
    const bi = SIZE_ORDER.indexOf(b.toUpperCase())
    // Unknown sizes sort last but keep a stable relative order.
    return (ai === -1 ? SIZE_ORDER.length : ai) - (bi === -1 ? SIZE_ORDER.length : bi)
  })
}

export function getProductFacets(product: Product): ProductFacets {
  const variants: ProductVariant[] = (product.variants ?? []).filter((v) => v.isActive)
  const source = variants.length ? variants : (product.variants ?? [])

  const prices = source.map((v) => Number(v.price)).filter((n) => Number.isFinite(n) && n > 0)
  const base = Number(product.basePrice)

  return {
    colors: uniqueStrings(source.map((v) => v.color)),
    fabrics: uniqueStrings(source.map((v) => v.fabric)),
    styles: uniqueStrings(source.map((v) => v.style)),
    sizes: sortSizes(uniqueStrings(source.map((v) => v.size), formatSize)),
    minPrice: prices.length ? Math.min(...prices) : base,
    maxPrice: prices.length ? Math.max(...prices) : base,
    inStock: source.some((v) => (v.availableStock ?? 0) > 0 || v.inStock === true),
  }
}

/** "L–XXXL" for a run, "XXL" for a single size, "" when unsized. */
export function formatSizeRange(sizes: string[]): string {
  if (sizes.length === 0) return ''
  if (sizes.length === 1) return sizes[0]
  return `${sizes[0]}–${sizes[sizes.length - 1]}`
}

export function formatPrice(value: number): string {
  return `₹${Math.round(value).toLocaleString('en-IN')}`
}

function formatPriceRange(min: number, max: number): string {
  return min === max ? formatPrice(min) : `${formatPrice(min)}–${formatPrice(max)}`
}

/**
 * Join phrases into one noun phrase, dropping any word already used by an
 * earlier phrase. Without this, colour "Cotton"-ish overlaps produce titles
 * like "Black Cotton Kurti Cotton Salwar".
 */
function joinDeduped(parts: string[]): string {
  const used = new Set<string>()
  const kept: string[] = []
  for (const part of parts) {
    const words = part.split(/\s+/).filter((w) => w && !used.has(w.toLowerCase()))
    if (!words.length) continue
    words.forEach((w) => used.add(w.toLowerCase()))
    kept.push(words.join(' '))
  }
  return kept.join(' ')
}

/**
 * The human-readable product name: "Off White Mal Cotton A-Line Anarkali".
 * Falls back to the raw POS name when there are no usable attributes.
 */
export function buildProductDisplayName(product: Product): string {
  const { colors, fabrics, styles } = getProductFacets(product)
  const categoryName = product.category?.name ?? ''
  const rawName = titleCase(product.name ?? '')

  // A single colour reads as a descriptor; a multi-colour product is described
  // by its lead colour only, since "Black Dark Green Maroon Crepe Kurti" is
  // neither readable nor a phrase anyone searches for.
  const colour = colors[0] ?? ''
  const fabric = fabrics[0] ?? ''
  const style = styles[0] ?? ''

  // `rawName` goes last: it is the most generic token ("ANARKALI") and is
  // usually already implied by style or category, so joinDeduped drops it.
  const phrase = joinDeduped([colour, fabric, style, categoryName, rawName].filter(Boolean))
  return phrase || rawName || 'Product'
}

/**
 * Title for <title> / og:title. Trimmed to the SERP budget by dropping the
 * least-load-bearing qualifiers first, then given a size suffix if it fits —
 * the size run is the plus-size signal this brand actually ranks for.
 */
export function buildProductTitle(product: Product): string {
  const { colors, fabrics, styles, sizes } = getProductFacets(product)
  const categoryName = product.category?.name ?? ''
  const rawName = titleCase(product.name ?? '')

  const colour = colors[0] ?? ''
  const fabric = fabrics[0] ?? ''
  const style = styles[0] ?? ''

  // Progressively cheaper variants, tried longest-first.
  const candidates = [
    [colour, fabric, style, categoryName, rawName],
    [colour, fabric, style, rawName],
    [colour, fabric, categoryName, rawName],
    [colour, style, categoryName, rawName],
    // Fabric is a stronger differentiator than the category, which is often
    // already implied by the garment name — prefer keeping it.
    [colour, fabric, rawName],
    [colour, categoryName, rawName],
    [categoryName, rawName],
    [rawName],
  ]

  let title = ''
  for (const parts of candidates) {
    title = joinDeduped(parts.filter(Boolean))
    if (title && title.length <= TITLE_BUDGET) break
  }
  if (!title) title = rawName || 'Product'

  const sizeRange = formatSizeRange(sizes)
  if (sizeRange && title.length + sizeRange.length + 3 <= TITLE_BUDGET) {
    title = `${title} (${sizeRange})`
  }
  return title
}

/**
 * Meta description. An editor-written `description` always wins; otherwise we
 * assemble one from the facts on the page so the snippet is accurate rather
 * than boilerplate repeated across the catalog.
 */
export function buildProductDescription(product: Product): string {
  const authored = product.description?.trim()
  if (authored) return authored

  const { colors, sizes, minPrice, maxPrice } = getProductFacets(product)
  const displayName = buildProductDisplayName(product)
  const sizeRange = formatSizeRange(sizes)

  // Head: the facts specific to this product.
  const head: string[] = [displayName]
  if (colors.length > 1) head.push(`in ${colors.length} colours`)
  const lead = `${head.join(' ')}.`

  const specs: string[] = []
  if (sizeRange) specs.push(sizes.length > 1 ? `Sizes ${sizeRange}` : `Size ${sizeRange}`)
  if (minPrice > 0) specs.push(formatPriceRange(minPrice, maxPrice))
  const detail = specs.length ? ` ${specs.join('. ')}.` : ''

  // Tail: the brand/category context, in decreasing length. Pick the longest
  // that still fits, so the snippet always ends on a complete sentence rather
  // than being chopped mid-word by Google.
  const tails = [
    ' Plus-size Indo-Western & modest wear from Vami Clubwear, Manjeri — free shipping across India.',
    ' Plus-size Indo-Western & modest wear from Vami Clubwear, Manjeri.',
    ' Plus-size fashion from Vami Clubwear, Manjeri.',
    '',
  ]
  const base = `${lead}${detail}`
  const tail = tails.find((t) => base.length + t.length <= DESCRIPTION_BUDGET) ?? ''
  const full = `${base}${tail}`

  // Safety net for a pathologically long product name.
  if (full.length <= DESCRIPTION_BUDGET) return full
  const clipped = full.slice(0, DESCRIPTION_BUDGET - 1)
  return `${clipped.slice(0, clipped.lastIndexOf(' '))}…`
}

/**
 * Longer on-page copy for the product page body. Only used when the product has
 * no authored description — this is the text that turns a thin page into an
 * indexable one.
 */
export function buildProductCopy(product: Product): string {
  const authored = product.description?.trim()
  if (authored) return authored

  const { colors, fabrics, styles, sizes, minPrice, maxPrice } = getProductFacets(product)
  const displayName = buildProductDisplayName(product)
  const categoryName = product.category?.name ?? 'piece'

  const parts: string[] = []

  parts.push(
    `The ${displayName} is part of the Vami Clubwear ${categoryName} collection — Indo-Western fusion and modest wear handcrafted in Manjeri, Kerala.`,
  )

  // Skip the silhouette clause when the style word is already in the name
  // ("the Yellow Green Cotton Anarkali ... with an Anarkali silhouette").
  const silhouette = styles.find(
    (s) => !displayName.toLowerCase().includes(s.toLowerCase()),
  )

  if (fabrics.length) {
    parts.push(
      `Tailored in ${fabrics.join(' and ')}${silhouette ? ` with ${withArticle(silhouette)} silhouette` : ''}.`,
    )
  } else if (silhouette) {
    parts.push(`Cut to ${withArticle(silhouette)} silhouette.`)
  }

  if (colors.length === 1) {
    parts.push(`Shown in ${colors[0]}.`)
  } else if (colors.length > 1) {
    parts.push(`Available in ${colors.slice(0, -1).join(', ')} and ${colors[colors.length - 1]}.`)
  }

  if (sizes.length) {
    parts.push(
      sizes.length === 1
        ? `Stocked in size ${sizes[0]}.`
        : `Stocked in ${sizes.join(', ')} — part of our size-inclusive big-size range for women up to XXXL.`,
    )
  }

  if (minPrice > 0) {
    parts.push(`Priced at ${formatPriceRange(minPrice, maxPrice)}, with free shipping across India and online prepaid checkout.`)
  }

  return parts.join(' ')
}
