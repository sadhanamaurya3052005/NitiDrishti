'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

interface BentoCardProps {
  title: string;
  kicker?: string;
  body?: string;
  href?: string;
  className?: string;
  children?: ReactNode;
}

/** Docs3 UI primitive — editorial card, not a rainbow tile. */
export function BentoCard({ title, kicker, body, href, className, children }: BentoCardProps) {
  const inner = (
    <>
      {kicker ? (
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">{kicker}</p>
      ) : null}
      <h3 className="mt-1 text-lg font-semibold leading-snug text-ink">{title}</h3>
      {body ? <p className="mt-2 text-sm leading-relaxed text-ink-soft">{body}</p> : null}
      {children}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={cn('nd-card-interactive block p-6', className)}>
        {inner}
      </Link>
    );
  }

  return <article className={cn('nd-card p-6', className)}>{inner}</article>;
}

export default BentoCard;
