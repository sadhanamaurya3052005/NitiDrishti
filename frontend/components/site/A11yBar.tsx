'use client';

import { useLocale } from '@/components/providers/LocaleProvider';
import { useA11y } from '@/components/providers/A11yProvider';
import { cn } from '@/lib/cn';

export function A11yBar() {
  const { home, locale, setLocale } = useLocale();
  const { font, setFont, contrast, toggleContrast } = useA11y();

  const speakHindi = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(
      'नीतिदृष्टि में आपका स्वागत है। हर योजना, हर नागरिक तक।',
    );
    utterance.lang = 'hi-IN';
    utterance.rate = 0.95;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="nd-no-print sticky top-0 z-[60] border-b border-white/10 bg-navy text-[11px] text-canvas dark:border-line dark:bg-canvas-deep dark:text-ink">
      <div className="nd-section flex h-[var(--nd-a11y-h)] items-center justify-between gap-3">
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-1 focus:z-[80] focus:rounded-pill focus:bg-saffron focus:px-3 focus:py-1 focus:text-navy-deep"
        >
          {home.a11y.skipToContent}
        </a>

        <div className="flex items-center gap-2" role="group" aria-label={home.a11y.font}>
          {(['sm', 'md', 'lg'] as const).map((scale) => (
            <button
              key={scale}
              type="button"
              onClick={() => setFont(scale)}
              className={cn(
                'rounded px-1.5 font-semibold leading-none',
                scale === 'sm' && 'text-[10px]',
                scale === 'md' && 'text-[12px]',
                scale === 'lg' && 'text-[14px]',
                font === scale ? 'bg-saffron text-navy-deep' : 'opacity-80 hover:opacity-100',
              )}
              aria-pressed={font === scale}
            >
              {scale === 'sm' ? 'A−' : scale === 'md' ? 'A' : 'A+'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleContrast}
            className="rounded-pill border border-white/20 px-2.5 py-0.5 font-semibold hover:bg-white/10 dark:border-line"
            aria-pressed={contrast === 'high'}
          >
            {contrast === 'high' ? home.a11y.contrastHigh : home.a11y.contrastDefault}
          </button>
          <button
            type="button"
            onClick={() => setLocale(locale === 'en' ? 'hi' : 'en')}
            className="rounded-pill border border-white/20 px-2.5 py-0.5 font-semibold hover:bg-white/10 dark:border-line"
          >
            {locale === 'en' ? 'English · हिन्दी' : 'हिन्दी · English'}
          </button>
          <button
            type="button"
            onClick={speakHindi}
            className="hidden rounded-pill bg-saffron px-2.5 py-0.5 font-semibold text-navy-deep sm:inline"
          >
            {home.a11y.audioPreview}
          </button>
        </div>
      </div>
    </div>
  );
}
