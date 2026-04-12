import type { Config } from 'tailwindcss'

// ─── Color system matching drbydanarazik.com reference ───────────────────────
// Background:   #FFFFFF (pure white)
// Foreground:   #252525 (near-black)
// Border:       #EAEAEA (cool light grey)
// Muted text:   #8D8D8D (medium cool grey)
// Primary CTA:  #252525 (near-black buttons)
// Brand accent: #8B6B47 (warm caramel — Vami identity)
// Font:         DM Sans (free match to Metropolis)
// Radius:       10px (matches reference --radius: .625rem)

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
        background: '#FFFFFF',
        surface: {
          DEFAULT:  '#FFFFFF',
          elevated: '#F7F7F7',
          overlay:  '#EFEFEF',
        },
        border: '#EAEAEA',
        input:  '#EAEAEA',
        ring:   '#B5B5B5',

        primary: {
          DEFAULT:    '#252525',    // near-black editorial CTA
          light:      '#8B6B47',    // warm caramel brand accent
          dark:       '#0D0D0D',
          foreground: '#FFFFFF',
        },

        'on-background': '#252525',
        'on-surface':    '#333333',

        muted: {
          DEFAULT:    '#8D8D8D',    // cool medium grey (secondary text)
          foreground: '#6A6A6A',
        },

        accent: {
          DEFAULT:    '#8B6B47',
          foreground: '#FFFFFF',
        },
        destructive: {
          DEFAULT:    '#D32F2F',
          foreground: '#FFFFFF',
        },
        success: {
          DEFAULT:    '#2E7D32',
          foreground: '#FFFFFF',
        },
      },

      fontFamily: {
        // DM Sans for everything — matches Metropolis used by reference
        sans:    ['var(--font-dm-sans)', 'Arial', 'Helvetica', 'sans-serif'],
        display: ['var(--font-dm-sans)', 'Arial', 'Helvetica', 'sans-serif'],
      },

      fontSize: {
        // Reference-accurate scales
        '2xs': ['0.625rem', { lineHeight: '1rem' }],
      },

      borderRadius: {
        DEFAULT: '10px',
        lg:      '10px',
        md:      '8px',
        sm:      '6px',
        full:    '9999px',
      },

      boxShadow: {
        card:       '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 16px rgba(0,0,0,0.10), 0 2px 4px rgba(0,0,0,0.06)',
        soft:       '0 2px 8px rgba(0,0,0,0.06)',
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
