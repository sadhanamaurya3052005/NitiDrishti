'use client';

import { motion } from 'framer-motion';
import { CircleDashed, Database, Hammer } from 'lucide-react';

import { useLocale } from '@/components/providers/LocaleProvider';
import { ACCENTS } from '@/lib/accents';
import { cn } from '@/lib/cn';
import type { WorkspaceId } from '@/lib/i18n/landing';
import { stagger } from '@/lib/motion';
import { workspaceById } from '@/lib/workspaces';

/**
 * What a workspace shows before its phase is built.
 *
 * Deliberately not a mock dashboard: no invented counts, no placeholder charts.
 * It states the purpose, lists the modules that will appear, and shows an
 * honest empty state (PROJECT_RULES Rule 2).
 */
export function WorkspaceIntro({ id }: { id: WorkspaceId }) {
  const { app } = useLocale();
  const workspace = workspaceById(id);
  const copy = app.workspaces[id];
  const accent = ACCENTS[workspace.accent];
  const Icon = workspace.icon;

  return (
    <div className="mx-auto w-full max-w-5xl">
      <motion.header
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-wrap items-start justify-between gap-4"
      >
        <div className="flex items-start gap-4">
          <span
            className={cn('flex h-12 w-12 items-center justify-center rounded-xl', accent.icon)}
          >
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-headline">{copy.name}</h1>
            <p data-speech="summary" className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
              {copy.purpose}
            </p>
          </div>
        </div>

        <span className={cn('nd-chip', accent.chip)}>
          <Hammer className="h-3.5 w-3.5" />
          {app.intro.statusLabel}: {workspace.phase}
        </span>
      </motion.header>

      <section className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="nd-card p-6 lg:col-span-3">
          <h2 className="text-sm font-semibold text-ink">{app.intro.plannedTitle}</h2>

          <motion.ul
            className="mt-4 space-y-3"
            variants={stagger(0.08, 0.07)}
            initial="hidden"
            animate="visible"
          >
            {copy.modules.map((module, index) => (
              <motion.li
                key={module}
                variants={{ hidden: { opacity: 0, x: -8 }, visible: { opacity: 1, x: 0 } }}
                className="flex gap-3 text-sm leading-relaxed text-ink-soft"
              >
                <span className="nd-numeric mt-0.5 text-[11px] font-semibold text-ink-faint">
                  {String(index + 1).padStart(2, '0')}
                </span>
                {module}
              </motion.li>
            ))}
          </motion.ul>

          <p className="mt-5 border-t border-line pt-4 text-xs leading-relaxed text-ink-muted">
            {app.intro.dataNote}
          </p>
        </div>

        <div className="nd-panel flex flex-col items-center justify-center p-8 text-center lg:col-span-2">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-canvas-deep text-ink-muted">
            <Database className="h-5 w-5" />
          </span>
          <h2 className="mt-4 text-sm font-semibold text-ink">{app.intro.emptyTitle}</h2>
          <p className="mt-2 text-xs leading-relaxed text-ink-muted">{app.intro.emptyBody}</p>

          <div className="mt-6 w-full space-y-2" aria-hidden>
            <div className="nd-skeleton h-3 w-full" />
            <div className="nd-skeleton h-3 w-4/5" />
            <div className="nd-skeleton h-3 w-2/3" />
          </div>

          <span className="mt-6 inline-flex items-center gap-1.5 text-[11px] font-medium text-ink-faint">
            <CircleDashed className="h-3.5 w-3.5 animate-spin [animation-duration:3s]" />
            {workspace.phase}
          </span>
        </div>
      </section>
    </div>
  );
}

export default WorkspaceIntro;
