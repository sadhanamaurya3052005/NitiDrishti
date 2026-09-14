import type { Config } from 'tailwindcss';

/**
 * Semantic colours read CSS variables so light, dark and high-contrast
 * themes stay in one place (globals.css). Accents stay vivid in both modes.
 */
const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: {
          DEFAULT: 'rgb(var(--nd-canvas) / <alpha-value>)',
          deep: 'rgb(var(--nd-canvas-deep) / <alpha-value>)',
          tint: 'rgb(var(--nd-canvas-tint) / <alpha-value>)',
        },
        surface: {
          DEFAULT: 'rgb(var(--nd-surface) / <alpha-value>)',
          muted: 'rgb(var(--nd-surface-muted) / <alpha-value>)',
          raised: 'rgb(var(--nd-surface-raised) / <alpha-value>)',
        },
        ink: {
          DEFAULT: 'rgb(var(--nd-ink) / <alpha-value>)',
          soft: 'rgb(var(--nd-ink-soft) / <alpha-value>)',
          muted: 'rgb(var(--nd-ink-muted) / <alpha-value>)',
          faint: 'rgb(var(--nd-ink-faint) / <alpha-value>)',
        },
        line: {
          DEFAULT: 'rgb(var(--nd-line) / <alpha-value>)',
          cool: 'rgb(var(--nd-line-cool) / <alpha-value>)',
          strong: 'rgb(var(--nd-line-strong) / <alpha-value>)',
        },
        saffron: {
          soft: 'rgb(var(--nd-saffron-soft) / <alpha-value>)',
          DEFAULT: 'rgb(var(--nd-saffron) / <alpha-value>)',
          deep: 'rgb(var(--nd-saffron-deep) / <alpha-value>)',
        },
        navy: {
          DEFAULT: 'rgb(var(--nd-navy) / <alpha-value>)',
          deep: 'rgb(var(--nd-navy-deep) / <alpha-value>)',
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
          DEFAULT: 'rgb(var(--nd-primary) / <alpha-value>)',
        },
        mint: {
          soft: 'rgb(var(--nd-mint-soft) / <alpha-value>)',
          DEFAULT: 'rgb(var(--nd-mint) / <alpha-value>)',
          deep: 'rgb(var(--nd-mint-deep) / <alpha-value>)',
        },
        peach: {
          soft: 'rgb(var(--nd-peach-soft) / <alpha-value>)',
          DEFAULT: 'rgb(var(--nd-peach) / <alpha-value>)',
          deep: 'rgb(var(--nd-peach-deep) / <alpha-value>)',
        },
        sky: {
          soft: 'rgb(var(--nd-sky-soft) / <alpha-value>)',
          DEFAULT: 'rgb(var(--nd-sky) / <alpha-value>)',
          deep: 'rgb(var(--nd-sky-deep) / <alpha-value>)',
        },
        amber: {
          soft: 'rgb(var(--nd-amber-soft) / <alpha-value>)',
          DEFAULT: 'rgb(var(--nd-amber) / <alpha-value>)',
          deep: 'rgb(var(--nd-amber-deep) / <alpha-value>)',
        },
        rose: {
          soft: 'rgb(var(--nd-rose-soft) / <alpha-value>)',
          DEFAULT: 'rgb(var(--nd-rose) / <alpha-value>)',
          deep: 'rgb(var(--nd-rose-deep) / <alpha-value>)',
        },
        violet: {
          soft: 'rgb(var(--nd-violet-soft) / <alpha-value>)',
          DEFAULT: 'rgb(var(--nd-violet) / <alpha-value>)',
          deep: 'rgb(var(--nd-violet-deep) / <alpha-value>)',
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
        soft: 'var(--nd-shadow-soft)',
        lift: 'var(--nd-shadow-lift)',
        inset: 'inset 0 1px 0 rgb(var(--nd-glass-highlight) / 0.7)',
        glow: 'var(--nd-shadow-glow)',
      },
      backgroundImage: {
        'grid-fine':
          'linear-gradient(to right, rgb(var(--nd-ink) / 0.045) 1px, transparent 1px), linear-gradient(to bottom, rgb(var(--nd-ink) / 0.045) 1px, transparent 1px)',
        aurora: 'var(--nd-aurora)',
        sheen: 'linear-gradient(110deg, transparent 20%, rgb(var(--nd-glass-highlight) / 0.55) 50%, transparent 80%)',
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
        'eq-bar': {
          '0%, 100%': { height: '6px' },
          '50%': { height: '18px' },
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
        'hero-ken': {
          '0%': { transform: 'scale(1.04) translate3d(0, 0, 0)' },
          '100%': { transform: 'scale(1.12) translate3d(-1.5%, 1%, 0)' },
        },
        orbit: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.9s ease-in-out infinite',
        'pulse-ring': 'pulse-ring 2.6s cubic-bezier(0.24, 0.4, 0.36, 1) infinite',
        float: 'float 6s ease-in-out infinite',
        caret: 'caret 1.1s steps(1) infinite',
        'hero-ken': 'hero-ken 18s ease-in-out alternate infinite',
        orbit: 'orbit 22s linear infinite',
        marquee: 'marquee 36s linear infinite',
        'eq-bar': 'eq-bar 0.7s ease-in-out infinite',
      },
      transitionTimingFunction: {
        civic: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
};

export default config;
