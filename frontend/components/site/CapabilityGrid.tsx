'use client';

import { motion } from 'framer-motion';
import {
  FileText,
  GitCompareArrows,
  ListChecks,
  Mic,
  SlidersHorizontal,
  WifiOff,
  type LucideIcon,
} from 'lucide-react';

import { Reveal } from '@/components/motion/Reveal';
import { useLocale } from '@/components/providers/LocaleProvider';
import { ACCENTS } from '@/lib/accents';
import { cn } from '@/lib/cn';
import type { CapabilityId } from '@/lib/i18n/landing';
import { stagger } from '@/lib/motion';
import type { Accent } from '@/types';

const CAPABILITY_STYLES: Record<CapabilityId, { icon: LucideIcon; accent: Accent }> = {
  eligibility: { icon: ListChecks, accent: 'mint' },
  whatif: { icon: SlidersHorizontal, accent: 'sky' },
  policydiff: { icon: GitCompareArrows, accent: 'violet' },
  offline: { icon: WifiOff, accent: 'amber' },
  voice: { icon: Mic, accent: 'primary' },
  dossier: { icon: FileText, accent: 'peach' },
};

export function CapabilityGrid() {
  const { copy } = useLocale();

  return (
    <section id="capabilities" className="scroll-mt-24 border-y border-line bg-surface-muted py-16 sm:py-24">
      <div className="nd-section">
        <Reveal className="max-w-3xl">
          <p className="nd-eyebrow">{copy.capabilities.eyebrow}</p>
          <h2 className="mt-3 text-display">{copy.capabilities.title}</h2>
          <p className="nd-lede mt-4">{copy.capabilities.lede}</p>
        </Reveal>

        <motion.div
          className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
          variants={stagger(0.05, 0.07)}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-8% 0px' }}
        >
          {copy.capabilities.items.map((item, index) => {
            const style = CAPABILITY_STYLES[item.id];
            const accent = ACCENTS[style.accent];
            const Icon = style.icon;

            return (
              <motion.article
                key={item.id}
                variants={{ hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0 } }}
                className={cn(
                  'nd-card group relative overflow-hidden p-6 transition-all duration-300 ease-civic hover:-translate-y-1',
                  accent.hoverBorder,
                  accent.hoverShadow,
                )}
              >
                <span className="absolute right-5 top-5 text-xs font-semibold text-ink-faint nd-numeric">
                  {String(index + 1).padStart(2, '0')}
                </span>

                <span
                  className={cn(
                    'flex h-11 w-11 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105',
                    accent.icon,
                  )}
                >
                  <Icon className="h-5 w-5" />
                </span>

                <h3 className="mt-5 pr-8 text-base font-semibold leading-snug text-ink">
                  {item.title}
                </h3>
                <p className="mt-2.5 text-sm leading-relaxed text-ink-soft">{item.body}</p>
              </motion.article>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}

export default CapabilityGrid;
