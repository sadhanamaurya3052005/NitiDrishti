'use client';

import { motion } from 'framer-motion';

import { cn } from '@/lib/cn';
import { easings } from '@/lib/motion';

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  /** Seconds to wait after the element enters the viewport. */
  delay?: number;
  /** Vertical travel distance in pixels. */
  distance?: number;
}

/** Scroll-triggered entrance used across every section. Fires once. */
export function Reveal({ children, className, delay = 0, distance = 18 }: RevealProps) {
  return (
    <motion.div
      className={cn(className)}
      initial={{ opacity: 0, y: distance }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-12% 0px -8% 0px' }}
      transition={{ duration: 0.6, delay, ease: easings.civic }}
    >
      {children}
    </motion.div>
  );
}

export default Reveal;
