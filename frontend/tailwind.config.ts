import type { Config } from 'tailwindcss';

/**
 * NitiDrishti design tokens.
 *
 * Palette intent (PROJECT_RULES Rule 8): warm ivory canvas, navy typography,
 * indigo/violet as the single primary, and one accent per content category
 * (mint = welfare, peach = opportunity, sky = policy, amber = attention,
 * rose = blocking). No pure-white pages, no dark dashboard, no rainbow cards.
 */
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: {
          DEFAULT: '#FAF7F2',
          deep: '#F3EEE4',
          tint: '#FDFCFA',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          muted: '#FBF9F5',
          raised: '#FFFEFC',
        },
        ink: {
          DEFAULT: '#0B1B3A',
          soft: '#2F4269',
          muted: '#63739A',
          faint: '#98A3BC',
        },
        line: {
          DEFAULT: '#E7E1D5',
          cool: '#DFE4EF',
          strong: '#CFC7B6',
        },
        primary: {
          50: '#EEF0FF',
          100: '#E0E3FF',
          200: '#C6CBFF',
          300: '#A3A9FB',
          400: '#7F82F2',
          500: '#5B5BE6',
          600: '#4338CA',
          700: '#372FA8',
          800: '#2E2A85',
          900: '#231F63',
          DEFAULT: '#4338CA',
        },
        violet: {
          soft: '#EFE7FD',
          DEFAULT: '#6D28D9',
          deep: '#4C1D95',
        },
        mint: {
          soft: '#E3F6EE',
          DEFAULT: '#0E9F6E',
          deep: '#046C4E',
        },
        peach: {
          soft: '#FDEBE3',
          DEFAULT: '#E9683C',
          deep: '#B03A16',
        },
        sky: {
          soft: '#E2F1FB',
          DEFAULT: '#0C86C4',
          deep: '#075985',
        },
        amber: {
          soft: '#FBEFD9',
          DEFAULT: '#C2740A',
          deep: '#8A5206',
        },
        rose: {
          soft: '#FCE7EC',
          DEFAULT: '#D22A4C',
          deep: '#9F1239',
        },
      },
      fontFamily: {
        sans: ['var(--font-jakarta)', 'system-ui', 'sans-serif'],
        deva: ['var(--font-devanagari)', 'var(--font-jakarta)', 'sans-serif'],
      },
      fontSize: {
        'display-xl': ['clamp(2.75rem, 6vw, 4.75rem)', { lineHeight: '1.02', letterSpacing: '-0.03em' }],
        display: ['clamp(2rem, 4vw, 3.25rem)', { lineHeight: '1.06', letterSpacing: '-0.025em' }],
        headline: ['clamp(1.5rem, 2.4vw, 2rem)', { lineHeight: '1.15', letterSpacing: '-0.02em' }],
        eyebrow: ['0.6875rem', { lineHeight: '1', letterSpacing: '0.18em' }],
      },
      borderRadius: {
        card: '1.25rem',
        pill: '999px',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(11, 27, 58, 0.04), 0 8px 24px -12px rgba(11, 27, 58, 0.10)',
        lift: '0 2px 4px rgba(11, 27, 58, 0.05), 0 24px 48px -20px rgba(11, 27, 58, 0.20)',
        inset: 'inset 0 1px 0 rgba(255, 255, 255, 0.7)',
        glow: '0 0 0 1px rgba(67, 56, 202, 0.14), 0 18px 50px -20px rgba(67, 56, 202, 0.35)',
      },
      backgroundImage: {
        'grid-fine':
          'linear-gradient(to right, rgba(11,27,58,0.045) 1px, transparent 1px), linear-gradient(to bottom, rgba(11,27,58,0.045) 1px, transparent 1px)',
        'aurora':
          'radial-gradient(ellipse 70% 55% at 18% 12%, rgba(109,40,217,0.13), transparent 60%), radial-gradient(ellipse 60% 50% at 82% 8%, rgba(12,134,196,0.12), transparent 62%), radial-gradient(ellipse 70% 60% at 50% 100%, rgba(14,159,110,0.10), transparent 65%)',
        'sheen': 'linear-gradient(110deg, transparent 20%, rgba(255,255,255,0.65) 50%, transparent 80%)',
      },
      backgroundSize: {
        'grid-fine': '44px 44px',
      },
      keyframes: {
        shimmer: {
          '0%': { transform: 'translateX(-120%)' },
          '100%': { transform: 'translateX(120%)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.85)', opacity: '0.55' },
          '70%': { transform: 'scale(1.35)', opacity: '0' },
          '100%': { transform: 'scale(1.35)', opacity: '0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        caret: {
          '0%, 45%': { opacity: '1' },
          '50%, 95%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.9s ease-in-out infinite',
        'pulse-ring': 'pulse-ring 2.6s cubic-bezier(0.24, 0.4, 0.36, 1) infinite',
        float: 'float 6s ease-in-out infinite',
        caret: 'caret 1.1s steps(1) infinite',
      },
      transitionTimingFunction: {
        civic: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
};

export default config;
