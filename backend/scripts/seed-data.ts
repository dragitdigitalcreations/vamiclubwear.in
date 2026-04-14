/**
 * Seed realistic Vami Clubwear product + inventory data for development/testing.
 *
 * Run:
 *   npx dotenv -e .env.local -- tsx scripts/seed-data.ts
 *
 * Safe to re-run — uses upsert on slug/sku.
 */

import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()

// ── Sample data ───────────────────────────────────────────────────────────────

const CATEGORIES = [
  { name: 'Anarkali',       slug: 'anarkali',       description: 'Classic and contemporary Anarkali suits' },
  { name: 'Salwar',         slug: 'salwar',          description: 'Traditional and modern salwar collections' },
  { name: 'Sharara Set',    slug: 'sharara-set',     description: 'Elegant sharara sets for all occasions' },
  { name: 'Churidar Bit',   slug: 'churidar-bit',    description: 'Classic churidar sets' },
  { name: 'Cotton Salwar',  slug: 'cotton-salwar',   description: 'Comfortable everyday cotton salwar collections' },
  { name: 'Western Wear',   slug: 'western-wear',    description: 'Indo-Western and western fusion styles' },
  { name: 'Pants',          slug: 'pants',           description: 'Stylish pants and palazzo collections' },
  { name: 'Duppatta',       slug: 'duppatta',        description: 'Statement dupattas and drapes' },
  { name: 'Big Size',       slug: 'big-size',        description: 'Premium fashion in extended sizes XL–3XL' },
]

const PRODUCTS = [
  {
    name:        'Velvet Anarkali Set',
    slug:        'velvet-anarkali-set',
    description: 'Flowing velvet anarkali with sequin neckline. A statement piece for festive occasions.',
    basePrice:   8500,
    isFeatured:  true,
    category:    'anarkali',
    variants: [
      { sku: 'VCW-VANK-MAR-S-VELV',  size: 'S',  color: 'Maroon',          colorHex: '#800000', fabric: 'Velvet',   price: 8500, stock: 3 },
      { sku: 'VCW-VANK-MAR-M-VELV',  size: 'M',  color: 'Maroon',          colorHex: '#800000', fabric: 'Velvet',   price: 8500, stock: 4 },
      { sku: 'VCW-VANK-MAR-L-VELV',  size: 'L',  color: 'Maroon',          colorHex: '#800000', fabric: 'Velvet',   price: 8500, stock: 2 },
      { sku: 'VCW-VANK-BLK-M-VELV',  size: 'M',  color: 'Midnight Black',  colorHex: '#0D0D0D', fabric: 'Velvet',   price: 8500, stock: 5 },
      { sku: 'VCW-VANK-BLK-L-VELV',  size: 'L',  color: 'Midnight Black',  colorHex: '#0D0D0D', fabric: 'Velvet',   price: 8500, stock: 1 },
    ],
  },
  {
    name:        'Zari Silk Salwar',
    slug:        'zari-silk-salwar',
    description: 'Contemporary salwar suit featuring intricate zari embroidery on a silk base. Perfect for festive occasions.',
    basePrice:   4800,
    isFeatured:  true,
    category:    'salwar',
    variants: [
      { sku: 'VCW-ZSAL-GRN-S-SILK',  size: 'S',  color: 'Emerald Green', colorHex: '#006400', fabric: 'Pure Silk', price: 4800, stock: 5 },
      { sku: 'VCW-ZSAL-GRN-M-SILK',  size: 'M',  color: 'Emerald Green', colorHex: '#006400', fabric: 'Pure Silk', price: 4800, stock: 8 },
      { sku: 'VCW-ZSAL-GRN-L-SILK',  size: 'L',  color: 'Emerald Green', colorHex: '#006400', fabric: 'Pure Silk', price: 4800, stock: 3 },
      { sku: 'VCW-ZSAL-GLD-M-SILK',  size: 'M',  color: 'Gold',          colorHex: '#FFD700', fabric: 'Pure Silk', price: 5200, stock: 4 },
    ],
  },
  {
    name:        'Sheer Chiffon Duppatta',
    slug:        'sheer-chiffon-duppatta',
    description: 'Lightweight chiffon duppatta with delicate border embroidery. Drapes beautifully.',
    basePrice:   1200,
    isFeatured:  false,
    category:    'duppatta',
    variants: [
      { sku: 'VCW-SDUP-WHT-FS-CHIF', size: 'Free Size', color: 'White',      colorHex: '#FFFFFF', fabric: 'Chiffon', price: 1200, stock: 15 },
      { sku: 'VCW-SDUP-PNK-FS-CHIF', size: 'Free Size', color: 'Blush Pink', colorHex: '#FFB6C1', fabric: 'Chiffon', price: 1200, stock: 12 },
      { sku: 'VCW-SDUP-BLU-FS-CHIF', size: 'Free Size', color: 'Sky Blue',   colorHex: '#87CEEB', fabric: 'Chiffon', price: 1200, stock: 9  },
    ],
  },
  {
    name:        'Embroidered Georgette Kurta',
    slug:        'embroidered-georgette-kurta',
    description: 'A-line georgette kurta with thread embroidery on the yoke. Pairs beautifully with palazzo trousers.',
    basePrice:   2800,
    isFeatured:  true,
    category:    'western-wear',
    variants: [
      { sku: 'VCW-EGKU-BEG-XS-GORG', size: 'XS', color: 'Beige', colorHex: '#F5F0DC', fabric: 'Georgette', price: 2800, stock: 6 },
      { sku: 'VCW-EGKU-BEG-S-GORG',  size: 'S',  color: 'Beige', colorHex: '#F5F0DC', fabric: 'Georgette', price: 2800, stock: 7 },
      { sku: 'VCW-EGKU-BEG-M-GORG',  size: 'M',  color: 'Beige', colorHex: '#F5F0DC', fabric: 'Georgette', price: 2800, stock: 8 },
      { sku: 'VCW-EGKU-BEG-L-GORG',  size: 'L',  color: 'Beige', colorHex: '#F5F0DC', fabric: 'Georgette', price: 2800, stock: 5 },
      { sku: 'VCW-EGKU-NVY-S-GORG',  size: 'S',  color: 'Navy',  colorHex: '#000080', fabric: 'Georgette', price: 2800, stock: 4 },
      { sku: 'VCW-EGKU-NVY-M-GORG',  size: 'M',  color: 'Navy',  colorHex: '#000080', fabric: 'Georgette', price: 2800, stock: 6 },
    ],
  },
]

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Seeding Vami Clubwear data…\n')

  // 1. Ensure a default location exists
  const location = await prisma.location.upsert({
    where:  { name: 'Manjeri Store' } as any,
    create: { name: 'Manjeri Store', address: 'Main Road, Manjeri, Kerala 676121' },
    update: {},
  })
  console.log(`✔ Location: ${location.name}  (${location.id})`)

  // 2. Categories
  const catMap = new Map<string, string>()
  for (const cat of CATEGORIES) {
    const c = await prisma.category.upsert({
      where:  { slug: cat.slug },
      create: cat,
      update: { name: cat.name, description: cat.description },
    })
    catMap.set(cat.slug, c.id)
    console.log(`✔ Category: ${c.name}`)
  }

  // 3. Products + variants + inventory
  for (const p of PRODUCTS) {
    const categoryId = catMap.get(p.category)!

    const product = await prisma.product.upsert({
      where:  { slug: p.slug },
      create: {
        name:        p.name,
        slug:        p.slug,
        description: p.description,
        basePrice:   p.basePrice,
        isFeatured:  p.isFeatured,
        isActive:    true,
        categoryId,
      },
      update: {
        name:        p.name,
        description: p.description,
        basePrice:   p.basePrice,
        isFeatured:  p.isFeatured,
        categoryId,
      },
    })
    console.log(`\n✔ Product: ${product.name}`)

    for (const v of p.variants) {
      const variant = await prisma.productVariant.upsert({
        where:  { sku: v.sku },
        create: {
          productId: product.id,
          sku:       v.sku,
          size:      v.size,
          color:     v.color,
          colorHex:  v.colorHex,
          fabric:    v.fabric,
          price:     v.price,
          isActive:  true,
        },
        update: {
          size:    v.size,
          color:   v.color,
          fabric:  v.fabric,
          price:   v.price,
        },
      })

      await prisma.inventory.upsert({
        where: { variantId_locationId: { variantId: variant.id, locationId: location.id } },
        create: {
          variantId:  variant.id,
          locationId: location.id,
          quantity:   v.stock,
          reserved:   0,
          version:    0,
        },
        update: { quantity: v.stock },
      })

      console.log(`  ↳ ${v.sku}  qty:${v.stock}`)
    }
  }

  // 4. Sample orders
  const allVariants = await prisma.productVariant.findMany({ take: 6 })
  if (allVariants.length >= 2) {
    const statuses = ['DELIVERED', 'DELIVERED', 'SHIPPED', 'CONFIRMED', 'PENDING']
    for (let i = 0; i < statuses.length; i++) {
      const v1 = allVariants[i % allVariants.length]
      const v2 = allVariants[(i + 1) % allVariants.length]
      const total = new Prisma.Decimal(Number(v1.price) + Number(v2.price) + (i % 2 === 0 ? 0 : 200))

      const orderNumber = `VCW-${String(2400 + i).padStart(4, '0')}`
      const exists = await prisma.order.findUnique({ where: { orderNumber } })
      if (exists) { console.log(`  ↳ Order ${orderNumber} already exists, skipping`); continue }

      await prisma.order.create({
        data: {
          orderNumber,
          status:        statuses[i] as any,
          subtotal:      total,
          total:         total,
          customerName:  ['Fatima Beevi', 'Sana Rasheed', 'Anjali Nair', 'Rehana Kabir', null][i],
          customerEmail: i < 4 ? `customer${i + 1}@example.com` : null,
          customerPhone: i < 4 ? `+91 9876${500000 + i}` : null,
          locationId:    location.id,
          items: {
            create: [
              { variantId: v1.id, quantity: 1, unitPrice: v1.price },
              { variantId: v2.id, quantity: 1, unitPrice: v2.price },
            ],
          },
        },
      })
    }
    console.log('\n✔ 5 sample orders created')
  }

  console.log('\n✅ Seed complete.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
