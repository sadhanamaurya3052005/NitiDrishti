'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import type { Role } from '@/types';

const ROLE_STORAGE_KEY = 'nd.previewRole';

interface RoleContextValue {
  role: Role;
  setRole: (role: Role) => void;
  /** True until authentication lands, so the UI can say the role is not verified. */
  isPreview: boolean;
}

const RoleContext = createContext<RoleContextValue | null>(null);

/**
 * Holds the currently viewed role.
 *
 * This is a *preview* selector: it only shapes navigation. Real role assignment
 * and enforcement happen on the server in the authentication phase, and this
 * provider will read the session instead of local storage at that point.
 */
export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<Role>('CITIZEN');

  useEffect(() => {
    const stored = window.localStorage.getItem(ROLE_STORAGE_KEY);
    if (stored) setRoleState(stored as Role);
  }, []);

  const setRole = useCallback((next: Role) => {
    setRoleState(next);
    window.localStorage.setItem(ROLE_STORAGE_KEY, next);
  }, []);

  const value = useMemo<RoleContextValue>(() => ({ role, setRole, isPreview: true }), [role, setRole]);

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole(): RoleContextValue {
  const context = useContext(RoleContext);
  if (!context) throw new Error('useRole must be used inside <RoleProvider>');
  return context;
}
