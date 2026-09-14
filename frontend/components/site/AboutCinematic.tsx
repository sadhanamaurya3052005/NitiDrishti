'use client';

import { useLocale } from '@/components/providers/LocaleProvider';
import { Reveal } from '@/components/motion/Reveal';

export function AboutCinematic() {
  const { home } = useLocale();

  return (
    <section id="about" className="relative scroll-mt-28 overflow-hidden py-24">
      <div className="pointer-events-none absolute inset-0 bg-aurora opacity-80" />
      <div className="relative nd-section">
        <Reveal className="max-w-4xl">
          <p className="nd-eyebrow">{home.about.eyebrow}</p>
          <h2 className="mt-4 text-display">{home.about.title}</h2>
          <p className="nd-lede mt-5 max-w-3xl">{home.about.lede}</p>
        </Reveal>

        <div className="mt-14 space-y-0">
          {home.about.chapters.map((chapter, index) => (
            <article
              key={chapter.kicker}
              className="grid gap-6 border-t border-line py-10 md:grid-cols-[0.35fr_0.65fr] md:items-end"
            >
              <p className="font-deva text-4xl font-semibold text-saffron sm:text-5xl">{chapter.kicker}</p>
              <div>
                <h3 className="text-headline">{chapter.title}</h3>
                <p className="mt-3 max-w-xl text-base leading-relaxed text-ink-soft">{chapter.body}</p>
                <span className="mt-4 inline-block h-px w-24 bg-gradient-to-r from-saffron to-transparent" />
              </div>
              <span className="sr-only">
                Chapter {index + 1}
              </span>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
