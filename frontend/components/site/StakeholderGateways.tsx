'use client';

import { ArrowUpRight, Landmark, Radar, Store, Users } from 'lucide-react';
import Link from 'next/link';

import { Reveal } from '@/components/motion/Reveal';
import { useLocale } from '@/components/providers/LocaleProvider';
import { cn } from '@/lib/cn';

const ICONS = {
  citizen: Users,
  csc: Store,
  officer: Landmark,
} as const;

const TINT = {
  citizen: 'from-violet-soft via-surface to-surface hover:border-violet/60',
  csc: 'from-mint-soft via-surface to-surface hover:border-mint/60',
  officer: 'from-amber-soft via-surface to-surface hover:border-amber/60',
} as const;

const ICON_TONE = {
  citizen: 'text-violet',
  csc: 'text-mint',
  officer: 'text-amber',
} as const;

export function StakeholderGateways() {
  const { showcase } = useLocale();

  return (
    <section id="gateways" className="scroll-mt-24 pb-6 pt-10 sm:pt-12">
      <div className="nd-section">
        <Reveal className="max-w-3xl">
          <p className="nd-eyebrow text-saffron">{showcase.gateways.eyebrow}</p>
          <h2 className="mt-3 text-display">{showcase.gateways.title}</h2>
        </Reveal>

        <div className="mt-10 grid grid-cols-1 items-stretch gap-5 lg:grid-cols-3">
          {showcase.gateways.cards.map((card, index) => {
            const Icon = ICONS[card.id];
            return (
              <Reveal key={card.id} delay={index * 0.08} className="flex h-full">
                <Link
                  href={card.href}
                  className={cn(
                    'group relative flex h-full w-full flex-col overflow-hidden rounded-[1.75rem] border border-line bg-gradient-to-br p-6 shadow-soft transition duration-300 ease-civic hover:-translate-y-2 hover:shadow-lift',
                    TINT[card.id],
                  )}
                >
                  <span className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-saffron/10 blur-2xl transition group-hover:scale-125 group-hover:bg-saffron/20" />
                  <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-line bg-surface shadow-soft">
                    {card.id === 'officer' ? (
                      <Radar className={cn('h-5 w-5', ICON_TONE[card.id])} />
                    ) : (
                      <Icon className={cn('h-5 w-5', ICON_TONE[card.id])} />
                    )}
                  </span>
                  <p className="relative mt-6 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                    {card.kicker}
                  </p>
                  <h3 className="relative mt-2 text-xl font-semibold leading-snug text-ink">{card.name}</h3>
                  <p className="relative mt-3 text-sm leading-relaxed text-ink-soft">{card.scope}</p>
                  <p className="relative mt-3 text-xs text-ink-muted">{card.target}</p>
                  <div className="relative mt-4 flex flex-wrap gap-1.5">
                    {card.chips.map((chip) => (
                      <span key={chip} className="nd-chip">
                        {chip}
                      </span>
                    ))}
                  </div>
                  <span className="relative mt-auto inline-flex items-center gap-1.5 pt-6 text-sm font-semibold text-saffron-deep">
                    {showcase.gateways.enter}
                    <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </span>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default StakeholderGateways;
