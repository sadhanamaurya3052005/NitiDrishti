'use client';

import Link from 'next/link';

import { BrandingLogo } from '@/components/brand/BrandingLogo';
import { useLocale } from '@/components/providers/LocaleProvider';
import { usePwa } from '@/components/providers/PwaProvider';
import { APP } from '@/lib/config';

const LINK_CLASS =
  'text-white/80 transition hover:text-saffron dark:text-[#0b1f3a]/80 dark:hover:text-saffron-deep';

const HEADING_CLASS = 'text-xs font-semibold uppercase tracking-[0.14em] text-saffron';

export function SiteFooter() {
  const { home, copy } = useLocale();
  const { installAvailable, install } = usePwa();

  const resourceLinks = [
    { label: home.footer.help, href: '/assistant' },
    { label: home.footer.faqs, href: '/#faq' },
  ] as const;

  const legalLinks = [
    { label: home.footer.privacy, href: '/privacy' },
    { label: home.footer.terms, href: '/terms' },
  ] as const;

  return (
    <footer className="border-t border-transparent bg-[#0b1f3a] text-[#f4eee4] dark:border-line dark:bg-[#efe6d6] dark:text-[#0b1f3a]">
      <div className="nd-section grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-12">
        <div className="max-w-sm sm:col-span-2 lg:col-span-3">
          <div className="flex items-center gap-2.5">
            <BrandingLogo size={28} animated={false} />
            <div>
              <p className="text-sm font-semibold text-white dark:text-[#0b1f3a]">{APP.nameDevanagari}</p>
              <p className="text-[11px] text-white/70 dark:text-[#0b1f3a]/65">{APP.name}</p>
            </div>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-white/75 dark:text-[#0b1f3a]/70">{home.footer.purpose}</p>
        </div>

        <div className="lg:col-span-2">
          <p className={HEADING_CLASS}>{home.footer.product}</p>
          <ul className="mt-3 space-y-2 text-sm">
            {home.footer.links.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className={LINK_CLASS}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:col-span-2">
          <p className={HEADING_CLASS}>{home.footer.resources}</p>
          <ul className="mt-3 space-y-2 text-sm">
            {resourceLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className={LINK_CLASS}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:col-span-2">
          <p className={HEADING_CLASS}>{home.footer.legal}</p>
          <ul className="mt-3 space-y-2 text-sm">
            {legalLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className={LINK_CLASS}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:col-span-3">
          <p className={HEADING_CLASS}>{home.footer.contact}</p>
          <ul className="mt-3 space-y-2 text-sm text-white/80 dark:text-[#0b1f3a]/80">
            <li>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/50 dark:text-[#0b1f3a]/50">
                {home.footer.emailLabel}
              </p>
              <a href={`mailto:${home.footer.email}`} className={`${LINK_CLASS} break-all`}>
                {home.footer.email}
              </a>
            </li>
            <li>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/50 dark:text-[#0b1f3a]/50">
                {home.footer.projectLabel}
              </p>
              <p className="leading-relaxed">{APP.subtitle}</p>
            </li>
          </ul>
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
          <p>{home.footer.languageNote}</p>
        </div>
      </div>
    </footer>
  );
}

export default SiteFooter;
