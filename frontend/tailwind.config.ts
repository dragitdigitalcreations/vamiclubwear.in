import type { Config } from 'tailwindcss'

// ─── Luxury Minimal Light Theme ──────────────────────────────────────────────
// Inspired by premium fashion editorials & drbydanarazik.com
// Background: Warm cream #FAFAF8
// Primary CTA: Near-black #1C1A18 (luxury editorial buttons)
// Brand Accent: Warm caramel #8B6B47 (preserves Vami DNA)

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Core surfaces
        background: '#FAFAF8',      // warm off-white cream
        surface: {
          DEFAULT:  '#FFFFFF',      // pure white
          elevated: '#F4F1ED',      // very light warm
          overlay:  '#EDE9E3',      // warm overlay
        },
        border: '#E5E0D8',          // warm light border
        input:  '#F4F1ED',
        ring:   '#1C1A18',

        // Primary — near-black for luxury buttons + caramel accent
        primary: {
          DEFAULT:    '#1C1A18',    // near-black (editorial CTA)
          light:      '#8B6B47',    // warm caramel accent (brand DNA)
          dark:       '#0D0D0C',
          foreground: '#FAFAF8',    // cream text on dark button
        },

        // Text
        'on-background': '#1C1A18',
        'on-surface':    '#2E2B28',

        muted: {
          DEFAULT:    '#9A9188',    // warm medium grey
          foreground: '#7A7068',
        },

        // Semantic
        accent: {
          DEFAULT:    '#8B6B47',
          foreground: '#FAFAF8',
        },
        destructive: {
          DEFAULT:    '#C0392B',
          foreground: '#FDECEA',
        },
        success: {
          DEFAULT:    '#27AE60',
          foreground: '#E8F8EF',
        },
      },

      fontFamily: {
        sans:    ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-playfair)', 'Georgia', 'serif'],
      },

      borderRadius: {
        lg: '2px',
        md: '2px',
        sm: '1px',
      },

      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition:  '200% 0' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
        shimmer:   'shimmer 1.5s infinite linear',
      },

      gridTemplateColumns: {
        'masonry-sm': 'repeat(2, 1fr)',
        'masonry-md': 'repeat(3, 1fr)',
        'masonry-lg': 'repeat(4, 1fr)',
      },
    },
  },
  plugins: [],
}

export default config
