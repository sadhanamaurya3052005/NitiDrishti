'use client';

import { motion } from 'framer-motion';
import { ArrowLeft, ChevronsLeft, ChevronsRight, Lock } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { BrandingLogo } from '@/components/brand/BrandingLogo';
import { useSplash } from '@/components/brand/SplashProvider';
import { useRole } from '@/components/app/RoleProvider';
import { useLocale } from '@/components/providers/LocaleProvider';
import { ACCENTS } from '@/lib/accents';
import { cn } from '@/lib/cn';
import { APP } from '@/lib/config';
import { TOOL_ORDER, TOOL_ROUTES } from '@/lib/tools';
import { WORKSPACE_ROUTES, canAccess } from '@/lib/workspaces';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  /** Called after navigation so the mobile drawer can close itself. */
  onNavigate?: () => void;
}

export function Sidebar({ collapsed, onToggleCollapse, onNavigate }: SidebarProps) {
  const { app } = useLocale();
  const { role } = useRole();
  const { booted, emblemLayoutId } = useSplash();
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col border-r border-line bg-surface-muted">
      <div
        className={cn(
          'flex h-[var(--nd-header-h)] items-center gap-3 border-b border-line px-4',
          collapsed && 'justify-center px-2',
        )}
      >
        <Link href="/" className="flex items-center gap-3" onClick={onNavigate}>
          <span className="flex h-9 w-9 items-center justify-center">
            {booted ? (
              <BrandingLogo size={34} animated={false} layoutId={emblemLayoutId} />
            ) : (
              <span className="h-9 w-9" aria-hidden />
            )}
          </span>
          {!collapsed && (
            <span className="flex flex-col leading-none">
              <span className="text-sm font-semibold tracking-tight text-ink">{APP.name}</span>
              <span className="font-deva text-[0.7rem] text-ink-muted">{APP.nameDevanagari}</span>
            </span>
          )}
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label={app.nav.workspaces}>
        {!collapsed && <p className="nd-eyebrow px-2 pb-2">{app.nav.workspaces}</p>}

        <ul className="space-y-1">
          {WORKSPACE_ROUTES.map((workspace) => {
            const active = pathname === workspace.href;
            const allowed = canAccess(workspace, role);
            const accent = ACCENTS[workspace.accent];
            const Icon = workspace.icon;
            const label = app.workspaces[workspace.id].short;

            return (
              <li key={workspace.id}>
                <Link
                  href={workspace.href}
                  onClick={onNavigate}
                  title={collapsed ? label : undefined}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'group relative flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-sm font-medium transition-colors',
                    active ? 'text-ink' : 'text-ink-soft hover:bg-canvas-deep hover:text-ink',
                    !allowed && 'opacity-55',
                    collapsed && 'justify-center px-0',
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="nd-nav-active"
                      className="absolute inset-0 -z-10 rounded-xl border border-line bg-surface shadow-soft"
                      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    />
                  )}
                  <span
                    className={cn(
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-transform duration-300 group-hover:scale-105',
                      active ? accent.icon : 'bg-canvas-deep text-ink-muted',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  {!collapsed && <span className="truncate">{label}</span>}
                  {!collapsed && !allowed && (
                    <Lock className="ml-auto h-3.5 w-3.5 text-ink-faint" aria-hidden />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        {!collapsed && (
          <>
            <p className="nd-eyebrow px-2 pb-2 pt-6">{app.nav.tools}</p>
            <ul className="space-y-1">
              {TOOL_ORDER.map((toolId) => {
                const tool = app.tools[toolId];
                const href = TOOL_ROUTES[toolId];
                const active = pathname === href;
                return (
                  <li key={toolId}>
                    <Link
                      href={href}
                      onClick={onNavigate}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm transition-colors',
                        active ? 'bg-surface font-medium text-ink shadow-soft' : 'text-ink-soft hover:bg-canvas-deep hover:text-ink',
                      )}
                    >
                      <span className="truncate">{tool.name}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </nav>

      <div className="border-t border-line p-3">
        {!collapsed && (
          <Link
            href="/"
            onClick={onNavigate}
            className="mb-2 flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-medium text-ink-muted transition-colors hover:bg-canvas-deep hover:text-ink"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {app.nav.backToSite}
          </Link>
        )}

        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={collapsed ? app.nav.expand : app.nav.collapse}
          className={cn(
            'hidden w-full items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-medium text-ink-muted transition-colors hover:bg-canvas-deep hover:text-ink lg:flex',
            collapsed && 'justify-center px-0',
          )}
        >
          {collapsed ? (
            <ChevronsRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronsLeft className="h-4 w-4" />
              {app.nav.collapse}
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default Sidebar;
