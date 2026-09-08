'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Check, ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { BrandingLogo } from '@/components/brand/BrandingLogo';
import { useLocale } from '@/components/providers/LocaleProvider';
import { APP } from '@/lib/config';
import { easings, stagger, wordReveal } from '@/lib/motion';

interface SplashScreenProps {
  /** Called once the boot sequence finishes (or is skipped). */
  onDone: () => void;
  /** Shared-element id handed over to the header emblem. */
  emblemLayoutId: string;
}

const BOOT_DURATION_MS = 2600;
const BOOT_DURATION_REDUCED_MS = 700;

/** Progress eases out so the last few percent do not feel stuck. */
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
    // Both updates are batched into one commit: this emblem unmounts in the same
    // frame the header emblem mounts, which is what lets Framer morph between
    // them instead of cross-fading.
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
        handoffTimer = window.setTimeout(finish, 320);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(handoffTimer);
    };
  }, [finish, reduceMotion]);

  const activeStep = progress >= 72 ? 2 : progress >= 34 ? 1 : 0;
  const taglineWords = APP.tagline.split(' ');

  return (
    <motion.div
      id="nd-splash"
      className="fixed inset-0 z-[70] flex items-center justify-center overflow-hidden bg-canvas"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.015, filter: 'blur(6px)' }}
      transition={{ duration: 0.55, ease: easings.exit }}
      aria-label="NitiDrishti is starting"
      role="status"
    >
      <div className="pointer-events-none absolute inset-0 bg-aurora" />
      <div className="pointer-events-none absolute inset-0 nd-grid-bg opacity-[0.5] nd-mask-fade-b" />

      <button
        type="button"
        onClick={finish}
        className="absolute right-5 top-5 rounded-pill border border-line bg-surface/80 px-3.5 py-1.5 text-xs font-medium text-ink-muted backdrop-blur transition hover:text-ink"
      >
        {copy.splash.skip}
      </button>

      <div className="relative flex w-full max-w-lg flex-col items-center px-6 text-center">
        <div className="relative flex h-40 w-40 items-center justify-center">
          {!reduceMotion && (
            <span className="absolute h-32 w-32 animate-pulse-ring rounded-full border border-primary/30" />
          )}
          {!handoff && <BrandingLogo size={132} glow layoutId={emblemLayoutId} />}
        </div>

        <motion.div
          className="mt-7 flex flex-col items-center"
          variants={stagger(0.35, 0.045)}
          initial="hidden"
          animate="visible"
        >
          <div className="flex items-baseline gap-[0.05em] text-[2.35rem] font-semibold tracking-tight text-ink sm:text-[2.75rem]">
            {'NitiDrishti'.split('').map((letter, index) => (
              <motion.span key={`${letter}-${index}`} variants={wordReveal}>
                {letter}
              </motion.span>
            ))}
          </div>
          <motion.p variants={wordReveal} className="mt-1 font-deva text-lg text-ink-muted">
            {APP.nameDevanagari}
          </motion.p>
        </motion.div>

        <motion.p
          className="mt-5 flex flex-wrap justify-center gap-x-1.5 text-sm font-medium text-ink-soft sm:text-base"
          variants={stagger(0.85, 0.055)}
          initial="hidden"
          animate="visible"
        >
          {taglineWords.map((word, index) => (
            <motion.span key={`${word}-${index}`} variants={wordReveal}>
              {word}
            </motion.span>
          ))}
          <motion.span
            variants={wordReveal}
            className="ml-0.5 inline-block h-[1.05em] w-[2px] animate-caret bg-primary align-middle"
          />
        </motion.p>

        <motion.div
          className="mt-10 w-full"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.15, duration: 0.5, ease: easings.civic }}
        >
          <div className="flex items-end justify-between">
            <span className="nd-eyebrow">{copy.splash.boot[activeStep]}</span>
            <span className="nd-numeric text-sm font-semibold text-primary">{progress}%</span>
          </div>

          <div className="mt-2.5 h-[5px] w-full overflow-hidden rounded-pill bg-canvas-deep">
            <motion.div
              className="h-full rounded-pill bg-gradient-to-r from-sky via-primary to-violet"
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
                  className={`flex items-center gap-2 text-xs transition-colors duration-300 ${
                    complete ? 'text-mint-deep' : index === activeStep ? 'text-ink-soft' : 'text-ink-faint'
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                      complete
                        ? 'border-mint bg-mint-soft'
                        : index === activeStep
                          ? 'border-primary/50 bg-primary/10'
                          : 'border-line bg-surface'
                    }`}
                  >
                    {complete ? (
                      <Check className="h-2.5 w-2.5 text-mint-deep" strokeWidth={3} />
                    ) : (
                      <span className="h-1 w-1 rounded-full bg-current opacity-60" />
                    )}
                  </span>
                  {line}
                </li>
              );
            })}
          </ul>
        </motion.div>

        <motion.div
          className="mt-9 inline-flex items-center gap-2 rounded-pill border border-line bg-surface/85 px-3.5 py-1.5 text-[11px] font-medium text-ink-muted backdrop-blur"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.5 }}
        >
          <ShieldCheck className="h-3.5 w-3.5 text-mint-deep" />
          {copy.splash.badge}
        </motion.div>
      </div>
    </motion.div>
  );
}

export default SplashScreen;
