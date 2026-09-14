'use client';

import { ArrowUpRight, Landmark, Store, Users, type LucideIcon } from 'lucide-react';
import Link from 'next/link';

import { Reveal } from '@/components/motion/Reveal';
import { useLocale } from '@/components/providers/LocaleProvider';
import { ACCENTS } from '@/lib/accents';
import { cn } from '@/lib/cn';
import type { Accent } from '@/types';

const CARD_STYLE: Record<
  'citizen' | 'csc' | 'district',
  { icon: LucideIcon; accent: Accent }
> = {
  citizen: { icon: Users, accent: 'mint' },
  csc: { icon: Store, accent: 'peach' },
  district: { icon: Landmark, accent: 'violet' },
};

/** Three stakeholder desks from the research pack, with the pipeline drawn inside each card. */
export function ArchitectureCards() {
  const { home } = useLocale();
  const copy = home.architecture;

  return (
    <section id="architecture" className="scroll-mt-28 py-16 sm:py-24">
      <div className="nd-section">
        <Reveal className="max-w-3xl">
          <p className="nd-eyebrow">{copy.eyebrow}</p>
          <h2 className="mt-3 text-display">{copy.title}</h2>
          <p className="nd-lede mt-4">{copy.lede}</p>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 items-stretch gap-5 lg:grid-cols-3">
          {copy.cards.map((card, index) => {
            const style = CARD_STYLE[card.id];
            const accent = ACCENTS[style.accent];
            const Icon = style.icon;

            return (
              <Reveal key={card.id} delay={index * 0.08} className="flex h-full">
                <article
                  className={cn(
                    'nd-card flex h-full min-h-full w-full flex-col overflow-hidden p-0',
                    accent.hoverBorder,
                  )}
                >
                  <div className={cn('h-1 w-full', accent.bar)} />
                  <div className="flex flex-1 flex-col p-6">
                    <div className="flex items-start justify-between gap-3">
                      <span
                        className={cn(
                          'flex h-11 w-11 items-center justify-center rounded-xl',
                          accent.icon,
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className={cn('nd-chip text-[10px] uppercase tracking-wider', accent.chip)}>
                        {card.audience}
                      </span>
                    </div>

                    <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                      {card.kicker}
                    </p>
                    <h3 className="mt-1 text-xl font-semibold leading-snug text-ink">{card.name}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-ink-soft">{card.problem}</p>

                    <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                      {card.pipelineLabel}
                    </p>
                    <ol className="mt-3">
                      {card.pipeline.map((step, stepIndex) => (
                        <li key={step} className="flex gap-3">
                          <span className="flex w-6 shrink-0 flex-col items-center">
                            <span
                              className={cn(
                                'flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold',
                                accent.icon,
                              )}
                            >
                              {stepIndex + 1}
                            </span>
                            {stepIndex < card.pipeline.length - 1 ? (
                              <span className="my-0.5 w-px flex-1 min-h-[10px] bg-line" />
                            ) : null}
                          </span>
                          <span className="pb-3 text-sm leading-snug text-ink">{step}</span>
                        </li>
                      ))}
                    </ol>

                    {card.flow ? (
                      <div className="mt-1 rounded-xl border border-line bg-surface-muted px-3 py-3">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                          {card.flowLabel}
                        </p>
                        <p className="mt-2 text-xs leading-relaxed text-ink-soft">
                          {card.flow.join(' → ')}
                        </p>
                      </div>
                    ) : null}

                    {card.print ? (
                      <div className="mt-3 rounded-xl border border-line bg-canvas-deep/40 px-3 py-3 font-mono">
                        <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                          {card.printLabel}
                        </p>
                        <ul className="mt-2 space-y-1.5 text-[11px] leading-snug">
                          {card.print.map((line) => (
                            <li
                              key={line.text}
                              className={
                                line.state === 'pass'
                                  ? 'text-mint-deep'
                                  : line.state === 'fail'
                                    ? 'text-saffron-deep'
                                    : 'text-ink-soft'
                              }
                            >
                              {line.state === 'pass' ? '[PASSED] ' : line.state === 'fail' ? '[FAILED] ' : ''}
                              {line.text}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {card.engines.map((engine) => (
                        <span key={engine} className={cn('nd-chip', accent.chip)}>
                          {engine}
                        </span>
                      ))}
                    </div>

                    <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-6">
                      <Link
                        href={card.href}
                        className={cn(
                          'inline-flex items-center gap-1.5 text-sm font-semibold',
                          accent.text,
                        )}
                      >
                        {card.cta}
                        <ArrowUpRight className="h-4 w-4" />
                      </Link>
                      {card.also ? (
                        <span className="flex flex-wrap gap-2">
                          {card.also.map((link) => (
                            <Link
                              key={link.href}
                              href={link.href}
                              className="text-xs font-medium text-ink-muted hover:text-ink"
                            >
                              {link.label}
                            </Link>
                          ))}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>

        <Reveal delay={0.12} className="mt-8">
          <p className="rounded-card border border-line bg-surface-muted px-5 py-4 text-sm leading-relaxed text-ink-soft sm:text-base">
            <span className="font-semibold text-ink">{copy.principleLabel} </span>
            {copy.principle}
          </p>
        </Reveal>
      </div>
    </section>
  );
}

export default ArchitectureCards;
