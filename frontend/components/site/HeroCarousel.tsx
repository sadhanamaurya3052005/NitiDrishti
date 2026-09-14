'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { useEffect, useState } from 'react';

import { useLocale } from '@/components/providers/LocaleProvider';
import { useTheme } from '@/components/providers/ThemeProvider';
import { WalkthroughFilm } from '@/components/site/Walkthrough';
import { cn } from '@/lib/cn';
import { easings } from '@/lib/motion';
import { setWalkthroughOpen } from '@/lib/tools';

const SLIDES = [
  { src: '/heroes/pm-kisan.png', alt: 'Farmer welfare delivery' },
  { src: '/heroes/mahila-shg.png', alt: 'Women self-help group livelihood' },
  { src: '/heroes/scholarship.png', alt: 'Student scholarship desk' },
  { src: '/heroes/vishwakarma.png', alt: 'Traditional artisan livelihood' },
  { src: '/heroes/analytics-map.png', alt: 'District health and delivery map' },
] as const;

export function HeroCarousel() {
  const { home, showcase } = useLocale();
  const { theme } = useTheme();
  const [index, setIndex] = useState(0);
  const [filmOpen, setFilmOpen] = useState(false);
  const [tick, setTick] = useState(0);
  const light = theme === 'light';

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % SLIDES.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [tick]);

  useEffect(() => {
    setWalkthroughOpen(filmOpen);
    return () => setWalkthroughOpen(false);
  }, [filmOpen]);

  const slide = home.hero.slides[index];

  const go = (direction: -1 | 1) => {
    setIndex((current) => (current + direction + SLIDES.length) % SLIDES.length);
    setTick((value) => value + 1);
  };

  return (
    <section id="top" className="relative isolate h-[min(72vh,520px)] overflow-hidden">
      <AnimatePresence mode="sync">
        <motion.div
          key={SLIDES[index]?.src ?? index}
          className="absolute inset-0"
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: easings.civic }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={SLIDES[index]?.src}
            alt={SLIDES[index]?.alt ?? ''}
            className="h-full w-full object-cover animate-hero-ken"
          />
          {light ? (
            <>
              <div className="absolute inset-0 bg-gradient-to-r from-[#1a3d6e]/58 via-[#1a3d6e]/22 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1a3d6e]/50 via-transparent to-[#c45c12]/12" />
            </>
          ) : (
            <>
              <div className="absolute inset-0 bg-gradient-to-r from-[#07111c]/70 via-[#07111c]/32 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#07111c]/55 via-transparent to-[#e07a14]/10" />
            </>
          )}
        </motion.div>
      </AnimatePresence>

      <button
        type="button"
        onClick={() => go(-1)}
        className="absolute left-3 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-white/90 text-[#123a6b] shadow-lift backdrop-blur-md transition hover:scale-105 hover:bg-white sm:left-6 lg:left-[max(1.5rem,calc((100vw-1200px)/2))] dark:border-white/20 dark:bg-white/15 dark:text-white dark:hover:bg-white/25"
        aria-label="Previous slide"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>
      <button
        type="button"
        onClick={() => go(1)}
        className="absolute right-3 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-white/90 text-[#123a6b] shadow-lift backdrop-blur-md transition hover:scale-105 hover:bg-white sm:right-6 lg:right-[max(1.5rem,calc((100vw-1200px)/2))] dark:border-white/20 dark:bg-white/15 dark:text-white dark:hover:bg-white/25"
        aria-label="Next slide"
      >
        <ChevronRight className="h-6 w-6" />
      </button>

      <div className="relative nd-section flex h-full flex-col justify-end px-12 pb-10 pt-16 sm:px-16 sm:pb-12">
        <p className="nd-chip w-fit border-white/20 bg-white/15 text-white backdrop-blur">{slide?.kicker}</p>
        <h1 className="mt-4 max-w-4xl font-deva text-display font-semibold text-white drop-shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
          {slide?.title}
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-white/90 sm:text-base">{slide?.body}</p>

        <div className="mt-7 flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={() => setFilmOpen(true)}
            className="group inline-flex items-center gap-2.5 rounded-pill border border-white/30 bg-white/15 py-1.5 pl-1.5 pr-4 text-white shadow-soft backdrop-blur-md transition hover:bg-white/25"
          >
            <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-saffron text-white">
              <span className="absolute inset-0 animate-pulse-ring rounded-full border border-white/70" />
              <Play className="h-3.5 w-3.5 fill-current" />
            </span>
            <span className="text-sm font-semibold tracking-tight">{showcase.hero.walkthroughEyebrow}</span>
          </button>
          <div className="flex max-w-sm flex-1 gap-2">
            {SLIDES.map((item, slideIndex) => (
              <button
                key={item.src}
                type="button"
                aria-label={home.hero.slides[slideIndex]?.title ?? `Slide ${slideIndex + 1}`}
                onClick={() => {
                  setIndex(slideIndex);
                  setTick((value) => value + 1);
                }}
                className={cn('h-1.5 flex-1 overflow-hidden rounded-pill bg-white/30')}
              >
                <span
                  className={cn('block h-full rounded-pill bg-saffron transition-all duration-500', slideIndex === index ? 'w-full' : 'w-0')}
                />
              </button>
            ))}
          </div>
        </div>
      </div>

      <WalkthroughFilm open={filmOpen} onClose={() => setFilmOpen(false)} />
    </section>
  );
}
