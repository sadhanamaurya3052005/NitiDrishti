'use client';

import { Fingerprint, HardDrive, ShieldCheck, Sparkles, WifiOff } from 'lucide-react';

import { Reveal } from '@/components/motion/Reveal';
import { useLocale } from '@/components/providers/LocaleProvider';

const ICONS = [ShieldCheck, Fingerprint, Sparkles, HardDrive, WifiOff] as const;
const TONES = [
  'bg-mint-soft text-mint-deep border-mint/40',
  'bg-sky-soft text-sky-deep border-sky/40',
  'bg-saffron-soft text-saffron-deep border-saffron/40',
  'bg-violet-soft text-violet-deep border-violet/40',
  'bg-amber-soft text-amber-deep border-amber/40',
] as const;

export function SafetyBadges() {
  const { showcase } = useLocale();

  return (
    <section id="safety" className="scroll-mt-24 py-12 sm:py-16">
      <div className="nd-section">
        <Reveal className="text-center">
          <p className="nd-eyebrow text-saffron">{showcase.safety.eyebrow}</p>
          <h2 className="mt-3 text-display">{showcase.safety.title}</h2>
        </Reveal>
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {showcase.safety.badges.map((badge, index) => {
            const Icon = ICONS[index] ?? ShieldCheck;
            return (
              <Reveal key={badge.id} delay={index * 0.05}>
                <div className="group relative flex min-h-[168px] flex-col items-center justify-center rounded-[1.5rem] border border-line bg-surface/90 px-4 py-6 text-center shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-lift">
                  <span className={`flex h-14 w-14 items-center justify-center rounded-full border-2 ${TONES[index] ?? TONES[0]} animate-float`}>
                    <Icon className="h-6 w-6" />
                  </span>
                  <p className="mt-4 text-sm font-semibold leading-snug text-ink">{badge.label}</p>
                  <p className="pointer-events-none absolute inset-x-3 bottom-3 rounded-xl bg-[#0b1f3a] px-3 py-2 text-[11px] leading-snug text-white opacity-0 shadow-lift transition group-hover:opacity-100 dark:bg-canvas-deep dark:text-ink">
                    {badge.hover}
                  </p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default SafetyBadges;
