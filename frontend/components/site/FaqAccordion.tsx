'use client';

import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

import { Reveal } from '@/components/motion/Reveal';
import { useLocale } from '@/components/providers/LocaleProvider';
import { cn } from '@/lib/cn';

export function FaqAccordion() {
  const { home, locale } = useLocale();
  const [open, setOpen] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);
  const items = expanded ? home.faq.items : home.faq.items.slice(0, 5);

  return (
    <section id="faq" className="scroll-mt-24 py-12 sm:py-16">
      <div className="nd-section grid items-center gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Reveal className="relative mx-auto w-full max-w-md">
          <div className="relative overflow-hidden rounded-[1.75rem] border border-line bg-gradient-to-br from-saffron-soft via-surface to-sky-soft p-6 shadow-soft dark:from-canvas-deep dark:via-surface">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/heroes/faq-question.png"
              alt=""
              className="mx-auto h-auto w-full max-w-sm object-contain drop-shadow-lg"
            />
            <p className="mt-3 text-center text-sm font-semibold text-ink">
              {locale === 'hi' ? 'सबसे ज़रूरी दस प्रश्न' : 'Ten questions, answered straight'}
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.06}>
          <p className="nd-eyebrow text-saffron">{home.faq.eyebrow}</p>
          <h2 className="mt-3 text-display">{home.faq.title}</h2>
          <div className="mt-6 divide-y divide-line overflow-hidden rounded-card border border-line bg-surface shadow-soft">
            {items.map((item, index) => {
              const isOpen = open === index;
              return (
                <div key={item.q}>
                  <h3>
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => setOpen(isOpen ? null : index)}
                      className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-semibold text-ink"
                    >
                      {item.q}
                      <ChevronDown className={cn('h-4 w-4 shrink-0 text-ink-muted transition', isOpen && 'rotate-180 text-saffron')} />
                    </button>
                  </h3>
                  <div
                    className={cn(
                      'grid transition-[grid-template-rows] duration-300 ease-civic',
                      isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
                    )}
                  >
                    <p className="overflow-hidden px-5 text-sm leading-relaxed text-ink-soft">
                      <span className="block pb-4">{item.a}</span>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => {
              setExpanded((value) => !value);
              setOpen(null);
            }}
            className="mt-5 inline-flex rounded-pill border border-saffron/40 bg-saffron/10 px-4 py-2 text-sm font-semibold text-saffron-deep"
          >
            {expanded ? home.faq.less : home.faq.more}
          </button>
        </Reveal>
      </div>
    </section>
  );
}

export default FaqAccordion;
