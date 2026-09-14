'use client';

import { Reveal } from '@/components/motion/Reveal';
import { useLocale } from '@/components/providers/LocaleProvider';
import { WorkflowInfographic } from '@/components/site/WorkflowInfographic';

export function AboutSplit() {
  const { showcase } = useLocale();

  return (
    <section id="about" className="scroll-mt-24 py-10 sm:py-14">
      <div className="nd-section grid items-start gap-7 lg:grid-cols-2">
        <Reveal>
          <h2 className="font-deva text-display font-semibold tracking-tight text-ink sm:text-[clamp(2.1rem,4vw,3.1rem)]">
            {showcase.about.title}
          </h2>
          <p className="nd-lede mt-4">{showcase.about.lede}</p>
          <ul className="mt-5 space-y-2.5">
            {showcase.about.points.map((point) => (
              <li
                key={point.kicker}
                className="rounded-xl border border-line bg-surface/90 px-3.5 py-2.5 shadow-soft transition duration-300 hover:-translate-y-0.5 hover:border-saffron/35 hover:shadow-lift"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-saffron">{point.kicker}</p>
                <h3 className="mt-0.5 text-sm font-semibold sm:text-base">{point.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-ink-soft">{point.body}</p>
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal delay={0.08}>
          <WorkflowInfographic />
        </Reveal>
      </div>
    </section>
  );
}

export default AboutSplit;
