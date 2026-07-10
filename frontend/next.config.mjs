/** @type {import('next').NextConfig} */
const nextConfig = {
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  productionBrowserSourceMaps: false,

  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion', 'recharts'],
  },

  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Cloudinary URLs are content-keyed per transformation (different params =
    // different URL), so the upstream is effectively immutable. Cache for a
    // year so /_next/image stays warm across cold starts on Vercel.
    minimumCacheTTL: 60 * 60 * 24 * 365,
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
    ],
  },

  async rewrites() {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ]
  },

  async headers() {
    return [
      // Long-term immutable caching for static art under /public
      {
        source: '/:asset(hero-models|modest-collection|promo-a|promo-b|promo-accent|vami-bg|logo|logo-icon).:ext(webp|png|svg|jpg|jpeg)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      // Payments + fonts
      {
        source: '/payments/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/fonts/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      // Sensible defaults — security + SEO friendliness
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options',        value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy',        value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',     value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            // Next 15 App Router streams RSC payloads via inline
            // <script>self.__next_f.push(...)</script> blocks, so 'unsafe-inline'
            // is required for hydration to succeed. Migrating this to a nonce-
            // based CSP with a middleware-generated nonce is the correct next
            // step (F4a follow-up) — until then, the CSP still meaningfully
            // reduces the blast radius of an XSS by locking down connect/frame/
            // object/base and by pinning script hosts to the platform allowlist.
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' https://checkout.razorpay.com https://accounts.google.com https://*.googletagmanager.com",
              "frame-src https://checkout.razorpay.com https://api.razorpay.com https://accounts.google.com",
              "img-src 'self' data: blob: https://res.cloudinary.com https://lh3.googleusercontent.com https://*.googleusercontent.com",
              "media-src 'self' https://res.cloudinary.com",
              "style-src 'self' 'unsafe-inline' https://accounts.google.com",
              "font-src 'self' data:",
              "connect-src 'self' https://*.razorpay.com https://accounts.google.com https://api.vamiclubwear.in",
              "object-src 'none'",
              "base-uri 'self'",
              "frame-ancestors 'self'",
              "upgrade-insecure-requests",
            ].join('; '),
          }
        ],
      },
    ]
  },
}

export default nextConfig
