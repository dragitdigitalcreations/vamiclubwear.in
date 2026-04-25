// Convert oversized PNG hero/promo art in /public to compact WebP.
// Run once whenever new artwork is dropped: `npm run optimize-images`.
import { promises as fs } from 'node:fs'
import path from 'node:path'
import url from 'node:url'
import sharp from 'sharp'

const __filename = url.fileURLToPath(import.meta.url)
const __dirname  = path.dirname(__filename)
const PUBLIC_DIR = path.resolve(__dirname, '..', 'public')

// Per-asset target widths chosen for max render size on 2× displays.
const TARGETS = [
  { file: 'hero-models.png',       width: 2400, quality: 78 },
  { file: 'modest-collection.png', width: 2000, quality: 78 },
  { file: 'promo-a.png',           width: 1600, quality: 78 },
  { file: 'promo-b.png',           width: 1600, quality: 78 },
  { file: 'promo-accent.png',      width: 1200, quality: 80 },
  { file: 'vami-bg.png',           width: 1600, quality: 75 },
]

async function convert({ file, width, quality }) {
  const src = path.join(PUBLIC_DIR, file)
  const out = path.join(PUBLIC_DIR, file.replace(/\.png$/i, '.webp'))
  try {
    const before = (await fs.stat(src)).size
    await sharp(src)
      .resize({ width, withoutEnlargement: true })
      .webp({ quality, effort: 5 })
      .toFile(out)
    const after = (await fs.stat(out)).size
    const ratio = ((1 - after / before) * 100).toFixed(1)
    console.log(`  ${file.padEnd(28)} ${(before / 1024 / 1024).toFixed(2)}MB → ${(after / 1024 / 1024).toFixed(2)}MB  (-${ratio}%)`)
  } catch (e) {
    if (e.code === 'ENOENT') {
      console.log(`  ${file.padEnd(28)} skipped (source not found)`)
      return
    }
    throw e
  }
}

console.log('Optimizing /public images → WebP')
for (const t of TARGETS) await convert(t)
console.log('Done.')
