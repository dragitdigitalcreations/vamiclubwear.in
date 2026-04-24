/**
 * Idempotently upsert the canonical Vami Clubwear category list.
 *
 * Safe for production — no products, no orders touched. Pure category upsert
 * keyed on `slug`. Run whenever the admin "Category" dropdown is missing a
 * collection that exists on the storefront (e.g. Salwar).
 *
 * Keep in sync with `frontend/lib/categories.ts`.
 *
 * Run:
 *   npm run ensure:categories
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const CATEGORIES = [
  { name: 'Anarkali',      slug: 'anarkali',      description: 'Classic and contemporary Anarkali suits'          },
  { name: 'Salwar',        slug: 'salwar',        description: 'Traditional and modern salwar collections'        },
  { name: 'Sharara Set',   slug: 'sharara-set',   description: 'Elegant sharara sets for all occasions'           },
  { name: 'Churidar Bit',  slug: 'churidar-bit',  description: 'Classic churidar sets'                            },
  { name: 'Cotton Salwar', slug: 'cotton-salwar', description: 'Comfortable everyday cotton salwar collections'   },
  { name: 'Modest Wear',   slug: 'modest-wear',   description: 'Elegant modest fashion for every occasion'        },
  { name: 'Pants',         slug: 'pants',         description: 'Stylish pants and palazzo collections'            },
  { name: 'Duppatta',      slug: 'duppatta',      description: 'Statement dupattas and drapes'                    },
  { name: 'Big Size',      slug: 'big-size',      description: 'Premium fashion in extended sizes XL–3XL'         },
]

async function main() {
  console.log('🌱 Ensuring canonical categories…\n')
  for (const cat of CATEGORIES) {
    const c = await prisma.category.upsert({
      where:  { slug: cat.slug },
      create: cat,
      update: { name: cat.name, description: cat.description },
    })
    console.log(`✔ ${c.name.padEnd(16)}  (${c.slug})`)
  }
  console.log('\n✅ Categories in sync.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
