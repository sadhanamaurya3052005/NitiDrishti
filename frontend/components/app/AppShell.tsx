'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { CommandPalette } from '@/components/app/CommandPalette';
import { Sidebar } from '@/components/app/Sidebar';
import { Topbar } from '@/components/app/Topbar';
import { cn } from '@/lib/cn';
import { easings } from '@/lib/motion';

const COLLAPSE_KEY = 'nd.sidebarCollapsed';

/**
 * Application chrome shared by every workspace: sidebar, topbar, command
 * palette and the transition between routes.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const gateway = ['/citizen', '/csc', '/welfare', '/analytics'].includes(pathname);

  useEffect(() => {
    setCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === '1');
  }, []);

  useEffect(() => {
    if (gateway) setCollapsed(true);
  }, [gateway]);

  const toggleCollapse = useCallback(() => {
    setCollapsed((value) => {
      window.localStorage.setItem(COLLAPSE_KEY, value ? '0' : '1');
      return !value;
    });
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen((value) => !value);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  return (
    <div className="flex min-h-dvh bg-canvas">
      <aside
        className={cn(
          'nd-no-print sticky top-0 hidden h-dvh shrink-0 transition-[width] duration-300 ease-civic lg:block',
          collapsed ? 'w-[76px]' : 'w-[264px]',
        )}
      >
        <Sidebar collapsed={collapsed} onToggleCollapse={toggleCollapse} />
      </aside>

      <AnimatePresence>
        {mobileNavOpen && (
          <>
            <motion.button
              type="button"
              aria-label="Close navigation"
              className="fixed inset-0 z-40 bg-ink/25 backdrop-blur-sm lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileNavOpen(false)}
            />
            <motion.aside
              className="fixed inset-y-0 left-0 z-50 w-[272px] lg:hidden"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.28, ease: easings.civic }}
            >
              <Sidebar
                collapsed={false}
                onToggleCollapse={toggleCollapse}
                onNavigate={() => setMobileNavOpen(false)}
              />
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                aria-label="Close navigation"
                className="absolute -right-11 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-surface text-ink-soft shadow-lift"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          onOpenPalette={() => setPaletteOpen(true)}
          onOpenMobileNav={() => setMobileNavOpen(true)}
        />

        <AnimatePresence mode="wait">
          <motion.main
            key={pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3, ease: easings.civic }}
            className={cn('flex-1', gateway ? 'px-3 py-4 sm:px-5' : 'px-4 py-8 sm:px-8')}
          >
            {children}
          </motion.main>
        </AnimatePresence>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}

export default AppShell;
