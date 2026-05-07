import type { MetadataRoute } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.vamiclubwear.in'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // We deliberately leave /cart, /checkout, /profile, /my-orders, /wishlist,
        // /search, /track and /barcode crawlable here — each of those pages emits a
        // server-rendered `<meta name="robots" content="noindex">` via its own
        // layout.tsx. Disallowing them in robots.txt would prevent Googlebot from
        // ever fetching the page and seeing the noindex tag, which keeps stale URLs
        // stuck in the index. Admin and the API surface stay disallowed.
        disallow: [
          '/admin',
          '/admin/',
          '/api/',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
