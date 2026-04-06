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
        // Core surfaces
        background: '#121212',
        surface: {
          DEFAULT: '#1E1E1E',
          elevated: '#2A2A2A',
          overlay: '#303030',
        },
        border: '#333333',
        input: '#2A2A2A',
        ring: '#5C4033',

        // Primary — Mocha Mousse
        primary: {
          DEFAULT: '#5C4033',
          light: '#7A5C4E',
          dark: '#3E2B20',
          foreground: '#F5EDE8',
        },

        // Text hierarchy
        'on-background': '#E8E0DB',  // high emphasis
        'on-surface': '#C4B5AE',     // medium emphasis
        muted: {
          DEFAULT: '#8A7B74',
          foreground: '#6B5E58',
        },

        // Semantic
        accent: {
          DEFAULT: '#5C4033',
          foreground: '#F5EDE8',
        },
        destructive: {
          DEFAULT: '#C0392B',
          foreground: '#FDECEA',
        },
        success: {
          DEFAULT: '#27AE60',
          foreground: '#E8F8EF',
        },
      },

      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
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
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
        shimmer: 'shimmer 1.5s infinite linear',
      },

      // Masonry grid support (mobile-first asymmetric layout per CLAUDE.md)
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
