// SKU generation utility for Vami Clubwear multi-dimensional variants
// Format: VCW-{PRODUCT}-{COLOR}-{SIZE}-{FABRIC}-{EMBR}
// Example: VCW-ZFUS-GRN-M-SILK-ZARI

const FABRIC_CODES: Record<string, string> = {
  'Pure Silk': 'SILK',
  Georgette: 'GEOR',
  Chiffon: 'CHIF',
  Velvet: 'VELV',
  Crepe: 'CRPE',
  Cotton: 'COTN',
  Net: 'NET',
  Organza: 'ORGZ',
  'Lycra Blend': 'LYCR',
}

const EMBROIDERY_CODES: Record<string, string> = {
  'Zari Work': 'ZARI',
  'Thread Embroidery': 'THRX',
  'Mirror Work': 'MIRR',
  'Sequin Work': 'SEQN',
  'Aari Embroidery': 'AARI',
  'Block Print': 'BLKP',
  'Digital Print': 'DGTP',
  'Hand Painted': 'HNTP',
  'Plain / Unembellished': 'PLIN',
}

interface SkuParams {
  productSlug: string
  color: string
  size: string
  fabric: string
  embroideryType: string
}

/**
 * Generates a deterministic SKU string from variant dimensions.
 * Sanitises each segment to uppercase alphanumeric (max 4 chars) for
 * compatibility with Tally/Zoho item codes.
 */
export function generateSku({ productSlug, color, size, fabric, embroideryType }: SkuParams): string {
  const productCode = productSlug
    .replace(/-/g, ' ')
    .split(' ')
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 4)
    .padEnd(2, 'X')

  const colorCode = color
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 3)
    .padEnd(2, 'X')

  const sizeCode = size
    .replace(/\s/g, '')
    .toUpperCase()
    .slice(0, 2)
    .padEnd(1, 'X')

  const fabricCode = FABRIC_CODES[fabric] ?? fabric.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4)
  const embrCode = EMBROIDERY_CODES[embroideryType] ?? embroideryType.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4)

  return `VCW-${productCode}-${colorCode}-${sizeCode}-${fabricCode}-${embrCode}`
}

/** Returns a human-readable label for a variant (used in table rows) */
export function variantLabel(v: {
  size?: string | null
  color?: string | null
  fabric?: string | null
  embroideryType?: string | null
}): string {
  return [v.color, v.size, v.fabric, v.embroideryType].filter(Boolean).join(' / ')
}

export { FABRIC_CODES, EMBROIDERY_CODES }
