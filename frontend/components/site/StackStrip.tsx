'use client';

import { motion } from 'framer-motion';

import { Reveal } from '@/components/motion/Reveal';
import { useLocale } from '@/components/providers/LocaleProvider';
import { stagger } from '@/lib/motion';

export function StackStrip() {
  const { copy } = useLocale();

  return (
    <section id="architecture" className="scroll-mt-24 border-t border-line bg-surface-muted py-16 sm:py-20">
      <div className="nd-section">
        <Reveal className="max-w-2xl">
          <p className="nd-eyebrow">{copy.stack.eyebrow}</p>
          <h2 className="mt-3 text-headline">{copy.stack.title}</h2>
        </Reveal>

        <motion.dl
          className="mt-8 grid grid-cols-1 gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-2 lg:grid-cols-3"
          variants={stagger(0.05, 0.06)}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-10% 0px' }}
        >
          {copy.stack.groups.map((group) => (
            <motion.div
              key={group.label}
              variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
              className="bg-surface p-5 transition-colors duration-300 hover:bg-canvas-tint"
            >
              <dt className="nd-eyebrow">{group.label}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-ink-soft">{group.items}</dd>
            </motion.div>
          ))}
        </motion.dl>
      </div>
    </section>
  );
}

export default StackStrip;
