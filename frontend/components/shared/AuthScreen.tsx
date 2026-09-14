'use client';

import { ShieldOff, UserRound } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { BrandingLogo } from '@/components/ui/BrandingLogo';
import { Button } from '@/components/ui/Button';
import { useExperience } from '@/components/providers/ExperienceProvider';
import { useLocale } from '@/components/providers/LocaleProvider';
import { APP, type SessionMode } from '@/lib/config';

export function AuthScreen({ mode }: { mode: 'login' | 'register' }) {
  const { home, desk } = useLocale();
  const { signIn } = useExperience();
  const router = useRouter();
  const [name, setName] = useState('');

  const enter = (session: SessionMode) => {
    signIn(session, name.trim() || undefined);
    router.push(session === 'csc' ? '/csc' : '/citizen');
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

      <div className="mt-5 grid gap-2">
        <Button onClick={() => enter('guest')} className="w-full">
          <ShieldOff className="h-4 w-4" />
          {home.auth.guest}
        </Button>
        <p className="text-center text-[11px] text-ink-muted">{home.auth.guestHint}</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Button variant="ghost" onClick={() => enter('citizen')}>
            <UserRound className="h-4 w-4 text-saffron" />
            {home.auth.citizen}
          </Button>
          <Button variant="ghost" onClick={() => enter('csc')}>
            {home.auth.csc}
          </Button>
        </div>
      </div>

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
