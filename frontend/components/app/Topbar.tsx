'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown, Languages, LogIn, LogOut, Menu, Moon, Search, Sun, Volume2, VolumeX, Wifi, WifiOff } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { useRole } from '@/components/app/RoleProvider';
import { useExperience } from '@/components/providers/ExperienceProvider';
import { useLocale } from '@/components/providers/LocaleProvider';
import { useTheme } from '@/components/providers/ThemeProvider';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { cn } from '@/lib/cn';
import { readableTextFromMain, speak, speechSupported, stopSpeaking } from '@/lib/speech';
import { TOOL_ROUTES } from '@/lib/tools';
import { ROLE_LABELS, ROLE_ORDER, WORKSPACE_ROUTES } from '@/lib/workspaces';

interface TopbarProps {
  onOpenPalette: () => void;
  onOpenMobileNav: () => void;
}

export function Topbar({ onOpenPalette, onOpenMobileNav }: TopbarProps) {
  const { app, desk, home, locale, toggleLocale } = useLocale();
  const { theme, toggleTheme } = useTheme();
  const { session, signOut } = useExperience();
  const pathname = usePathname();
  const router = useRouter();
  const online = useOnlineStatus();

  const current = WORKSPACE_ROUTES.find((workspace) => workspace.href === pathname);
  const toolTitle = (Object.entries(TOOL_ROUTES) as [string, string][]).find(([, href]) => href === pathname);
  const title = current
    ? app.workspaces[current.id].name
    : toolTitle
      ? app.tools[toolTitle[0] as keyof typeof app.tools].name
      : pathname === '/opportunities'
        ? desk.opportunities.title
        : null;

  return (
    <header className="nd-no-print sticky top-0 z-30 flex h-[var(--nd-header-h)] items-center gap-3 border-b border-line bg-canvas/85 px-4 backdrop-blur-xl sm:px-6">
      <button
        type="button"
        onClick={onOpenMobileNav}
        aria-label={app.nav.expand}
        className="-ml-1 flex h-9 w-9 items-center justify-center rounded-lg text-ink-soft transition hover:bg-canvas-deep hover:text-ink lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {title && (
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">{title}</p>
          {current && <p className="text-[11px] text-ink-muted">{current.status}</p>}
        </div>
      )}

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenPalette}
          className="hidden items-center gap-2 rounded-pill border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink-muted transition hover:border-line-strong hover:text-ink sm:flex"
        >
          <Search className="h-3.5 w-3.5" />
          {app.topbar.search}
          <kbd className="rounded border border-line bg-canvas-deep px-1.5 py-0.5 text-[10px] font-semibold text-ink-faint">
            {app.topbar.searchHint}
          </kbd>
        </button>

        <ListenButton />

        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-1.5 text-[11px] font-medium',
            online
              ? 'border-mint/25 bg-mint-soft text-mint-deep'
              : 'border-amber/25 bg-amber-soft text-amber-deep',
          )}
          title={online ? app.topbar.online : app.topbar.offline}
        >
          {online ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
          <span className="hidden md:inline">{online ? app.topbar.online : app.topbar.offline}</span>
        </span>

        <button
          type="button"
          onClick={toggleLocale}
          aria-label={locale === 'en' ? 'हिन्दी में बदलें' : 'Switch to English'}
          className="inline-flex items-center gap-1.5 rounded-pill border border-line bg-surface px-2.5 py-1.5 text-xs font-semibold text-ink-soft transition hover:border-line-strong hover:text-ink active:scale-[0.97]"
        >
          <Languages className="h-3.5 w-3.5 text-saffron" />
          {locale === 'en' ? 'हिन्दी' : 'EN'}
        </button>

        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === 'light' ? 'Dark mode' : 'Light mode'}
          className="inline-flex h-9 w-9 items-center justify-center rounded-pill border border-line bg-surface"
        >
          {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4 text-saffron" />}
        </button>

        {session ? (
          <>
            <span className="hidden max-w-[8rem] truncate text-xs font-semibold text-ink md:inline">
              {session.displayName ?? home.nav.guest}
            </span>
            <button
              type="button"
              onClick={() => {
                signOut();
                router.push('/');
              }}
              className="inline-flex items-center gap-1.5 rounded-pill border border-line bg-surface px-2.5 py-1.5 text-xs font-semibold text-ink-soft transition hover:border-line-strong hover:text-ink"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{home.nav.signOut}</span>
            </button>
          </>
        ) : (
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 rounded-pill border border-saffron/40 bg-saffron/10 px-2.5 py-1.5 text-xs font-semibold text-ink"
          >
            <LogIn className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{home.nav.signIn}</span>
          </Link>
        )}

        <RoleSwitcher />
      </div>
    </header>
  );
}

function ListenButton() {
  const { app, locale } = useLocale();
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported(speechSupported());
    return () => stopSpeaking();
  }, []);

  if (!supported) return null;

  const handleClick = () => {
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
      return;
    }
    const text = readableTextFromMain();
    if (!text) return;
    setSpeaking(true);
    speak(text, locale, () => setSpeaking(false));
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={speaking ? app.topbar.stop : app.topbar.listen}
      title={speaking ? app.topbar.stop : app.topbar.listen}
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded-pill border transition',
        speaking
          ? 'border-primary/30 bg-primary-50 text-primary-700'
          : 'border-line bg-surface text-ink-soft hover:border-line-strong hover:text-ink',
      )}
    >
      {speaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
    </button>
  );
}

function RoleSwitcher() {
  const { app, locale } = useLocale();
  const { role, setRole } = useRole();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex items-center gap-2 rounded-pill border border-line bg-surface px-2.5 py-1.5 text-xs font-semibold text-ink-soft transition hover:border-line-strong hover:text-ink"
      >
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-50 text-[10px] font-bold text-primary-700">
          {ROLE_LABELS[role][locale].charAt(0)}
        </span>
        <span className="hidden max-w-[9rem] truncate sm:inline">{ROLE_LABELS[role][locale]}</span>
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-0 top-[calc(100%+0.5rem)] w-64 overflow-hidden rounded-card border border-line bg-surface shadow-lift"
          >
            <p className="border-b border-line px-3 py-2 nd-eyebrow">{app.topbar.roleLabel}</p>
            <ul className="p-1.5">
              {ROLE_ORDER.map((option) => (
                <li key={option}>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setRole(option);
                      setOpen(false);
                    }}
                    className={cn(
                      'flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors',
                      option === role
                        ? 'bg-primary-50 font-semibold text-primary-700'
                        : 'text-ink-soft hover:bg-canvas-deep hover:text-ink',
                    )}
                  >
                    {ROLE_LABELS[option][locale]}
                    {option === role && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                  </button>
                </li>
              ))}
            </ul>
            <p className="border-t border-line bg-surface-muted px-3 py-2 text-[11px] leading-snug text-ink-muted">
              {app.topbar.previewNote}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Topbar;
