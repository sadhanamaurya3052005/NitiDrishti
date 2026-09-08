'use client';

import { useInView, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/cn';

interface CounterProps {
  /** Numeric strings animate; anything else renders as-is. */
  value: string;
  className?: string;
  durationMs?: number;
}

/** Counts up once the number scrolls into view. */
export function Counter({ value, className, durationMs = 1100 }: CounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-10% 0px' });
  const reduceMotion = useReducedMotion();
  const target = Number(value);
  const numeric = Number.isFinite(target) && value.trim() !== '';
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!numeric || !inView) return;
    if (reduceMotion || target === 0) {
      setDisplay(target);
      return;
    }

    const start = performance.now();
    let frame = requestAnimationFrame(function tick(now: number) {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - t) ** 3;
      setDisplay(Math.round(target * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    });

    return () => cancelAnimationFrame(frame);
  }, [durationMs, inView, numeric, reduceMotion, target]);

  return (
    <span ref={ref} className={cn('nd-numeric', className)}>
      {numeric ? display : value}
    </span>
  );
}

export default Counter;
