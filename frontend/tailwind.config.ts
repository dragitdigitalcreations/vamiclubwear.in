import type { Config } from 'tailwindcss'

// Brand palette from CLAUDE.md visual spec:
// Background: Deep Charcoal #121212
// Surfaces:   Soft Black  #1E1E1E
// Primary:    Mocha Mousse #5C4033

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
        // Core surfaces — all solid, hide texture beneath them
        background: '#121212',
        surface: {
          DEFAULT:  '#1E1E1E',
          elevated: '#2A2A2A',
          overlay:  '#303030',
        },
        border: '#333333',
        input:  '#2A2A2A',
        ring:   '#5C4033',

        // Primary — Mocha Mousse
        primary: {
          DEFAULT:    '#5C4033',
          // Boosted from #7A5C4E → warm amber so eyebrow/accent text
          // is clearly legible on both the dark texture and surface backgrounds
          light:      '#C49060',
          dark:       '#3E2B20',
          foreground: '#F5EDE8',
        },

        // Text hierarchy — slightly boosted for legibility on textured bg
        // on-background: was #E8E0DB → #F0EAE5 (more white-directed, crisper on texture)
        'on-background': '#F0EAE5',
        // on-surface: was #C4B5AE → #D0C2BA (readable on solid dark surfaces)
        'on-surface':    '#D0C2BA',

        muted: {
          // was #8A7B74 → #A09088 (boosted so muted text still reads as
          // secondary but doesn't disappear into brownish texture tiles)
          DEFAULT:    '#A09088',
          foreground: '#7A6E68',
        },

        // Semantic
        accent: {
          DEFAULT:    '#5C4033',
          foreground: '#F5EDE8',
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
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
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
