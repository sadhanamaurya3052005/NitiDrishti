'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Check, ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { BrandingLogo } from '@/components/brand/BrandingLogo';
import { useLocale } from '@/components/providers/LocaleProvider';
import { APP } from '@/lib/config';
import { easings, stagger, wordReveal } from '@/lib/motion';

interface SplashScreenProps {
  onDone: () => void;
  emblemLayoutId: string;
}

const BOOT_DURATION_MS = 3800;
const BOOT_DURATION_REDUCED_MS = 700;

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

export function SplashScreen({ onDone, emblemLayoutId }: SplashScreenProps) {
  const { copy } = useLocale();
  const reduceMotion = useReducedMotion();
  const [progress, setProgress] = useState(0);
  const [handoff, setHandoff] = useState(false);
  const finished = useRef(false);

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    setHandoff(true);
    onDone();
  }, [onDone]);

  useEffect(() => {
    const duration = reduceMotion ? BOOT_DURATION_REDUCED_MS : BOOT_DURATION_MS;
    const start = performance.now();
    let frame = 0;
    let handoffTimer = 0;

    const tick = (now: number) => {
      const elapsed = now - start;
      const value = Math.min(100, Math.round(easeOutCubic(Math.min(1, elapsed / duration)) * 100));
      setProgress(value);

      if (elapsed < duration) {
        frame = requestAnimationFrame(tick);
      } else {
        handoffTimer = window.setTimeout(finish, 380);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(handoffTimer);
    };
  }, [finish, reduceMotion]);

  const activeStep = progress >= 72 ? 2 : progress >= 34 ? 1 : 0;

  return (
    <motion.div
      id="nd-splash"
      className="fixed inset-0 z-[70] flex items-center justify-center overflow-hidden bg-navy-deep"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.02, filter: 'blur(8px)' }}
      transition={{ duration: 0.65, ease: easings.exit }}
      aria-label="NitiDrishti is starting"
      role="status"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(232,119,34,0.28),transparent_42%),radial-gradient(circle_at_80%_10%,rgba(80,140,220,0.2),transparent_40%)]" />
      <div className="pointer-events-none absolute inset-0 nd-grid-bg opacity-30 nd-mask-fade-b" />

      {!reduceMotion && (
        <>
          <span className="pointer-events-none absolute h-[28rem] w-[28rem] rounded-full border border-saffron/20 animate-orbit" />
          <span className="pointer-events-none absolute h-[36rem] w-[36rem] rounded-full border border-white/10 animate-orbit [animation-duration:36s]" />
        </>
      )}

      <button
        type="button"
        onClick={finish}
        className="absolute right-5 top-5 rounded-pill border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-medium text-white/80 backdrop-blur transition hover:text-white"
      >
        {copy.splash.skip}
      </button>

      <div className="relative flex w-full max-w-lg flex-col items-center px-6 text-center">
        <div className="relative flex h-48 w-48 items-center justify-center">
          {!reduceMotion && (
            <span className="absolute h-40 w-40 animate-pulse-ring rounded-full border border-saffron/40" />
          )}
          {!handoff && <BrandingLogo size={148} glow layoutId={emblemLayoutId} />}
        </div>

        <motion.div
          className="mt-6 flex flex-col items-center"
          variants={stagger(0.3, 0.04)}
          initial="hidden"
          animate="visible"
        >
          <div className="flex items-baseline gap-[0.04em] text-[2.5rem] font-semibold tracking-tight text-white sm:text-[3.1rem]">
            {'NitiDrishti'.split('').map((letter, index) => (
              <motion.span key={`${letter}-${index}`} variants={wordReveal}>
                {letter}
              </motion.span>
            ))}
          </div>
          <motion.p variants={wordReveal} className="mt-1 font-deva text-2xl text-saffron">
            {APP.nameDevanagari}
          </motion.p>
          <motion.p variants={wordReveal} className="mt-3 text-xs font-semibold uppercase tracking-[0.22em] text-white/60">
            {APP.subtitle}
          </motion.p>
        </motion.div>

        <motion.p
          className="mt-6 flex flex-wrap justify-center gap-x-1.5 text-sm font-medium text-white/80"
          variants={stagger(0.7, 0.05)}
          initial="hidden"
          animate="visible"
        >
          {APP.tagline.split(' ').map((word, index) => (
            <motion.span key={`${word}-${index}`} variants={wordReveal}>
              {word}
            </motion.span>
          ))}
          <motion.span
            variants={wordReveal}
            className="ml-0.5 inline-block h-[1.05em] w-[2px] animate-caret bg-saffron align-middle"
          />
        </motion.p>

        <motion.div
          className="mt-10 w-full"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.5, ease: easings.civic }}
        >
          <div className="flex items-end justify-between text-white/70">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em]">{copy.splash.boot[activeStep]}</span>
            <span className="nd-numeric text-sm font-semibold text-saffron">{progress}%</span>
          </div>
          <div className="mt-2.5 h-[5px] w-full overflow-hidden rounded-pill bg-white/10">
            <motion.div
              className="h-full rounded-pill bg-gradient-to-r from-saffron via-white to-sky"
              animate={{ width: `${progress}%` }}
              transition={{ ease: 'linear', duration: 0.12 }}
            />
          </div>
          <ul className="mt-4 space-y-1.5 text-left">
            {copy.splash.boot.map((line, index) => {
              const complete = index < activeStep || progress === 100;
              return (
                <li
                  key={line}
                  className={`flex items-center gap-2 text-xs ${
                    complete ? 'text-mint' : index === activeStep ? 'text-white/80' : 'text-white/35'
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                      complete ? 'border-mint bg-mint/20' : 'border-white/20'
                    }`}
                  >
                    {complete ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : <span className="h-1 w-1 rounded-full bg-current" />}
                  </span>
                  {line}
                </li>
              );
            })}
          </ul>
        </motion.div>

        <motion.div
          className="mt-9 inline-flex items-center gap-2 rounded-pill border border-white/15 bg-white/10 px-3.5 py-1.5 text-[11px] font-medium text-white/75 backdrop-blur"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.5 }}
        >
          <ShieldCheck className="h-3.5 w-3.5 text-mint" />
          {copy.splash.badge}
        </motion.div>
      </div>
    </motion.div>
  );
}

export default SplashScreen;
