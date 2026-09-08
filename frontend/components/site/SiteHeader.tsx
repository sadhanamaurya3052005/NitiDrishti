'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { Languages } from 'lucide-react';

import { BrandingLogo } from '@/components/brand/BrandingLogo';
import { useSplash } from '@/components/brand/SplashProvider';
import { useLocale } from '@/components/providers/LocaleProvider';
import { APP } from '@/lib/config';

const NAV_ITEMS = [
  { href: '#workspaces', key: 'workspaces' },
  { href: '#capabilities', key: 'capabilities' },
  { href: '#data', key: 'data' },
  { href: '#architecture', key: 'architecture' },
] as const;

/**
 * Sticky shell header. The emblem mounts only after the splash releases it, so
 * the logo appears to fly from the boot screen into this bar.
 */
export function SiteHeader() {
  const { copy } = useLocale();
  const { booted, emblemLayoutId } = useSplash();
  const { scrollY } = useScroll();
  const borderOpacity = useTransform(scrollY, [0, 90], [0, 1]);
  const boxShadow = useTransform(
    scrollY,
    [0, 120],
    ['0 12px 32px -24px rgba(11,27,58,0)', '0 12px 32px -24px rgba(11,27,58,0.55)'],
  );

  return (
    <motion.header
      className="nd-no-print sticky top-0 z-50 w-full bg-canvas/80 backdrop-blur-xl"
      style={{ boxShadow }}
    >
      <motion.div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-line"
        style={{ opacity: borderOpacity }}
      />

      <div className="nd-section flex h-[var(--nd-header-h)] items-center justify-between gap-4">
        <a href="#top" className="flex items-center gap-3 rounded-lg" aria-label={APP.name}>
          <span className="flex h-9 w-9 items-center justify-center">
            {booted ? (
              <BrandingLogo size={36} animated={false} layoutId={emblemLayoutId} />
            ) : (
              <span className="h-9 w-9" aria-hidden />
            )}
          </span>
          <span className="flex flex-col leading-none">
            <span className="text-[0.95rem] font-semibold tracking-tight text-ink">{APP.name}</span>
            <span className="font-deva text-[0.7rem] text-ink-muted">{APP.nameDevanagari}</span>
          </span>
        </a>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Sections">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-pill px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-canvas-deep hover:text-ink"
            >
              {copy.nav[item.key]}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <span className="hidden rounded-pill border border-line bg-surface px-2.5 py-1 text-[11px] font-medium text-ink-muted lg:inline-flex">
            v{APP.version} · {APP.buildPhase}
          </span>
          <LanguageToggle />
        </div>
      </div>
    </motion.header>
  );
}

function LanguageToggle() {
  const { copy, locale, toggleLocale } = useLocale();

  return (
    <button
      type="button"
      onClick={toggleLocale}
      aria-label={locale === 'en' ? 'हिन्दी में बदलें' : 'Switch to English'}
      className="inline-flex items-center gap-1.5 rounded-pill border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink-soft transition hover:border-line-strong hover:text-ink active:scale-[0.97]"
    >
      <Languages className="h-3.5 w-3.5 text-primary" />
      {copy.nav.languageLabel}
    </button>
  );
}

export default SiteHeader;
