'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { useExperience } from '@/components/providers/ExperienceProvider';
import { PREVIEW_ROLE_STORAGE_KEY, preferredServerRole, previewRoleForSession } from '@/lib/config';
import type { Role } from '@/types';

interface RoleContextValue {
  role: Role;
  setRole: (role: Role) => void;
  /** False when the signed-in JWT carries a server role. */
  isPreview: boolean;
}

const RoleContext = createContext<RoleContextValue | null>(null);

/**
 * Holds the currently viewed role.
 *
 * Guests still use a local preview selector. When a JWT session includes
 * server roles, those roles win over `nd.previewRole`.
 */
export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<Role>('CITIZEN');
  const { session } = useExperience();
  const serverRole = preferredServerRole(session?.roles);
  const isPreview = !serverRole;

  useEffect(() => {
    const stored = window.localStorage.getItem(PREVIEW_ROLE_STORAGE_KEY);
    if (stored) setRoleState(stored as Role);
  }, []);

  useEffect(() => {
    if (serverRole) {
      setRoleState(serverRole);
      window.localStorage.setItem(PREVIEW_ROLE_STORAGE_KEY, serverRole);
      return;
    }
    if (!session) return;
    const next = previewRoleForSession(session.mode);
    setRoleState(next);
    window.localStorage.setItem(PREVIEW_ROLE_STORAGE_KEY, next);
  }, [serverRole, session?.mode]);

  const setRole = useCallback(
    (next: Role) => {
      if (serverRole && !session?.roles?.includes(next)) return;
      setRoleState(next);
      window.localStorage.setItem(PREVIEW_ROLE_STORAGE_KEY, next);
    },
    [serverRole, session?.roles],
  );

  const value = useMemo<RoleContextValue>(
    () => ({ role: serverRole ?? role, setRole, isPreview }),
    [role, setRole, isPreview, serverRole],
  );

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole(): RoleContextValue {
  const context = useContext(RoleContext);
  if (!context) throw new Error('useRole must be used inside <RoleProvider>');
  return context;
}
