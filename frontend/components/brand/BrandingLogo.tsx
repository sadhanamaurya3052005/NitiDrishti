'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { useId } from 'react';

import { cn } from '@/lib/cn';
import { springs } from '@/lib/motion';

interface BrandingLogoProps {
  /** Rendered width and height in pixels. */
  size?: number;
  className?: string;
  /** Rotating scan ring, radar sweep and iris pulse. Turn off below ~28px. */
  animated?: boolean;
  /** Soft aura behind the emblem — used on the splash and hero only. */
  glow?: boolean;
  /** Shared-element id so the emblem can morph between screens. */
  layoutId?: string;
}

const SPOKE_ANGLES = Array.from({ length: 24 }, (_, index) => index * 15);
const CENTER = { x: 60, y: 60 } as const;
const svgOrigin = { transformOrigin: '60px 60px', transformBox: 'view-box' } as const;

/**
 * NitiDrishti emblem: a civic shield (governance) holding an open eye
 * (drishti / vision), wrapped in a chakra ring that scans continuously —
 * the visual argument of the product in one mark.
 */
export function BrandingLogo({
  size = 96,
  className,
  animated = true,
  glow = false,
  layoutId,
}: BrandingLogoProps) {
  const uid = useId().replace(/:/g, '');
  const reduceMotion = useReducedMotion();
  const moves = animated && !reduceMotion;

  const ids = {
    shield: `nd-shield-${uid}`,
    ring: `nd-ring-${uid}`,
    sweep: `nd-sweep-${uid}`,
    aura: `nd-aura-${uid}`,
    iris: `nd-iris-${uid}`,
  };

  return (
    <motion.div
      layoutId={layoutId}
      className={cn('relative shrink-0', className)}
      style={{ width: size, height: size }}
      initial={layoutId ? false : { scale: 0.82, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={layoutId ? springs.morph : springs.emblem}
    >
      <svg
        viewBox="0 0 120 120"
        width={size}
        height={size}
        role="img"
        aria-label="NitiDrishti emblem"
        className="overflow-visible"
      >
        <defs>
          <linearGradient id={ids.shield} x1="24" y1="20" x2="96" y2="100" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#5B5BE6" />
            <stop offset="52%" stopColor="#4338CA" />
            <stop offset="100%" stopColor="#4C1D95" />
          </linearGradient>

          <linearGradient id={ids.ring} x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0C86C4" />
            <stop offset="55%" stopColor="#6D28D9" />
            <stop offset="100%" stopColor="#0E9F6E" />
          </linearGradient>

          <linearGradient id={ids.sweep} x1="60" y1="60" x2="60" y2="8" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0C86C4" stopOpacity="0" />
            <stop offset="100%" stopColor="#0C86C4" stopOpacity="0.32" />
          </linearGradient>

          <radialGradient id={ids.aura} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#4338CA" stopOpacity="0.26" />
            <stop offset="62%" stopColor="#6D28D9" stopOpacity="0.10" />
            <stop offset="100%" stopColor="#6D28D9" stopOpacity="0" />
          </radialGradient>

          <radialGradient id={ids.iris} cx="38%" cy="34%" r="72%">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="70%" stopColor="#4C1D95" />
            <stop offset="100%" stopColor="#231F63" />
          </radialGradient>
        </defs>

        {glow && <circle cx={CENTER.x} cy={CENTER.y} r="58" fill={`url(#${ids.aura})`} />}

        {/* Continuous policy scan — outer dashed ring */}
        <motion.g
          style={svgOrigin}
          animate={moves ? { rotate: 360 } : undefined}
          transition={moves ? { duration: 26, repeat: Infinity, ease: 'linear' } : undefined}
        >
          <circle
            cx={CENTER.x}
            cy={CENTER.y}
            r="53"
            fill="none"
            stroke={`url(#${ids.ring})`}
            strokeWidth="1.4"
            strokeDasharray="3 7"
            strokeLinecap="round"
          />
        </motion.g>

        {/* Counter-rotating inner hairline ring */}
        <motion.g
          style={svgOrigin}
          animate={moves ? { rotate: -360 } : undefined}
          transition={moves ? { duration: 44, repeat: Infinity, ease: 'linear' } : undefined}
        >
          <circle
            cx={CENTER.x}
            cy={CENTER.y}
            r="47.5"
            fill="none"
            stroke="#98A3BC"
            strokeOpacity="0.5"
            strokeWidth="0.8"
            strokeDasharray="1 5"
          />
        </motion.g>

        {/* Radar sweep wedge */}
        {moves && (
          <motion.g
            style={svgOrigin}
            animate={{ rotate: 360 }}
            transition={{ duration: 7, repeat: Infinity, ease: 'linear' }}
          >
            <path d="M60 60 L60 9 A51 51 0 0 1 92.8 20.7 Z" fill={`url(#${ids.sweep})`} />
          </motion.g>
        )}

        {/* Chakra spokes */}
        <g>
          {SPOKE_ANGLES.map((angle, index) => {
            const major = index % 6 === 0;
            return (
              <line
                key={angle}
                x1={CENTER.x}
                y1={major ? 15 : 17}
                x2={CENTER.x}
                y2={22}
                stroke={major ? '#4338CA' : '#98A3BC'}
                strokeOpacity={major ? 0.55 : 0.35}
                strokeWidth={major ? 1.5 : 1}
                strokeLinecap="round"
                transform={`rotate(${angle} ${CENTER.x} ${CENTER.y})`}
              />
            );
          })}
        </g>

        {/* Traveling scan marker */}
        {moves && (
          <motion.g
            style={svgOrigin}
            animate={{ rotate: 360 }}
            transition={{ duration: 13, repeat: Infinity, ease: 'linear' }}
          >
            <circle cx={CENTER.x} cy="7" r="2.4" fill="#0C86C4" />
            <circle cx={CENTER.x} cy="7" r="4.6" fill="#0C86C4" fillOpacity="0.2" />
          </motion.g>
        )}

        {/* Civic shield */}
        <motion.path
          d="M60 26 L84 36.5 V63.5 C84 78.6 73.4 89.6 60 95 C46.6 89.6 36 78.6 36 63.5 V36.5 Z"
          fill={`url(#${ids.shield})`}
          initial={layoutId ? false : { pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
        <path
          d="M60 26 L84 36.5 V63.5 C84 78.6 73.4 89.6 60 95 C46.6 89.6 36 78.6 36 63.5 V36.5 Z"
          fill="none"
          stroke="#FFFFFF"
          strokeOpacity="0.34"
          strokeWidth="1.1"
        />
        <path
          d="M60 31.5 L79 39.8 V63.2 C79 75.6 70.4 84.9 60 89.6"
          fill="none"
          stroke="#FFFFFF"
          strokeOpacity="0.16"
          strokeWidth="1"
        />

        {/* Drishti — the open eye */}
        <ellipse cx={CENTER.x} cy="58" rx="15.6" ry="10" fill="#FAF7F2" fillOpacity="0.96" />
        <ellipse
          cx={CENTER.x}
          cy="58"
          rx="15.6"
          ry="10"
          fill="none"
          stroke="#231F63"
          strokeOpacity="0.28"
          strokeWidth="0.9"
        />
        <motion.g
          style={{ transformOrigin: '60px 58px', transformBox: 'view-box' }}
          animate={moves ? { scale: [1, 1.09, 1] } : undefined}
          transition={moves ? { duration: 3.4, repeat: Infinity, ease: 'easeInOut' } : undefined}
        >
          <circle cx={CENTER.x} cy="58" r="6.4" fill={`url(#${ids.iris})`} />
          <circle cx={CENTER.x} cy="58" r="2.7" fill="#0B1B3A" />
          <circle cx="57.4" cy="55.5" r="1.7" fill="#FFFFFF" fillOpacity="0.92" />
        </motion.g>

        {/* Base plinth */}
        <path
          d="M50 99.5 H70"
          stroke="#4338CA"
          strokeOpacity="0.45"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </motion.div>
  );
}

export default BrandingLogo;
