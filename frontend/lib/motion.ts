import type { Transition, Variants } from 'framer-motion';

/**
 * One shared motion vocabulary for the whole product, so every screen built in
 * later phases feels like the same application.
 */

export const springs = {
  /** Emblem / hero entrances — noticeable but settled. */
  emblem: { type: 'spring', stiffness: 120, damping: 16, mass: 0.9 } as Transition,
  /** Shared-element morph between splash and header. */
  morph: { type: 'spring', stiffness: 210, damping: 26, mass: 0.7 } as Transition,
  /** Interactive feedback on press / hover. */
  snap: { type: 'spring', stiffness: 420, damping: 30 } as Transition,
} as const;

export const easings = {
  civic: [0.22, 1, 0.36, 1] as const,
  exit: [0.4, 0, 0.2, 1] as const,
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: easings.civic },
  },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.5, ease: easings.civic } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: easings.civic } },
};

/** Parent variant that reveals children one after another. */
export function stagger(delayChildren = 0.05, staggerChildren = 0.07): Variants {
  return {
    hidden: {},
    visible: { transition: { delayChildren, staggerChildren } },
  };
}

/** Word-by-word reveal used by the splash tagline. */
export const wordReveal: Variants = {
  hidden: { opacity: 0, y: 12, filter: 'blur(4px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.45, ease: easings.civic },
  },
};
