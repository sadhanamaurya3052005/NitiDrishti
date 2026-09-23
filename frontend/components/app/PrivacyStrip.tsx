'use client';

import Link from 'next/link';
import { useState } from 'react';

import { useExperience } from '@/components/providers/ExperienceProvider';
import { useLocale } from '@/components/providers/LocaleProvider';
import { Button } from '@/components/ui/Button';
import { ApiError } from '@/lib/api';

export function PrivacyStrip() {
  const { locale, home } = useLocale();
  const { session, consentRetention, setConsentRetention, consentBusy, purgeAccount } = useExperience();
  const authed = Boolean(session?.accessToken);
  const [forgetBusy, setForgetBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <section className="mb-4 rounded-2xl border border-line bg-surface px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
        {locale === 'hi' ? 'DPDP सहमति' : 'DPDP consent'}
      </p>
      {!authed ? (
        <p className="mt-2 text-xs text-ink-muted">
          {home.auth.consentGuest}{' '}
          <Link href="/login" className="font-semibold text-saffron">
            {locale === 'hi' ? 'साइन इन' : 'Sign in'}
          </Link>
        </p>
      ) : (
        <>
          <label className="mt-2 flex items-start gap-2 text-sm text-ink-soft">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={consentRetention}
              disabled={consentBusy}
              onChange={(event) => {
                setError(null);
                void setConsentRetention(event.target.checked).catch((caught) => {
                  setError(caught instanceof ApiError ? caught.message : home.auth.failed);
                });
              }}
            />
            <span>
              {home.auth.consent}{' '}
              <span className="text-xs text-ink-muted">
                {consentBusy
                  ? home.auth.consentBusy
                  : consentRetention
                    ? home.auth.consentOn
                    : home.auth.consentOff}
              </span>
            </span>
          </label>
          <p className="mt-2 text-[11px] text-ink-muted">{home.auth.forgetHint}</p>
          <Button
            variant="ghost"
            className="mt-2 w-full sm:w-auto"
            disabled={forgetBusy}
            onClick={() => {
              setForgetBusy(true);
              setError(null);
              void purgeAccount()
                .catch((caught) => {
                  setError(caught instanceof ApiError ? caught.message : home.auth.failed);
                })
                .finally(() => setForgetBusy(false));
            }}
          >
            {forgetBusy ? home.auth.forgetBusy : home.auth.forget}
          </Button>
        </>
      )}
      {error ? <p className="mt-2 text-xs text-ink-muted">{error}</p> : null}
    </section>
  );
}

export default PrivacyStrip;
