'use client';

import { BrandingLogo } from '@/components/brand/BrandingLogo';
import { useLocale } from '@/components/providers/LocaleProvider';
import { BackendStatusPill } from '@/components/site/BackendStatusPill';
import { APP } from '@/lib/config';

export function SiteFooter() {
  const { copy } = useLocale();

  return (
    <footer className="border-t border-line bg-canvas py-12">
      <div className="nd-section">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-md">
            <div className="flex items-center gap-3">
              <BrandingLogo size={34} animated={false} />
              <div className="flex flex-col leading-none">
                <span className="text-sm font-semibold text-ink">{APP.name}</span>
                <span className="font-deva text-xs text-ink-muted">{APP.nameDevanagari}</span>
              </div>
            </div>
            <p className="mt-4 text-sm font-medium text-ink-soft">{copy.footer.tagline}</p>
            <p className="mt-3 text-xs leading-relaxed text-ink-muted">{copy.footer.note}</p>
          </div>

          <div className="flex flex-col items-start gap-3 sm:items-end">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-ink-muted">{copy.footer.backendLabel}</span>
              <BackendStatusPill />
            </div>
            <p className="text-xs text-ink-muted">
              {APP.institute} · {APP.session}
            </p>
            <p className="text-xs text-ink-faint">
              v{APP.version} · {APP.buildPhase}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default SiteFooter;
