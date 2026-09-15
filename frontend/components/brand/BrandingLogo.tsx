'use client';

import { motion } from 'framer-motion';
import { useId } from 'react';

import { cn } from '@/lib/cn';
import { springs } from '@/lib/motion';

interface BrandingLogoProps {
  size?: number;
  className?: string;
  animated?: boolean;
  glow?: boolean;
  layoutId?: string;
}

/**
 * Civic seal — circular government mark, tricolour band, ND letters.
 * Field and letters follow light / dark theme; national colours stay fixed.
 */
export function BrandingLogo({
  size = 96,
  className,
  animated: _animated = true,
  glow = false,
  layoutId,
}: BrandingLogoProps) {
  const uid = useId().replace(/:/g, '');
  const clip = `nd-seal-${uid}`;

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
        <span className="pointer-events-none absolute inset-[-10%] rounded-full bg-saffron/30 blur-xl dark:bg-saffron/40" aria-hidden />
      ) : null}
      <svg viewBox="0 0 96 96" width={size} height={size} className="relative" role="img" aria-label="NitiDrishti">
        <defs>
          <clipPath id={clip}>
            <circle cx="48" cy="48" r="40" />
          </clipPath>
        </defs>

        <circle cx="48" cy="48" r="47" className="fill-ink" />
        <circle cx="48" cy="48" r="45.2" fill="none" stroke="#C9A227" strokeWidth="2.4" />
        <circle cx="48" cy="48" r="40" className="fill-ink" />
        <circle
          cx="48"
          cy="48"
          r="40"
          fill="none"
          stroke="#C9A227"
          strokeWidth="1.15"
          strokeDasharray="1.8 4.2"
          className="opacity-90"
        />

        <g clipPath={`url(#${clip})`}>
          <rect x="8" y="8" width="80" height="8.5" fill="#FF9933" />
          <rect x="8" y="16.5" width="80" height="4.2" fill="#FFFFFF" />
          <rect x="8" y="20.7" width="80" height="8.5" fill="#138808" />
        </g>

        <circle cx="48" cy="48" r="40" fill="none" stroke="#C9A227" strokeWidth="1.4" />

        <path
          d="M22 41v30h7.2V54.2L45.6 71H53V41h-7.2v16.6L29.2 41H22Z"
          className="fill-canvas"
        />
        <path
          fillRule="evenodd"
          d="M56 41h12.2c9.2 0 14.3 5.2 14.3 15s-5.1 15-14.3 15H56V41Zm7.2 6.8v16.4h5.4c4.8 0 7-2.7 7-8.2s-2.2-8.2-7-8.2h-5.4Z"
          className="fill-canvas"
        />
      </svg>
    </motion.div>
  );
}

export default BrandingLogo;
