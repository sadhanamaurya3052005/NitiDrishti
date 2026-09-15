'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';

import { BrandingLogo } from '@/components/brand/BrandingLogo';
import { APP } from '@/lib/config';
import { easings } from '@/lib/motion';

interface SplashScreenProps {
  onDone: () => void;
  emblemLayoutId: string;
}

const BOOT_DURATION_MS = 3200;
const BOOT_DURATION_REDUCED_MS = 700;

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

export function SplashScreen({ onDone, emblemLayoutId }: SplashScreenProps) {
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
        handoffTimer = window.setTimeout(finish, 280);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(handoffTimer);
    };
  }, [finish, reduceMotion]);

  return (
    <motion.div
      id="nd-splash"
      className="fixed inset-0 z-[70] flex items-center justify-center overflow-hidden bg-canvas"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.02, filter: 'blur(8px)' }}
      transition={{ duration: 0.55, ease: easings.exit }}
      aria-label="NitiDrishti"
      role="status"
      onClick={finish}
    >
      <div className="relative flex w-full max-w-sm flex-col items-center px-6 text-center">
        <div className="relative flex h-40 w-40 items-center justify-center sm:h-44 sm:w-44">
          {!handoff && <BrandingLogo size={148} glow layoutId={emblemLayoutId} />}
        </div>

        <p className="mt-5 text-[2rem] font-semibold tracking-tight text-ink sm:text-[2.4rem]">{APP.name}</p>

        <div className="mt-8 h-1.5 w-full overflow-hidden rounded-pill bg-line">
          <motion.div
            className="h-full rounded-pill bg-gradient-to-r from-saffron via-[#C9A227] to-[rgb(var(--nd-navy))] dark:to-[rgb(var(--nd-canvas-tint))]"
            animate={{ width: `${progress}%` }}
            transition={{ ease: 'linear', duration: 0.12 }}
          />
        </div>
      </div>
    </motion.div>
  );
}

export default SplashScreen;
