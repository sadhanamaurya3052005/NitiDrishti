'use client';

import { motion } from 'framer-motion';
import { ArrowDown, ArrowUpRight, Sparkles } from 'lucide-react';

import { useLocale } from '@/components/providers/LocaleProvider';
import { Counter } from '@/components/ui/Counter';
import { easings, stagger } from '@/lib/motion';

export function Hero() {
  const { copy } = useLocale();

  return (
    <section id="top" className="relative overflow-hidden pb-16 pt-14 sm:pb-24 sm:pt-20">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-aurora" />
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] nd-grid-bg opacity-40 nd-mask-fade-b" />

      <div className="nd-section">
        <motion.div variants={stagger(0.1, 0.09)} initial="hidden" animate="visible">
          <motion.span
            variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
            className="nd-chip border-primary-100 bg-primary-50/70 text-primary-700"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {copy.hero.eyebrow}
          </motion.span>

          <motion.h1
            variants={{ hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0 } }}
            transition={{ duration: 0.7, ease: easings.civic }}
            className="mt-6 max-w-4xl text-display-xl font-semibold"
          >
            {copy.hero.titleLead}{' '}
            <span className="bg-gradient-to-r from-primary-600 via-violet to-sky bg-clip-text text-transparent">
              {copy.hero.titleAccent}
            </span>{' '}
            {copy.hero.titleTail}
          </motion.h1>

          <motion.p
            variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
            className="nd-lede mt-6 max-w-2xl"
          >
            {copy.hero.lede}
          </motion.p>

          <motion.div
            variants={{ hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0 } }}
            className="mt-9 flex flex-wrap items-center gap-3"
          >
            <a
              href="#workspaces"
              className="group inline-flex items-center gap-2 rounded-pill bg-ink px-5 py-3 text-sm font-semibold text-canvas shadow-lift transition-transform duration-300 ease-civic hover:-translate-y-0.5 active:translate-y-0"
            >
              {copy.hero.ctaPrimary}
              <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>
            <a
              href="#data"
              className="group inline-flex items-center gap-2 rounded-pill border border-line bg-surface px-5 py-3 text-sm font-semibold text-ink-soft transition-all duration-300 ease-civic hover:-translate-y-0.5 hover:border-line-strong hover:text-ink"
            >
              {copy.hero.ctaSecondary}
              <ArrowDown className="h-4 w-4 transition-transform duration-300 group-hover:translate-y-0.5" />
            </a>
          </motion.div>
        </motion.div>

        <motion.dl
          className="mt-14 grid grid-cols-2 gap-px overflow-hidden rounded-card border border-line bg-line lg:grid-cols-4"
          variants={stagger(0.45, 0.08)}
          initial="hidden"
          animate="visible"
        >
          {copy.hero.stats.map((stat) => (
            <motion.div
              key={stat.label}
              variants={{ hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0 } }}
              className="bg-surface p-5 sm:p-6"
            >
              <dd className="text-[2.1rem] font-semibold leading-none tracking-tight text-ink">
                <Counter value={stat.value} />
              </dd>
              <dt className="mt-2 text-sm font-semibold text-ink-soft">{stat.label}</dt>
              <p className="mt-1 text-xs leading-relaxed text-ink-muted">{stat.note}</p>
            </motion.div>
          ))}
        </motion.dl>
      </div>
    </section>
  );
}

export default Hero;
