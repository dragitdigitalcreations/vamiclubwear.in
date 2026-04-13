import type { Config } from 'tailwindcss'

// ─── Vami Clubwear Design Hierarchy ──────────────────────────────────────────
//
// COLOUR TIERS (text)
//   fg-1  #1A1A1A  — headlines, primary buttons        (strongest authority)
//   fg-2  #3D3D3D  — subheadings, primary body
//   fg-3  #666666  — secondary body, descriptions
//   fg-4  #999999  — captions, timestamps, metadata
//   fg-5  #C4C4C4  — placeholders, decorative text
//
// BRAND ACCENT (caramel)
//   brand         #8B6B47  — CTAs, eyebrows, active dots
//   brand-light   #C4956A  — hover states, light accents
//   brand-lighter #DDB896  — backgrounds, tints
//   brand-dark    #5C4033  — pressed states
//
// SURFACE TIERS (backgrounds)
//   background      #FFFFFF  — page canvas
//   surface         #FFFFFF  — cards, drawers
//   surface-raised  #FAFAFA  — slightly elevated surfaces
//   surface-elevated #F5F5F5 — inputs, chips, toolbar
//   surface-overlay  #EFEFEF — overlapping elements
//
// TYPOGRAPHY SCALE
//   display   clamp(3rem,8vw,7rem)  700  -0.03em — hero only
//   h1        clamp(2rem,5vw,3.5rem) 700  -0.025em — page titles
//   h2        clamp(1.5rem,3vw,2.25rem) 600 -0.02em — section headings
//   h3        1.25rem  600  -0.01em — card/drawer titles
//   h4        1rem     600  0       — sub-sections, labels
//   body-lg   1rem     400  0       — lead text
//   body      0.875rem 400  0       — default prose
//   body-sm   0.75rem  400  0       — supporting text
//   label     0.6875rem 600 0.1em  — uppercase tabs, badges
//   micro     0.625rem  600 0.45em — eyebrows, micro labels
//
// LOGO SIZES (use VamiLogo size prop)
//   xs  16px — favicon / compact admin
//   sm  20px — admin sidebar
//   md  28px — navbar (default)
//   lg  40px — footer
//   xl  56px — hero / splash
//
// ELEVATION (shadow-z*)
//   z0  none           — flat
//   z1  barely lifted  — hover chips
//   z2  card resting   — default card
//   z3  card hover     — focused card
//   z4  dropdown/menu  — floating elements
//   z5  drawer/modal   — highest layer

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // ── Colors ───────────────────────────────────────────────────────────────
      colors: {
        // Surfaces
        background: '#FFFFFF',
        surface: {
          DEFAULT:  '#FFFFFF',
          raised:   '#FAFAFA',
          elevated: '#F5F5F5',
          overlay:  '#EFEFEF',
        },

        // Borders & inputs
        border: '#E8E8E8',
        input:  '#E8E8E8',
        ring:   '#B0B0B0',

        // Text tiers — fg-1 strongest → fg-5 weakest
        fg: {
          '1': '#1A1A1A',
          '2': '#3D3D3D',
          '3': '#666666',
          '4': '#999999',
          '5': '#C4C4C4',
        },

        // Primary CTA (near-black) — kept for backward compat
        primary: {
          DEFAULT:    '#1A1A1A',
          dark:       '#000000',
          foreground: '#FFFFFF',
          light:      '#8B6B47',   // alias → brand
        },

        // Semantic aliases (backward compat)
        'on-background': '#1A1A1A',
        'on-surface':    '#3D3D3D',

        muted: {
          DEFAULT:    '#999999',
          foreground: '#666666',
        },

        // Brand (caramel)
        brand: {
          DEFAULT: '#8B6B47',
          light:   '#C4956A',
          lighter: '#DDB896',
          dark:    '#5C4033',
        },

        accent: {
          DEFAULT:    '#8B6B47',
          foreground: '#FFFFFF',
        },

        // Semantic
        destructive: { DEFAULT: '#D32F2F', foreground: '#FFFFFF' },
        success:     { DEFAULT: '#2E7D32', foreground: '#FFFFFF' },
        warning:     { DEFAULT: '#F59E0B', foreground: '#FFFFFF' },
        'primary-light': '#8B6B47',    // direct utility alias
      },

      // ── Typography scale ──────────────────────────────────────────────────────
      fontFamily: {
        sans:    ['var(--font-dm-sans)', 'Arial', 'Helvetica', 'sans-serif'],
        display: ['var(--font-dm-sans)', 'Arial', 'Helvetica', 'sans-serif'],
      },

      fontSize: {
        // Semantic scale
        'display':  ['clamp(3rem,8vw,7rem)',        { lineHeight: '1.0',  letterSpacing: '-0.03em',  fontWeight: '700' }],
        'h1':       ['clamp(2rem,5vw,3.5rem)',       { lineHeight: '1.08', letterSpacing: '-0.025em', fontWeight: '700' }],
        'h2':       ['clamp(1.5rem,3vw,2.25rem)',    { lineHeight: '1.15', letterSpacing: '-0.02em',  fontWeight: '600' }],
        'h3':       ['1.25rem',                      { lineHeight: '1.3',  letterSpacing: '-0.01em',  fontWeight: '600' }],
        'h4':       ['1rem',                         { lineHeight: '1.4',  letterSpacing: '0',        fontWeight: '600' }],
        'body-lg':  ['1rem',                         { lineHeight: '1.7',  letterSpacing: '0' }],
        'body':     ['0.875rem',                     { lineHeight: '1.6',  letterSpacing: '0' }],
        'body-sm':  ['0.75rem',                      { lineHeight: '1.55', letterSpacing: '0' }],
        'label':    ['0.6875rem',                    { lineHeight: '1.2',  letterSpacing: '0.1em',   fontWeight: '600' }],
        'micro':    ['0.625rem',                     { lineHeight: '1',    letterSpacing: '0.45em',  fontWeight: '600' }],
        // Keep existing
        '2xs':      ['0.625rem',                     { lineHeight: '1rem' }],
      },

      // ── Border radius ─────────────────────────────────────────────────────────
      borderRadius: {
        DEFAULT: '10px',
        xl:      '16px',
        lg:      '10px',
        md:      '8px',
        sm:      '6px',
        xs:      '4px',
        full:    '9999px',
      },

      // ── Elevation / shadows ───────────────────────────────────────────────────
      boxShadow: {
        // Semantic elevation tiers
        'z0': 'none',
        'z1': '0 1px 2px rgba(0,0,0,0.05)',
        'z2': '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
        'z3': '0 4px 16px rgba(0,0,0,0.10), 0 2px 4px rgba(0,0,0,0.06)',
        'z4': '0 8px 32px rgba(0,0,0,0.12), 0 4px 8px rgba(0,0,0,0.06)',
        'z5': '0 24px 64px rgba(0,0,0,0.15), 0 8px 24px rgba(0,0,0,0.08)',
        // Legacy aliases
        'card':       '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 16px rgba(0,0,0,0.10), 0 2px 4px rgba(0,0,0,0.06)',
        'soft':       '0 2px 8px rgba(0,0,0,0.06)',
      },

      // ── Spacing extras ────────────────────────────────────────────────────────
      spacing: {
        // Logo size scale (use as h-logo-* w-logo-*)
        'logo-xs': '1rem',      // 16px
        'logo-sm': '1.25rem',   // 20px
        'logo-md': '1.75rem',   // 28px
        'logo-lg': '2.5rem',    // 40px
        'logo-xl': '3.5rem',    // 56px
      },

      // ── Animations ────────────────────────────────────────────────────────────
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

      // ── Grid ─────────────────────────────────────────────────────────────────
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
