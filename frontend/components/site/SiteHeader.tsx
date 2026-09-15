'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { Download, Languages, LogIn, LogOut, Moon, Sun } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { BrandingLogo } from '@/components/brand/BrandingLogo';
import { DigitalIndiaMark } from '@/components/brand/DigitalIndiaMark';
import { useSplash } from '@/components/brand/SplashProvider';
import { useExperience } from '@/components/providers/ExperienceProvider';
import { useLocale } from '@/components/providers/LocaleProvider';
import { usePwa } from '@/components/providers/PwaProvider';
import { useTheme } from '@/components/providers/ThemeProvider';
import { AuthModal } from '@/components/site/AuthModal';
import { APP } from '@/lib/config';

export function SiteHeader() {
  const { home, locale, toggleLocale } = useLocale();
  const { theme, toggleTheme } = useTheme();
  const { booted, emblemLayoutId } = useSplash();
  const { session, signOut } = useExperience();
  const { online, installAvailable, install, workerReady } = usePwa();
  const [authOpen, setAuthOpen] = useState(false);
  const { scrollY } = useScroll();
  const borderOpacity = useTransform(scrollY, [0, 80], [0, 1]);

  const pwaLabel = online
    ? workerReady
      ? locale === 'hi'
        ? 'ऑफ़लाइन इंजन तैयार'
        : 'Offline engine ready'
      : locale === 'hi'
        ? 'ऑनलाइन'
        : 'Online'
    : locale === 'hi'
      ? 'ऑफ़लाइन · IndexedDB'
      : 'Offline · IndexedDB';

  return (
    <motion.header className="nd-no-print sticky top-0 z-50 w-full overflow-visible">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-canvas/90 backdrop-blur-xl" aria-hidden />
      <motion.div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-line"
        style={{ opacity: borderOpacity }}
      />
      <div className="nd-section flex h-[var(--nd-header-h)] items-center justify-between gap-2 overflow-visible">
        <Link href="/#top" className="flex min-w-0 items-center gap-2 sm:gap-2.5">
          <DigitalIndiaMark size={34} />
          <span className="hidden h-7 w-px bg-line sm:block" aria-hidden />
          <span className="flex min-w-0 items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center">
              {booted ? (
                <BrandingLogo size={32} animated={false} layoutId={emblemLayoutId} />
              ) : (
                <span className="h-8 w-8" aria-hidden />
              )}
            </span>
            <span className="flex min-w-0 flex-col leading-none">
              <span className="font-deva text-[0.95rem] font-semibold tracking-tight text-ink sm:text-[1.05rem]">
                {APP.nameDevanagari}
              </span>
              <span className="mt-0.5 truncate text-[10px] font-semibold tracking-[0.06em] text-ink sm:text-[11px]">
                {APP.name}
              </span>
            </span>
          </span>
        </Link>

        <div className="flex items-center gap-1 sm:gap-1.5">
          <span
            className={`hidden items-center gap-1.5 rounded-pill border px-2 py-0.5 text-[10px] font-semibold md:inline-flex ${
              online ? 'border-mint/30 bg-mint-soft text-mint-deep' : 'border-amber/30 bg-amber-soft text-amber-deep'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${online ? 'bg-mint' : 'bg-amber'}`} />
            {pwaLabel}
          </span>

          {installAvailable ? (
            <button
              type="button"
              onClick={() => void install()}
              className="inline-flex h-8 w-8 items-center justify-center rounded-pill border border-line bg-surface"
              aria-label={home.pwa.install}
            >
              <Download className="h-3.5 w-3.5" />
            </button>
          ) : null}

          <button
            type="button"
            onClick={toggleLocale}
            className="inline-flex h-8 items-center gap-1 rounded-pill border border-line bg-surface px-2 text-[11px] font-semibold text-ink"
            aria-label="Language"
          >
            <Languages className="h-3.5 w-3.5 text-saffron" />
            <span>{locale === 'en' ? 'हिन्दी' : 'English'}</span>
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex h-8 w-8 items-center justify-center rounded-pill border border-line bg-surface text-ink"
            aria-label={theme === 'light' ? 'Dark mode' : 'Light mode'}
          >
            {theme === 'light' ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5 text-saffron" />}
          </button>

          {session ? (
            <>
              <span className="hidden max-w-[7.5rem] truncate text-[11px] font-semibold text-ink sm:inline">
                {session.displayName ?? home.nav.guest}
              </span>
              <button
                type="button"
                onClick={signOut}
                className="inline-flex h-8 items-center gap-1 rounded-pill border border-line bg-surface px-2.5 text-[11px] font-semibold text-ink"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{home.nav.signOut}</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setAuthOpen(true)}
              className="inline-flex h-8 items-center gap-1 rounded-pill border border-saffron/40 bg-saffron/10 px-2.5 text-[11px] font-semibold text-ink"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{home.nav.signIn}</span>
            </button>
          )}
        </div>
      </div>
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </motion.header>
  );
}

export default SiteHeader;
