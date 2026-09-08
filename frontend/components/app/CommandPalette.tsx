'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { CornerDownLeft, Lock, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

import { useLocale } from '@/components/providers/LocaleProvider';
import { ACCENTS } from '@/lib/accents';
import { cn } from '@/lib/cn';
import type { ToolId } from '@/lib/i18n/app';
import { easings } from '@/lib/motion';
import { WORKSPACE_ROUTES } from '@/lib/workspaces';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

interface Entry {
  key: string;
  label: string;
  hint: string;
  href: string | null;
}

const TOOL_ORDER: readonly ToolId[] = [
  'explore',
  'eligibility',
  'whatif',
  'compare',
  'alerts',
  'assistant',
];

/** Keyboard-first navigation between workspaces (Ctrl/Cmd + K). */
export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const { app } = useLocale();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const entries = useMemo<Entry[]>(() => {
    const workspaces: Entry[] = WORKSPACE_ROUTES.map((workspace) => ({
      key: workspace.id,
      label: app.workspaces[workspace.id].name,
      hint: workspace.phase,
      href: workspace.href,
    }));

    const tools: Entry[] = TOOL_ORDER.map((toolId) => ({
      key: toolId,
      label: app.tools[toolId].name,
      hint: app.tools[toolId].phase,
      href: null,
    }));

    return [...workspaces, ...tools];
  }, [app]);

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return entries;
    return entries.filter((entry) => entry.label.toLowerCase().includes(needle));
  }, [entries, query]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      const timer = window.setTimeout(() => inputRef.current?.focus(), 40);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const openEntry = (entry: Entry | undefined) => {
    if (!entry?.href) return;
    onClose();
    router.push(entry.href);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      onClose();
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => (results.length ? (index + 1) % results.length : 0));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => (results.length ? (index - 1 + results.length) % results.length : 0));
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      openEntry(results[activeIndex]);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[12vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="absolute inset-0 cursor-default bg-ink/25 backdrop-blur-sm"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.985 }}
            transition={{ duration: 0.22, ease: easings.civic }}
            onKeyDown={onKeyDown}
            className="relative w-full max-w-xl overflow-hidden rounded-card border border-line bg-surface shadow-lift"
          >
            <div className="flex items-center gap-3 border-b border-line px-4">
              <Search className="h-4 w-4 shrink-0 text-ink-faint" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={app.palette.placeholder}
                className="h-12 w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
              />
            </div>

            <ul className="max-h-[52vh] overflow-y-auto p-2">
              {results.length === 0 && (
                <li className="px-3 py-8 text-center text-sm text-ink-muted">{app.palette.empty}</li>
              )}

              {results.map((entry, index) => {
                const workspace = WORKSPACE_ROUTES.find((item) => item.id === entry.key);
                const accent = workspace ? ACCENTS[workspace.accent] : null;
                const Icon = workspace?.icon;
                const active = index === activeIndex;

                return (
                  <li key={entry.key}>
                    <button
                      type="button"
                      disabled={!entry.href}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => openEntry(entry)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
                        active && entry.href && 'bg-canvas-deep',
                        !entry.href && 'cursor-not-allowed opacity-60',
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                          accent ? accent.icon : 'bg-canvas-deep text-ink-faint',
                        )}
                      >
                        {Icon ? <Icon className="h-4 w-4" /> : <Lock className="h-3.5 w-3.5" />}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-ink">
                          {entry.label}
                        </span>
                        <span className="block text-[11px] text-ink-muted">
                          {entry.href ? entry.hint : `${app.palette.locked} · ${entry.hint}`}
                        </span>
                      </span>

                      {active && entry.href && (
                        <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-ink-faint" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>

            <p className="border-t border-line bg-surface-muted px-4 py-2 text-[11px] text-ink-muted">
              {app.palette.hint}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default CommandPalette;
