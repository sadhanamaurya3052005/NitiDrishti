'use client';

import { useEffect, useState } from 'react';

import { BrandingLogo } from '@/components/brand/BrandingLogo';
import { useLocale } from '@/components/providers/LocaleProvider';
import { usePwa } from '@/components/providers/PwaProvider';
import { getHealth } from '@/lib/api';
import { APP } from '@/lib/config';

export function SiteFooter() {
  const { home, copy, showcase } = useLocale();
  const { online, installAvailable, install } = usePwa();
  const [latency, setLatency] = useState<number | null>(null);

  useEffect(() => {
    const started = performance.now();
    void getHealth()
      .then(() => setLatency(Math.round(performance.now() - started)))
      .catch(() => setLatency(null));
  }, []);

  return (
    <footer className="border-t border-transparent bg-[#0b1f3a] text-[#f4eee4] dark:border-line dark:bg-[#efe6d6] dark:text-[#0b1f3a]">
      <div className="nd-section grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div className="max-w-xs">
          <div className="flex items-center gap-2.5">
            <BrandingLogo size={28} animated={false} />
            <div>
              <p className="text-sm font-semibold text-white dark:text-[#0b1f3a]">{APP.nameDevanagari}</p>
              <p className="text-[11px] text-white/70 dark:text-[#0b1f3a]/65">{APP.name}</p>
            </div>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-white/75 dark:text-[#0b1f3a]/70">{showcase.footer.mandateBody}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-saffron">{home.footer.product}</p>
          <ul className="mt-3 space-y-2 text-sm">
            {home.footer.links.map((link) => (
              <li key={link.href}>
                <a href={link.href} className="text-white/80 transition hover:text-saffron dark:text-[#0b1f3a]/80 dark:hover:text-saffron-deep">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-saffron">{showcase.footer.statutory}</p>
          <ul className="mt-3 space-y-2 text-sm text-white/80 dark:text-[#0b1f3a]/80">
            {showcase.footer.statutoryItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-saffron">{home.footer.contact}</p>
          <p className="mt-3 text-sm leading-relaxed text-white/80 dark:text-[#0b1f3a]/80">{home.footer.grievance}</p>
          {installAvailable ? (
            <button type="button" onClick={() => void install()} className="nd-cta-saffron mt-4 !py-2 text-xs">
              {home.pwa.install}
            </button>
          ) : null}
        </div>
      </div>

      <div className="border-t border-white/15 dark:border-[#0b1f3a]/15">
        <div className="nd-section flex flex-col gap-2 py-4 text-[11px] text-white/60 dark:text-[#0b1f3a]/60 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {APP.name} · {copy.footer.tagline}
          </p>
          <p>
            {online ? home.pwa.online : home.pwa.offline}
            {latency == null ? '' : ` · ${latency} ms`}
          </p>
        </div>
      </div>
    </footer>
  );
}

export default SiteFooter;
