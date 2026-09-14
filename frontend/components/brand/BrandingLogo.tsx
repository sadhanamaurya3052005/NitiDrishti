'use client';

import { motion } from 'framer-motion';

import { cn } from '@/lib/cn';
import { springs } from '@/lib/motion';

interface BrandingLogoProps {
  size?: number;
  className?: string;
  animated?: boolean;
  glow?: boolean;
  layoutId?: string;
}

/** Civic ND mark — tricolour cap, navy field, gold ring. No mascot. */
export function BrandingLogo({
  size = 96,
  className,
  animated: _animated = true,
  glow = false,
  layoutId,
}: BrandingLogoProps) {
  return (
    <motion.div
      layoutId={layoutId}
      className={cn('relative shrink-0', className)}
      style={{ width: size, height: size }}
      initial={layoutId ? false : { scale: 0.82, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={layoutId ? springs.morph : springs.emblem}
    >
      {glow ? (
        <span className="pointer-events-none absolute inset-[-12%] rounded-[28%] bg-saffron/35 blur-xl" aria-hidden />
      ) : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/nitidrishti-mark.png"
        alt="NitiDrishti"
        width={size}
        height={size}
        className="relative h-full w-full object-contain"
      />
    </motion.div>
  );
}

export default BrandingLogo;
