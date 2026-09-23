'use client';

import type { ReactNode } from 'react';

import { useLocale } from '@/components/providers/LocaleProvider';
import { cn } from '@/lib/cn';
import type { Locale } from '@/lib/config';
import type { SchemeEvaluation } from '@/lib/schemes/evaluate';

function sourceHost(url?: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url.replace(/^https?:\/\//, '');
  }
}

function formatIsoDate(value: string | null | undefined, locale: Locale): string | null {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(locale === 'hi' ? 'hi-IN' : 'en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function GazetteEvidence({
  evaluation,
  fallbackUrl,
  className,
  compact = false,
}: {
  evaluation: SchemeEvaluation | null | undefined;
  fallbackUrl?: string | null;
  className?: string;
  compact?: boolean;
}) {
  const { home, locale } = useLocale();
  if (!evaluation) return null;

  const url = evaluation.sourceUrl || fallbackUrl || null;
  const host = sourceHost(url);
  const asOn = formatIsoDate(evaluation.asOf, locale) ?? home.inspector.asOfCurrent;
  const version = evaluation.versionNumber != null ? `v${evaluation.versionNumber}` : null;
  const from = formatIsoDate(evaluation.effectiveFrom, locale);
  const to = formatIsoDate(evaluation.effectiveTo, locale);
  const effective = from && to ? `${from} → ${to}` : from || to;

  const parts: Array<{ key: string; node: ReactNode }> = [];
  if (version) {
    parts.push({
      key: 'version',
      node: (
        <>
          {home.inspector.version} {version}
        </>
      ),
    });
  }
  parts.push({
    key: 'asOf',
    node: (
      <>
        {home.inspector.asOf} {asOn}
      </>
    ),
  });
  if (host && url) {
    parts.push({
      key: 'source',
      node: compact ? (
        <>{host}</>
      ) : (
        <a href={url} target="_blank" rel="noreferrer" className="font-semibold text-saffron">
          {host}
        </a>
      ),
    });
  }
  if (effective && !compact) {
    parts.push({
      key: 'effective',
      node: (
        <>
          {home.inspector.effective} {effective}
        </>
      ),
    });
  }

  return (
    <span className={cn('block', compact ? 'text-[11px] text-ink-muted' : 'text-xs text-ink-muted', className)}>
      {parts.map((part, index) => (
        <span key={part.key}>
          {index > 0 ? ' · ' : null}
          {part.node}
        </span>
      ))}
    </span>
  );
}
