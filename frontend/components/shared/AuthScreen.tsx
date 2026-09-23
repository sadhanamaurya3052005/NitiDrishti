'use client';

import { Landmark, ShieldOff, Store, UserRound } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useExperience } from '@/components/providers/ExperienceProvider';
import { useLocale } from '@/components/providers/LocaleProvider';
import { BrandingLogo } from '@/components/ui/BrandingLogo';
import { Button } from '@/components/ui/Button';
import { ApiError } from '@/lib/api';
import { APP, sessionDeskPath, type SessionMode } from '@/lib/config';

export function AuthScreen({ mode }: { mode: 'login' | 'register' }) {
  const { home, desk } = useLocale();
  const { signIn, signInAccount, session, purgeAccount } = useExperience();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [forgetBusy, setForgetBusy] = useState(false);

  const enterGuest = () => {
    signIn('guest', name.trim() || undefined);
    router.replace(sessionDeskPath('guest'));
  };

  const enterAccount = async (session: Exclude<SessionMode, 'guest'>) => {
    if (!email.trim() || !password) {
      setError(home.auth.missingCredentials);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await signInAccount({
        action: mode === 'register' ? 'register' : 'login',
        mode: session,
        email: email.trim(),
        password,
        displayName: name.trim() || undefined,
      });
      router.replace(sessionDeskPath(session));
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : home.auth.failed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-16">
      <Link href="/" className="mb-8 flex items-center gap-3">
        <BrandingLogo size={40} animated={false} />
        <span>
          <span className="block text-sm font-semibold">{APP.name}</span>
          <span className="block text-xs text-ink-muted">{APP.nameDevanagari}</span>
        </span>
      </Link>

      <h1 className="text-headline">{mode === 'register' ? home.auth.continue : home.auth.title}</h1>
      <p className="mt-2 text-sm text-ink-muted">
        {mode === 'register' ? desk.login.registerHint : desk.login.loginHint}
      </p>
      <p className="mt-2 text-xs text-ink-faint">{home.auth.note}</p>

      <label className="mt-6 block text-xs font-semibold text-ink-muted">
        {home.auth.name}
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="mt-1.5 w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink"
        />
      </label>
      <label className="mt-3 block text-xs font-semibold text-ink-muted">
        {home.auth.email}
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-1.5 w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink"
        />
      </label>
      <label className="mt-3 block text-xs font-semibold text-ink-muted">
        {home.auth.password}
        <input
          type="password"
          autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-1.5 w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink"
        />
      </label>
      {error ? <p className="mt-2 text-xs text-ink-muted">{error}</p> : null}
      <p className="mt-2 text-[11px] text-ink-faint">{home.auth.officerHint}</p>

      <div className="mt-5 grid gap-2">
        <Button onClick={enterGuest} className="w-full" disabled={busy}>
          <ShieldOff className="h-4 w-4" />
          {home.auth.guest}
        </Button>
        <p className="text-center text-[11px] text-ink-muted">{home.auth.guestHint}</p>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Button variant="ghost" onClick={() => void enterAccount('citizen')} disabled={busy}>
            <UserRound className="h-4 w-4 text-saffron" />
            {home.auth.citizen}
          </Button>
          <Button variant="ghost" onClick={() => void enterAccount('csc')} disabled={busy}>
            <Store className="h-4 w-4 text-mint" />
            {home.auth.csc}
          </Button>
          <Button variant="ghost" onClick={() => void enterAccount('officer')} disabled={busy}>
            <Landmark className="h-4 w-4 text-amber" />
            {home.auth.officer}
          </Button>
        </div>
      </div>

      {session?.accessToken ? (
        <div className="mt-8 rounded-xl border border-line px-3 py-3">
          <p className="text-[11px] text-ink-muted">{home.auth.forgetHint}</p>
          <Button
            variant="ghost"
            className="mt-2 w-full"
            disabled={forgetBusy}
            onClick={() => {
              setForgetBusy(true);
              void purgeAccount()
                .catch((caught) => {
                  setError(caught instanceof ApiError ? caught.message : home.auth.failed);
                })
                .finally(() => setForgetBusy(false));
            }}
          >
            {forgetBusy ? home.auth.forgetBusy : home.auth.forget}
          </Button>
        </div>
      ) : null}

      <p className="mt-8 text-center text-sm text-ink-muted">
        {mode === 'login' ? (
          <Link href="/register" className="font-semibold text-saffron">
            {home.auth.continue}
          </Link>
        ) : (
          <Link href="/login" className="font-semibold text-saffron">
            {home.nav.signIn}
          </Link>
        )}
      </p>
    </div>
  );
}

export default AuthScreen;
