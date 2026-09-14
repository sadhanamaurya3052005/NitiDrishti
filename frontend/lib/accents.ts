import type { Accent } from '@/types';

/**
 * One accent per content category. Class strings are written out in full so
 * Tailwind can see them at build time.
 */
export interface AccentClasses {
  icon: string;
  text: string;
  chip: string;
  bar: string;
  hoverBorder: string;
  hoverShadow: string;
}

export const ACCENTS: Record<Accent, AccentClasses> = {
  primary: {
    icon: 'bg-primary-50 text-primary-700 ring-1 ring-primary-100',
    text: 'text-primary-700',
    chip: 'border-primary-100 bg-primary-50 text-primary-700',
    bar: 'bg-primary',
    hoverBorder: 'hover:border-primary-200',
    hoverShadow: 'hover:shadow-[0_24px_48px_-24px_rgba(67,56,202,0.35)]',
  },
  violet: {
    icon: 'bg-violet-soft text-violet-deep ring-1 ring-violet/15',
    text: 'text-violet-deep',
    chip: 'border-violet/20 bg-violet-soft text-violet-deep',
    bar: 'bg-violet',
    hoverBorder: 'hover:border-violet/30',
    hoverShadow: 'hover:shadow-[0_24px_48px_-24px_rgba(109,40,217,0.35)]',
  },
  mint: {
    icon: 'bg-mint-soft text-mint-deep ring-1 ring-mint/15',
    text: 'text-mint-deep',
    chip: 'border-mint/20 bg-mint-soft text-mint-deep',
    bar: 'bg-mint',
    hoverBorder: 'hover:border-mint/30',
    hoverShadow: 'hover:shadow-[0_24px_48px_-24px_rgba(14,159,110,0.32)]',
  },
  peach: {
    icon: 'bg-peach-soft text-peach-deep ring-1 ring-peach/15',
    text: 'text-peach-deep',
    chip: 'border-peach/20 bg-peach-soft text-peach-deep',
    bar: 'bg-peach',
    hoverBorder: 'hover:border-peach/30',
    hoverShadow: 'hover:shadow-[0_24px_48px_-24px_rgba(233,104,60,0.32)]',
  },
  sky: {
    icon: 'bg-sky-soft text-sky-deep ring-1 ring-sky/15',
    text: 'text-sky-deep',
    chip: 'border-sky/20 bg-sky-soft text-sky-deep',
    bar: 'bg-sky',
    hoverBorder: 'hover:border-sky/30',
    hoverShadow: 'hover:shadow-[0_24px_48px_-24px_rgba(12,134,196,0.32)]',
  },
  amber: {
    icon: 'bg-amber-soft text-amber-deep ring-1 ring-amber/15',
    text: 'text-amber-deep',
    chip: 'border-amber/20 bg-amber-soft text-amber-deep',
    bar: 'bg-amber',
    hoverBorder: 'hover:border-amber/30',
    hoverShadow: 'hover:shadow-[0_24px_48px_-24px_rgba(194,116,10,0.32)]',
  },
  saffron: {
    icon: 'bg-saffron-soft text-saffron-deep ring-1 ring-saffron/20',
    text: 'text-saffron-deep',
    chip: 'border-saffron/25 bg-saffron-soft text-saffron-deep',
    bar: 'bg-saffron',
    hoverBorder: 'hover:border-saffron/40',
    hoverShadow: 'hover:shadow-[0_24px_48px_-24px_rgba(196,92,18,0.38)]',
  },
};
