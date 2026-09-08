'use client';

import { motion } from 'framer-motion';
import {
  ArrowUpRight,
  BarChart3,
  Check,
  Landmark,
  Scale,
  Store,
  Users,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';

import { Reveal } from '@/components/motion/Reveal';
import { useLocale } from '@/components/providers/LocaleProvider';
import { ACCENTS } from '@/lib/accents';
import { cn } from '@/lib/cn';
import type { WorkspaceId } from '@/lib/i18n/landing';
import { stagger } from '@/lib/motion';
import { workspaceById } from '@/lib/workspaces';
import type { Accent } from '@/types';

interface WorkspaceStyle {
  icon: LucideIcon;
  accent: Accent;
  /** Bento span classes at the large breakpoint. */
  span: string;
}

const WORKSPACE_STYLES: Record<WorkspaceId, WorkspaceStyle> = {
  citizen: { icon: Users, accent: 'mint', span: 'lg:col-span-3' },
  nyaymitra: { icon: Scale, accent: 'violet', span: 'lg:col-span-3' },
  csc: { icon: Store, accent: 'peach', span: 'lg:col-span-2' },
  officer: { icon: Landmark, accent: 'primary', span: 'lg:col-span-2' },
  analytics: { icon: BarChart3, accent: 'sky', span: 'lg:col-span-2' },
};

/** Bento grid of the five role workspaces. */
export function WorkspaceGrid() {
  const { copy } = useLocale();

  return (
    <section id="workspaces" className="scroll-mt-24 py-16 sm:py-24">
      <div className="nd-section">
        <Reveal className="max-w-3xl">
          <p className="nd-eyebrow">{copy.workspaces.eyebrow}</p>
          <h2 className="mt-3 text-display">{copy.workspaces.title}</h2>
          <p className="nd-lede mt-4">{copy.workspaces.lede}</p>
        </Reveal>

        <motion.div
          className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6"
          variants={stagger(0.05, 0.08)}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-8% 0px' }}
        >
          {copy.workspaces.items.map((workspace) => {
            const style = WORKSPACE_STYLES[workspace.id];
            const accent = ACCENTS[style.accent];
            const Icon = style.icon;

            return (
              <motion.div
                key={workspace.id}
                variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                className={style.span}
              >
                <Link
                  href={workspaceById(workspace.id).href}
                  className={cn(
                    'nd-card group flex h-full flex-col p-6 transition-all duration-300 ease-civic hover:-translate-y-1',
                    accent.hoverBorder,
                    accent.hoverShadow,
                  )}
                >
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={cn(
                      'flex h-11 w-11 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105',
                      accent.icon,
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className={cn('nd-chip text-[10px] uppercase tracking-wider', accent.chip)}>
                    {workspace.status}
                  </span>
                </div>

                <h3 className="mt-5 text-lg font-semibold leading-snug text-ink">{workspace.name}</h3>
                <p className={cn('mt-1 text-xs font-semibold uppercase tracking-wider', accent.text)}>
                  {workspace.role}
                </p>

                <ul className="mt-5 space-y-2.5">
                  {workspace.points.map((point) => (
                    <li key={point} className="flex gap-2.5 text-sm leading-relaxed text-ink-soft">
                      <Check className={cn('mt-1 h-3.5 w-3.5 shrink-0', accent.text)} strokeWidth={3} />
                      {point}
                    </li>
                  ))}
                </ul>

                <div className="mt-auto flex items-center justify-between pt-6">
                  <span
                    className={cn(
                      'block h-[3px] w-10 origin-left rounded-pill opacity-70 transition-transform duration-500 ease-civic group-hover:scale-x-[2.6]',
                      accent.bar,
                    )}
                  />
                  <ArrowUpRight
                    className={cn(
                      'h-4 w-4 opacity-0 transition-all duration-300 group-hover:opacity-100',
                      accent.text,
                    )}
                  />
                </div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}

export default WorkspaceGrid;
