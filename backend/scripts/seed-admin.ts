/**
 * Creates the initial admin user.
 * Run once: npx dotenv -e .env.local -- tsx scripts/seed-admin.ts
 *
 * Credentials (change immediately after first login):
 *   email:    admin@vami.in
 *   password: vami@admin123
 */

import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config()

import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const email    = process.env.SEED_ADMIN_EMAIL    ?? 'admin@vami.in'
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'vami@admin123'
  const name     = process.env.SEED_ADMIN_NAME     ?? 'Vami Admin'

  const hash = await bcrypt.hash(password, 12)

  const admin = await prisma.adminUser.upsert({
    where:  { email },
    update: { passwordHash: hash, name, isActive: true },
    create: { email, passwordHash: hash, name, role: 'ADMIN' },
  })

  console.log(`\n✅ Admin user seeded:`)
  console.log(`   ID:    ${admin.id}`)
  console.log(`   Email: ${admin.email}`)
  console.log(`   Role:  ${admin.role}`)
  console.log(`\n⚠️  Change this password immediately in production!\n`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
