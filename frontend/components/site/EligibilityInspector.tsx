'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

import { GazetteEvidence } from '@/components/site/GazetteEvidence';
import { useLocale } from '@/components/providers/LocaleProvider';
import { cn } from '@/lib/cn';
import type { SchemeEvaluation } from '@/lib/schemes/evaluate';

export function EligibilityInspector({
  open,
  onClose,
  schemeName,
  evaluation,
}: {
  open: boolean;
  onClose: () => void;
  schemeName: string;
  evaluation: SchemeEvaluation | null;
}) {
  const { home } = useLocale();
  if (!evaluation) return null;

  const statusLabel =
    evaluation.status === 'ELIGIBLE'
      ? home.inspector.eligible
      : evaluation.status === 'PARTIAL_INFO'
        ? home.inspector.partial
        : home.inspector.ineligible;

  const failed = evaluation.rules.filter((rule) => rule.verdict === 'fail' || rule.verdict === 'unknown');

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-navy-deep/50 p-4 backdrop-blur-sm sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button type="button" className="absolute inset-0" onClick={onClose} aria-label={home.inspector.close} />
          <motion.div
            role="dialog"
            aria-modal
            className="relative w-full max-w-lg overflow-hidden rounded-card border border-line bg-surface shadow-lift"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 12, opacity: 0 }}
          >
            <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
              <div>
                <p className="nd-eyebrow">{home.inspector.title}</p>
                <h2 className="mt-1 text-lg font-semibold">{schemeName}</h2>
              </div>
              <button type="button" onClick={onClose} className="rounded-full p-1 hover:bg-canvas-deep">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-5 p-5 sm:grid-cols-[auto_1fr] sm:items-center">
              <div className="relative mx-auto h-28 w-28">
                <svg viewBox="0 0 120 120" className="-rotate-90">
                  <circle cx="60" cy="60" r="48" fill="none" stroke="currentColor" className="text-line" strokeWidth="10" />
                  <circle
                    cx="60"
                    cy="60"
                    r="48"
                    fill="none"
                    stroke="currentColor"
                    className="text-saffron"
                    strokeWidth="10"
                    strokeDasharray={`${(evaluation.score / 100) * 301} 301`}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-xl font-semibold">
                  {evaluation.score}%
                </span>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{home.inspector.score}</p>
                <p className="mt-1 text-sm font-semibold text-ink">{statusLabel}</p>
                <GazetteEvidence evaluation={evaluation} className="mt-2" />
                <p className="mt-2 text-xs text-ink-muted">{evaluation.disclaimer ?? home.inspector.disclaimer}</p>
                {evaluation.conflicts && evaluation.conflicts.length > 0 ? (
                  <p className="mt-2 text-xs font-medium text-amber-deep">{home.inspector.conflicts}</p>
                ) : null}
              </div>
            </div>
            <ul className="space-y-2 px-5 pb-5">
              {evaluation.rules.map((rule) => (
                <li
                  key={rule.id}
                  className={cn(
                    'rounded-xl border px-3 py-2 text-sm',
                    rule.verdict === 'pass' && 'border-mint/30 bg-mint-soft/60 text-mint-deep',
                    rule.verdict === 'fail' && 'border-rose/30 bg-rose-soft/70 text-rose-deep',
                    rule.verdict === 'unknown' && 'border-amber/30 bg-amber-soft/70 text-amber-deep',
                  )}
                >
                  <span className="font-mono text-[11px]">[{rule.verdict.toUpperCase()}] </span>
                  <span className="font-semibold">{rule.label}: </span>
                  {rule.explanation}
                </li>
              ))}
            </ul>
            {failed.length > 0 && (
              <div className="border-t border-line bg-surface-muted px-5 py-4 text-sm">
                <p className="font-semibold">{home.inspector.remediation}</p>
                <p className="mt-1 text-ink-soft">{failed[0]?.detail}</p>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
