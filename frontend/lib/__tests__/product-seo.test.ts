import { describe, expect, it } from 'vitest'
import {
  buildProductCopy,
  buildProductDescription,
  buildProductDisplayName,
  buildProductTitle,
  formatSizeRange,
  getProductFacets,
} from '@/lib/product-seo'
import type { Product, ProductVariant } from '@/types/product'

let variantSeq = 0

function variant(partial: Partial<ProductVariant>): ProductVariant {
  variantSeq += 1
  return {
    id: `v${variantSeq}`,
    sku: `SKU-${variantSeq}`,
    size: null,
    color: null,
    colorHex: null,
    fabric: null,
    style: null,
    price: 3499,
    isActive: true,
    ...partial,
  }
}

function product(partial: Partial<Product> & Pick<Product, 'name'>): Product {
  return {
    id: 'p1',
    slug: 'p1',
    description: '',
    basePrice: 3499,
    category: { id: 'c1', name: 'Anarkali', slug: 'anarkali' },
    variants: [],
    media: [],
    isFeatured: false,
    isActive: true,
    ...partial,
  }
}

// Mirrors the real catalog: POS `name` is the bare garment type and
// `description` is an empty string, so everything distinguishing lives on
// the variants.
const ANARKALI = product({
  name: 'ANARKALI',
  slug: 'anarkali',
  variants: [
    variant({ size: 'XL', color: 'Yellow Green', fabric: 'Cotton', style: 'Anarkali' }),
    variant({ size: 'XXL', color: 'Yellow Green', fabric: 'Cotton', style: 'Anarkali' }),
  ],
})

const MULTI_COLOUR_SALWAR = product({
  name: 'SALWAR',
  slug: 'salwar-5',
  category: { id: 'c2', name: 'Salwar', slug: 'salwar' },
  basePrice: 3849,
  variants: [
    variant({ size: 'XXL', color: 'Navy Blue', fabric: 'Crepe', style: 'Kurti', price: 3849 }),
    variant({ size: 'XXL', color: 'Black', fabric: 'Crepe', style: 'Kurti', price: 3849 }),
    variant({ size: 'XXL', color: 'Maroon', fabric: 'Crepe', style: 'Kurti', price: 4199 }),
  ],
})

describe('getProductFacets', () => {
  it('keeps size codes upper-case and orders them XS→XXXL', () => {
    const p = product({
      name: 'ANARKALI',
      variants: [
        variant({ size: 'xxl' }),
        variant({ size: 'm' }),
        variant({ size: 'L' }),
      ],
    })
    expect(getProductFacets(p).sizes).toEqual(['M', 'L', 'XXL'])
  })

  it('title-cases wordy sizes rather than shouting them', () => {
    const p = product({ name: 'GOWN', variants: [variant({ size: 'Free Size' })] })
    expect(getProductFacets(p).sizes).toEqual(['Free Size'])
  })

  it('ignores inactive variants when active ones exist', () => {
    const p = product({
      name: 'SALWAR',
      variants: [
        variant({ size: 'L', color: 'Black', isActive: true }),
        variant({ size: 'XXXL', color: 'Ivory', isActive: false }),
      ],
    })
    expect(getProductFacets(p).sizes).toEqual(['L'])
    expect(getProductFacets(p).colors).toEqual(['Black'])
  })

  it('derives the price range from active variants', () => {
    const facets = getProductFacets(MULTI_COLOUR_SALWAR)
    expect(facets.minPrice).toBe(3849)
    expect(facets.maxPrice).toBe(4199)
  })
})

describe('formatSizeRange', () => {
  it('collapses a run to first–last', () => {
    expect(formatSizeRange(['M', 'L', 'XL', 'XXL'])).toBe('M–XXL')
  })
  it('returns a single size unchanged', () => {
    expect(formatSizeRange(['XXL'])).toBe('XXL')
  })
  it('returns empty for an unsized product', () => {
    expect(formatSizeRange([])).toBe('')
  })
})

describe('buildProductDisplayName', () => {
  it('builds a descriptive name from variant attributes', () => {
    expect(buildProductDisplayName(ANARKALI)).toBe('Yellow Green Cotton Anarkali')
  })

  it('does not repeat a word carried by more than one attribute', () => {
    const p = product({
      name: 'SALWAR',
      category: { id: 'c', name: 'Cotton Salwar', slug: 'cotton-salwar' },
      variants: [variant({ color: 'Black', fabric: 'Cotton', style: 'Kurti' })],
    })
    // Not "Black Cotton Kurti Cotton Salwar".
    expect(buildProductDisplayName(p)).toBe('Black Cotton Kurti Salwar')
  })

  it('falls back to the raw name when there are no variant attributes', () => {
    const p = product({
      name: 'SHAWL',
      category: { id: 'c', name: 'Shawl', slug: 'shawl' },
      variants: [],
    })
    expect(buildProductDisplayName(p)).toBe('Shawl')
  })
})

describe('buildProductTitle', () => {
  it('appends the size run and stays inside the SERP budget', () => {
    const title = buildProductTitle(ANARKALI)
    expect(title).toBe('Yellow Green Cotton Anarkali (XL–XXL)')
    // Next appends " | Vami Clubwear" (17 chars) on top of this.
    expect(title.length).toBeLessThanOrEqual(44)
  })

  it('keeps titles distinct for products sharing a name and colour', () => {
    const cotton = product({
      name: 'ANARKALI',
      variants: [variant({ size: 'XL', color: 'Yellow Green', fabric: 'Cotton' })],
    })
    const malCotton = product({
      name: 'ANARKALI',
      variants: [variant({ size: 'XL', color: 'Yellow Green', fabric: 'Mal Cotton' })],
    })
    expect(buildProductTitle(cotton)).not.toBe(buildProductTitle(malCotton))
  })

  it('drops qualifiers rather than blowing the budget', () => {
    const wordy = product({
      name: 'INDO WESTERN',
      category: { id: 'c', name: 'Bridal Collection', slug: 'bridal-collection' },
      variants: [
        variant({ size: 'M', color: 'Medium Purple', fabric: 'Chinon', style: 'Palazzo Set' }),
        variant({ size: 'XL', color: 'Medium Purple', fabric: 'Chinon', style: 'Palazzo Set' }),
      ],
    })
    expect(buildProductTitle(wordy).length).toBeLessThanOrEqual(44)
    expect(buildProductTitle(wordy)).toContain('Chinon')
  })
})

describe('buildProductDescription', () => {
  it('prefers an editor-written description', () => {
    const p = product({ name: 'SALWAR', description: 'Pure Banarasi mul chanderi.' })
    expect(buildProductDescription(p)).toBe('Pure Banarasi mul chanderi.')
  })

  it('assembles a complete, in-budget snippet when none is authored', () => {
    const description = buildProductDescription(ANARKALI)
    expect(description).toBe(
      'Yellow Green Cotton Anarkali. Sizes XL–XXL. ₹3,499. ' +
        'Plus-size Indo-Western & modest wear from Vami Clubwear, Manjeri — free shipping across India.',
    )
    expect(description.length).toBeLessThanOrEqual(160)
    // Never truncated mid-word.
    expect(description.endsWith('…')).toBe(false)
  })

  it('mentions the colour count and price range for multi-variant products', () => {
    const description = buildProductDescription(MULTI_COLOUR_SALWAR)
    expect(description).toContain('in 3 colours')
    expect(description).toContain('₹3,849–₹4,199')
    expect(description.length).toBeLessThanOrEqual(160)
  })
})

describe('buildProductCopy', () => {
  it('prefers an editor-written description', () => {
    const p = product({ name: 'GOWN', description: 'Hand-embroidered organza.' })
    expect(buildProductCopy(p)).toBe('Hand-embroidered organza.')
  })

  it('does not restate a silhouette already present in the name', () => {
    const copy = buildProductCopy(ANARKALI)
    expect(copy).toContain('Tailored in Cotton.')
    expect(copy).not.toContain('silhouette')
  })

  it('uses the right article for a silhouette not already in the name', () => {
    // Only the lead style reaches the display name, so a second style is the
    // case where the silhouette clause actually has something to add.
    const p = product({
      name: 'ANARKALI',
      variants: [
        variant({ size: 'XL', color: 'Off White', fabric: 'Mal Cotton', style: 'Kurti' }),
        variant({ size: 'XXL', color: 'Off White', fabric: 'Mal Cotton', style: 'A-Line' }),
      ],
    })
    expect(buildProductDisplayName(p)).toBe('Off White Mal Cotton Kurti Anarkali')
    expect(buildProductCopy(p)).toContain('with an A-Line silhouette')
  })

  it('lists every colour and size so the page is not thin', () => {
    const copy = buildProductCopy(MULTI_COLOUR_SALWAR)
    expect(copy).toContain('Navy Blue, Black and Maroon')
    expect(copy).toContain('Stocked in size XXL')
    expect(copy.length).toBeGreaterThan(200)
  })
})
