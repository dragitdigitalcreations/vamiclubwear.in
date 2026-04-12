/**
 * Cloudinary URL transformer — auto-applies WebP/AVIF, quality, and resize
 * without adding any Cloudinary SDK dependency.
 *
 * Works with Cloudinary delivery URLs that follow the pattern:
 *   https://res.cloudinary.com/<cloud>/image/upload/.../<public-id>
 *
 * If the URL is NOT a Cloudinary URL, it's returned unchanged.
 */

interface CloudinaryOptions {
  w?: number   // width
  h?: number   // height
  q?: number   // quality 1-100 (default 80)
  format?: 'auto' | 'webp' | 'avif'
  crop?: 'fill' | 'fit' | 'crop' | 'limit' | 'thumb'
}

export function cloudinaryUrl(url: string, opts: CloudinaryOptions = {}): string {
  if (!url || !url.includes('res.cloudinary.com')) return url

  const {
    w,
    h,
    q      = 80,
    format = 'auto',
    crop   = 'fill',
  } = opts

  const transforms: string[] = [
    `f_${format}`,
    `q_${q}`,
    ...(w ? [`w_${w}`] : []),
    ...(h ? [`h_${h}`] : []),
    ...(w || h ? [`c_${crop}`] : []),
  ]

  const t = transforms.join(',')

  // Insert transformation string after /upload/
  return url.replace('/upload/', `/upload/${t}/`)
}

/**
 * Responsive srcset helper — generates 3 widths for Next.js Image
 */
export function cloudinarySrcSet(url: string, widths = [400, 800, 1200]) {
  return widths
    .map((w) => `${cloudinaryUrl(url, { w, q: 80 })} ${w}w`)
    .join(', ')
}
