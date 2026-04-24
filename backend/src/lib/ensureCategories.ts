/**
 * Idempotent boot-time upsert of the canonical Vami Clubwear category list.
 * Keeps the admin "Category" dropdown in sync with the storefront Navbar
 * Collections menu without a manual seed step on each deploy.
 *
 * Keep in sync with `frontend/lib/categories.ts` and
 * `backend/scripts/ensure-categories.ts`.
 */
import { PrismaClient } from '@prisma/client'

const CATEGORIES = [
  { name: 'Anarkali',      slug: 'anarkali',      description: 'Classic and contemporary Anarkali suits'        },
  { name: 'Salwar',        slug: 'salwar',        description: 'Traditional and modern salwar collections'      },
  { name: 'Sharara Set',   slug: 'sharara-set',   description: 'Elegant sharara sets for all occasions'         },
  { name: 'Churidar Bit',  slug: 'churidar-bit',  description: 'Classic churidar sets'                          },
  { name: 'Cotton Salwar', slug: 'cotton-salwar', description: 'Comfortable everyday cotton salwar collections' },
  { name: 'Modest Wear',   slug: 'modest-wear',   description: 'Elegant modest fashion for every occasion'      },
  { name: 'Pants',         slug: 'pants',         description: 'Stylish pants and palazzo collections'          },
  { name: 'Duppatta',      slug: 'duppatta',      description: 'Statement dupattas and drapes'                  },
  { name: 'Big Size',      slug: 'big-size',      description: 'Premium fashion in extended sizes XL–3XL'       },
]

export async function ensureCategories(prisma: PrismaClient) {
  try {
    for (const cat of CATEGORIES) {
      await prisma.category.upsert({
        where:  { slug: cat.slug },
        create: cat,
        update: { name: cat.name, description: cat.description },
      })
    }
    console.log(`[boot] Category sync OK (${CATEGORIES.length} categories)`)
  } catch (err) {
    // Never block startup on this — it's a nicety, not a hard dep.
    console.warn('[boot] Category sync failed (non-fatal):', (err as Error).message)
  }
}
