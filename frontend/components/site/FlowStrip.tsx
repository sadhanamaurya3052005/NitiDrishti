'use client';

import { motion } from 'framer-motion';
import {
  BadgeCheck,
  BarChart3,
  BellRing,
  BrainCircuit,
  ChevronRight,
  DownloadCloud,
  Target,
} from 'lucide-react';

import { useLocale } from '@/components/providers/LocaleProvider';
import { Reveal } from '@/components/motion/Reveal';
import { stagger } from '@/lib/motion';

const STEP_ICONS = [DownloadCloud, BrainCircuit, BadgeCheck, Target, BellRing, BarChart3] as const;

/** The six-stage loop from an official document to a citizen decision. */
export function FlowStrip() {
  const { copy } = useLocale();

  return (
    <section className="py-6">
      <div className="nd-section">
        <Reveal className="rounded-card border border-line bg-surface-muted p-6 sm:p-8">
          <p className="nd-eyebrow">{copy.flow.eyebrow}</p>
          <h2 className="mt-2 max-w-3xl text-headline">{copy.flow.title}</h2>

          <motion.ol
            className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6"
            variants={stagger(0.05, 0.06)}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-10% 0px' }}
          >
            {copy.flow.steps.map((step, index) => {
              const Icon = STEP_ICONS[index] ?? DownloadCloud;
              return (
                <motion.li
                  key={step.label}
                  variants={{ hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0 } }}
                  className="group relative flex items-start gap-3 rounded-xl border border-line bg-surface p-4 transition-all duration-300 ease-civic hover:-translate-y-0.5 hover:shadow-soft"
                >
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-canvas-deep text-primary-700">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-1 text-sm font-semibold text-ink">
                      {step.label}
                      {index < copy.flow.steps.length - 1 && (
                        <ChevronRight className="hidden h-3.5 w-3.5 text-ink-faint lg:inline" />
                      )}
                    </span>
                    <span className="mt-0.5 block text-xs leading-snug text-ink-muted">
                      {step.note}
                    </span>
                  </span>
                </motion.li>
              );
            })}
          </motion.ol>
        </Reveal>
      </div>
    </section>
  );
}

export default FlowStrip;
