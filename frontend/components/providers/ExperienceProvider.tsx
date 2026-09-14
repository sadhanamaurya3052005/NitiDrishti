'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import {
  ROLE_VIEW_STORAGE_KEY,
  SESSION_STORAGE_KEY,
  type LocalSession,
  type RoleView,
  type SessionMode,
} from '@/lib/config';
import type { CasteCategory } from '@/types';

export interface CitizenProfile {
  age: number;
  income: number;
  category: CasteCategory;
  landHectares: number;
  gender: 'any' | 'female' | 'male';
  occupation: 'farmer' | 'student' | 'artisan' | 'shg' | 'other';
  kccActive: boolean | null;
  documents: Record<string, boolean>;
}

export interface DossierJob {
  id: string;
  schemeName: string;
  status: 'queued' | 'ready';
  createdAt: string;
}

const DEFAULT_PROFILE: CitizenProfile = {
  age: 28,
  income: 180000,
  category: 'OBC',
  landHectares: 1.2,
  gender: 'any',
  occupation: 'farmer',
  kccActive: null,
  documents: {},
};

interface ExperienceContextValue {
  roleView: RoleView;
  setRoleView: (view: RoleView) => void;
  session: LocalSession | null;
  signIn: (mode: SessionMode, displayName?: string) => void;
  signOut: () => void;
  profile: CitizenProfile;
  patchProfile: (patch: Partial<CitizenProfile>) => void;
  setDocument: (id: string, present: boolean) => void;
  savedSchemeIds: string[];
  toggleSaveScheme: (id: string) => void;
  dossierQueue: DossierJob[];
  enqueueDossier: (schemeName: string) => void;
}

const ExperienceContext = createContext<ExperienceContextValue | null>(null);

export function ExperienceProvider({ children }: { children: React.ReactNode }) {
  const [roleView, setRoleViewState] = useState<RoleView>('citizen');
  const [session, setSession] = useState<LocalSession | null>(null);
  const [profile, setProfile] = useState<CitizenProfile>(DEFAULT_PROFILE);
  const [savedSchemeIds, setSavedSchemeIds] = useState<string[]>([]);
  const [dossierQueue, setDossierQueue] = useState<DossierJob[]>([]);

  useEffect(() => {
    const view = window.localStorage.getItem(ROLE_VIEW_STORAGE_KEY);
    if (view === 'citizen' || view === 'csc') setRoleViewState(view);
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (raw) {
      try {
        setSession(JSON.parse(raw) as LocalSession);
      } catch {
        window.localStorage.removeItem(SESSION_STORAGE_KEY);
      }
    }
  }, []);

  const setRoleView = useCallback((view: RoleView) => {
    setRoleViewState(view);
    window.localStorage.setItem(ROLE_VIEW_STORAGE_KEY, view);
  }, []);

  const signIn = useCallback((mode: SessionMode, displayName?: string) => {
    const next: LocalSession = {
      mode,
      displayName: mode === 'guest' ? null : (displayName ?? 'Citizen'),
      startedAt: new Date().toISOString(),
    };
    setSession(next);
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(next));
    setRoleViewState(mode === 'csc' ? 'csc' : 'citizen');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const signOut = useCallback(() => {
    setSession(null);
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const patchProfile = useCallback((patch: Partial<CitizenProfile>) => {
    setProfile((current) => ({ ...current, ...patch }));
  }, []);

  const setDocument = useCallback((id: string, present: boolean) => {
    setProfile((current) => ({
      ...current,
      documents: { ...current.documents, [id]: present },
    }));
  }, []);

  const toggleSaveScheme = useCallback((id: string) => {
    setSavedSchemeIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }, []);

  const enqueueDossier = useCallback((schemeName: string) => {
    setDossierQueue((current) => {
      const job: DossierJob = {
        id: `dos-${Date.now()}`,
        schemeName,
        status: 'queued',
        createdAt: new Date().toISOString(),
      };
      return [job, ...current].slice(0, 12);
    });
  }, []);

  const value = useMemo(
    () => ({
      roleView,
      setRoleView,
      session,
      signIn,
      signOut,
      profile,
      patchProfile,
      setDocument,
      savedSchemeIds,
      toggleSaveScheme,
      dossierQueue,
      enqueueDossier,
    }),
    [
      roleView,
      setRoleView,
      session,
      signIn,
      signOut,
      profile,
      patchProfile,
      setDocument,
      savedSchemeIds,
      toggleSaveScheme,
      dossierQueue,
      enqueueDossier,
    ],
  );

  return <ExperienceContext.Provider value={value}>{children}</ExperienceContext.Provider>;
}

export function useExperience(): ExperienceContextValue {
  const context = useContext(ExperienceContext);
  if (!context) throw new Error('useExperience must be used inside ExperienceProvider');
  return context;
}
