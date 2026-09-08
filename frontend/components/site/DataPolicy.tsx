'use client';

import { motion } from 'framer-motion';
import { Ban, KeyRound } from 'lucide-react';

import { Reveal } from '@/components/motion/Reveal';
import { useLocale } from '@/components/providers/LocaleProvider';
import { stagger } from '@/lib/motion';

/**
 * The data-sourcing constraint stated plainly: we collect from official sources
 * ourselves, and an official API is used only where data is restricted.
 */
export function DataPolicy() {
  const { copy } = useLocale();

  return (
    <section id="data" className="scroll-mt-24 py-16 sm:py-24">
      <div className="nd-section">
        <Reveal className="max-w-3xl">
          <p className="nd-eyebrow">{copy.data.eyebrow}</p>
          <h2 className="mt-3 text-display">{copy.data.title}</h2>
          <p className="nd-lede mt-4">{copy.data.lede}</p>
        </Reveal>

        <div className="mt-10 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Reveal>
            <article className="nd-card h-full border-mint/25 bg-mint-soft/40 p-6 sm:p-7">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-mint-soft text-mint-deep ring-1 ring-mint/20">
                <Ban className="h-5 w-5" />
              </span>
              <h3 className="mt-5 text-lg font-semibold text-ink">{copy.data.ruleTitle}</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-ink-soft">{copy.data.ruleBody}</p>
            </article>
          </Reveal>

          <Reveal delay={0.08}>
            <article className="nd-card h-full border-amber/25 bg-amber-soft/40 p-6 sm:p-7">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-soft text-amber-deep ring-1 ring-amber/20">
                <KeyRound className="h-5 w-5" />
              </span>
              <h3 className="mt-5 text-lg font-semibold text-ink">{copy.data.exceptionTitle}</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-ink-soft">
                {copy.data.exceptionBody}
              </p>
            </article>
          </Reveal>
        </div>

        <Reveal className="mt-6" delay={0.05}>
          <div className="nd-panel p-6 sm:p-8">
            <p className="nd-eyebrow">{copy.data.pipelineLabel}</p>

            <motion.ol
              className="mt-6 flex flex-wrap items-center gap-2"
              variants={stagger(0.05, 0.05)}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-10% 0px' }}
            >
              {copy.data.pipeline.map((stage, index) => (
                <motion.li
                  key={stage}
                  variants={{ hidden: { opacity: 0, scale: 0.95 }, visible: { opacity: 1, scale: 1 } }}
                  className="flex items-center gap-2"
                >
                  <span className="inline-flex items-center gap-2 rounded-pill border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink-soft">
                    <span className="nd-numeric text-[10px] font-semibold text-primary">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    {stage}
                  </span>
                  {index < copy.data.pipeline.length - 1 && (
                    <span className="h-px w-3 bg-line-strong" aria-hidden />
                  )}
                </motion.li>
              ))}
            </motion.ol>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export default DataPolicy;
