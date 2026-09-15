'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Landmark, ShieldOff, Store, UserRound, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useExperience } from '@/components/providers/ExperienceProvider';
import { useLocale } from '@/components/providers/LocaleProvider';
import { ApiError } from '@/lib/api';
import { sessionDeskPath, type SessionMode } from '@/lib/config';

export function AuthModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { home } = useLocale();
  const { signIn, signInAccount } = useExperience();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const enterGuest = () => {
    signIn('guest', name.trim() || undefined);
    onClose();
    router.replace(sessionDeskPath('guest'));
  };

  const enterAccount = async (mode: Exclude<SessionMode, 'guest'>) => {
    if (!email.trim() || !password) {
      setError(home.auth.missingCredentials);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await signInAccount({
        action: 'login',
        mode,
        email: email.trim(),
        password,
        displayName: name.trim() || undefined,
      });
      onClose();
      router.replace(sessionDeskPath(mode));
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : home.auth.failed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-navy-deep/55 p-4 backdrop-blur-sm sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button type="button" className="absolute inset-0" aria-label={home.auth.title} onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal
            aria-labelledby="nd-auth-title"
            className="relative w-full max-w-md rounded-card border border-line bg-surface p-6 shadow-lift"
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 16, opacity: 0 }}
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 rounded-full p-1 text-ink-muted hover:bg-canvas-deep hover:text-ink"
            >
              <X className="h-4 w-4" />
            </button>
            <h2 id="nd-auth-title" className="text-headline">
              {home.auth.title}
            </h2>
            <p className="mt-2 text-sm text-ink-muted">{home.auth.note}</p>

            <label className="mt-5 block text-xs font-semibold text-ink-muted">
              {home.auth.name}
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-1.5 w-full rounded-xl border border-line bg-canvas px-3 py-2 text-sm text-ink"
              />
            </label>
            <label className="mt-3 block text-xs font-semibold text-ink-muted">
              {home.auth.email}
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-1.5 w-full rounded-xl border border-line bg-canvas px-3 py-2 text-sm text-ink"
              />
            </label>
            <label className="mt-3 block text-xs font-semibold text-ink-muted">
              {home.auth.password}
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-1.5 w-full rounded-xl border border-line bg-canvas px-3 py-2 text-sm text-ink"
              />
            </label>
            {error ? <p className="mt-2 text-xs text-ink-muted">{error}</p> : null}
            <p className="mt-2 text-[11px] text-ink-faint">{home.auth.officerHint}</p>

            <div className="mt-5 grid gap-2">
              <button type="button" onClick={enterGuest} className="nd-cta w-full" disabled={busy}>
                <ShieldOff className="h-4 w-4" />
                {home.auth.guest}
              </button>
              <p className="text-center text-[11px] text-ink-muted">{home.auth.guestHint}</p>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => void enterAccount('citizen')}
                  disabled={busy}
                  className="inline-flex items-center justify-center gap-2 rounded-pill border border-line bg-surface px-3 py-2.5 text-sm font-semibold hover:border-saffron"
                >
                  <UserRound className="h-4 w-4 text-saffron" />
                  {home.auth.citizen}
                </button>
                <button
                  type="button"
                  onClick={() => void enterAccount('csc')}
                  disabled={busy}
                  className="inline-flex items-center justify-center gap-2 rounded-pill border border-line bg-surface px-3 py-2.5 text-sm font-semibold hover:border-saffron"
                >
                  <Store className="h-4 w-4 text-mint" />
                  {home.auth.csc}
                </button>
                <button
                  type="button"
                  onClick={() => void enterAccount('officer')}
                  disabled={busy}
                  className="inline-flex items-center justify-center gap-2 rounded-pill border border-line bg-surface px-3 py-2.5 text-sm font-semibold hover:border-saffron"
                >
                  <Landmark className="h-4 w-4 text-amber" />
                  {home.auth.officer}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
