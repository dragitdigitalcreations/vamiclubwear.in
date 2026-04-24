/**
 * Canonical Vami Clubwear collection list. This is the single source of
 * truth for the Navbar "Collections" dropdown AND the landing page
 * "Shop by Category" strip.
 *
 * Keep in sync with the backend seed (`backend/scripts/ensure-categories.ts`).
 */
export const CATEGORIES = [
  { slug: 'anarkali',      label: 'Anarkali'      },
  { slug: 'salwar',        label: 'Salwar'        },
  { slug: 'sharara-set',   label: 'Sharara Set'   },
  { slug: 'churidar-bit',  label: 'Churidar Bit'  },
  { slug: 'cotton-salwar', label: 'Cotton Salwar' },
  { slug: 'modest-wear',   label: 'Modest Wear'   },
  { slug: 'pants',         label: 'Pants'         },
  { slug: 'duppatta',      label: 'Duppatta'      },
] as const

export type CategorySlug = typeof CATEGORIES[number]['slug']
