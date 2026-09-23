'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import {
  createDossier,
  deleteAccount,
  fetchMe,
  loginAccount,
  logoutAccount,
  refreshAccount,
  registerAccount,
  updateProfile,
  type AuthUser,
  type TokenBundle,
} from '@/lib/api';
import {
  PREVIEW_ROLE_STORAGE_KEY,
  ROLE_VIEW_STORAGE_KEY,
  SESSION_STORAGE_KEY,
  fallbackDisplayName,
  preferredServerRole,
  previewRoleForSession,
  readStoredSession,
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

function persistSession(next: LocalSession) {
  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(next));
}

function consentFromUser(user: AuthUser): boolean {
  return Boolean(user.profile?.consent_retention);
}

function sessionFromBundle(mode: SessionMode, bundle: TokenBundle): LocalSession {
  return {
    mode,
    displayName: bundle.user.display_name,
    startedAt: new Date().toISOString(),
    accessToken: bundle.access_token,
    refreshToken: bundle.refresh_token,
    userId: bundle.user.id,
    roles: bundle.user.roles,
    emailMasked: bundle.user.email_masked,
  };
}

interface ExperienceContextValue {
  roleView: RoleView;
  setRoleView: (view: RoleView) => void;
  session: LocalSession | null;
  signIn: (mode: SessionMode, displayName?: string) => void;
  signInAccount: (input: {
    action: 'login' | 'register';
    mode: SessionMode;
    email: string;
    password: string;
    displayName?: string;
  }) => Promise<void>;
  signOut: () => void;
  purgeAccount: () => Promise<void>;
  consentRetention: boolean;
  setConsentRetention: (value: boolean) => Promise<void>;
  consentBusy: boolean;
  profile: CitizenProfile;
  patchProfile: (patch: Partial<CitizenProfile>) => void;
  setDocument: (id: string, present: boolean) => void;
  savedSchemeIds: string[];
  toggleSaveScheme: (id: string) => void;
  dossierQueue: DossierJob[];
  enqueueDossier: (schemeName: string, schemeId?: string) => void;
}

const ExperienceContext = createContext<ExperienceContextValue | null>(null);

export function ExperienceProvider({ children }: { children: React.ReactNode }) {
  const [roleView, setRoleViewState] = useState<RoleView>('citizen');
  const [session, setSession] = useState<LocalSession | null>(null);
  const [profile, setProfile] = useState<CitizenProfile>(DEFAULT_PROFILE);
  const [consentRetention, setConsentRetentionState] = useState(false);
  const [consentBusy, setConsentBusy] = useState(false);
  const [savedSchemeIds, setSavedSchemeIds] = useState<string[]>([]);
  const [dossierQueue, setDossierQueue] = useState<DossierJob[]>([]);

  useEffect(() => {
    const view = window.localStorage.getItem(ROLE_VIEW_STORAGE_KEY);
    if (view === 'citizen' || view === 'csc') setRoleViewState(view);
    const stored = readStoredSession();
    if (!stored) return;
    setSession(stored);
    if (!stored.accessToken) return;

    let cancelled = false;
    const hydrate = async () => {
      try {
        const me = await fetchMe(stored.accessToken as string);
        if (cancelled) return;
        const next: LocalSession = {
          ...stored,
          displayName: me.display_name,
          roles: me.roles,
          emailMasked: me.email_masked,
          userId: me.id,
        };
        setSession(next);
        persistSession(next);
        setConsentRetentionState(consentFromUser(me));
        const preferred = preferredServerRole(me.roles);
        if (preferred) window.localStorage.setItem(PREVIEW_ROLE_STORAGE_KEY, preferred);
      } catch {
        if (!stored.refreshToken) return;
        try {
          const bundle = await refreshAccount(stored.refreshToken);
          if (cancelled) return;
          const next = sessionFromBundle(stored.mode, bundle);
          setSession(next);
          persistSession(next);
          setConsentRetentionState(consentFromUser(bundle.user));
        } catch {
          if (cancelled) return;
          setSession(null);
          setConsentRetentionState(false);
          window.localStorage.removeItem(SESSION_STORAGE_KEY);
        }
      }
    };
    void hydrate();
    return () => {
      cancelled = true;
    };
  }, []);

  const setRoleView = useCallback((view: RoleView) => {
    setRoleViewState(view);
    window.localStorage.setItem(ROLE_VIEW_STORAGE_KEY, view);
  }, []);

  const signIn = useCallback((mode: SessionMode, displayName?: string) => {
    const next: LocalSession = {
      mode,
      displayName: displayName?.trim() || fallbackDisplayName(mode),
      startedAt: new Date().toISOString(),
    };
    const view: RoleView = mode === 'csc' ? 'csc' : 'citizen';
    setSession(next);
    setRoleViewState(view);
    setConsentRetentionState(false);
    persistSession(next);
    window.localStorage.setItem(ROLE_VIEW_STORAGE_KEY, view);
    window.localStorage.setItem(PREVIEW_ROLE_STORAGE_KEY, previewRoleForSession(mode));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const signInAccount = useCallback(
    async (input: {
      action: 'login' | 'register';
      mode: SessionMode;
      email: string;
      password: string;
      displayName?: string;
    }) => {
      const bundle =
        input.action === 'register'
          ? await registerAccount({
              email: input.email,
              password: input.password,
              display_name: input.displayName,
            })
          : await loginAccount({ email: input.email, password: input.password });
      const next = sessionFromBundle(input.mode, bundle);
      if (!next.displayName) {
        next.displayName = input.displayName?.trim() || fallbackDisplayName(input.mode);
      }
      const view: RoleView = input.mode === 'csc' ? 'csc' : 'citizen';
      const storedRole = preferredServerRole(bundle.user.roles) ?? previewRoleForSession(input.mode);
      setSession(next);
      setRoleViewState(view);
      setConsentRetentionState(consentFromUser(bundle.user));
      persistSession(next);
      window.localStorage.setItem(ROLE_VIEW_STORAGE_KEY, view);
      window.localStorage.setItem(PREVIEW_ROLE_STORAGE_KEY, storedRole);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [],
  );

  const signOut = useCallback(() => {
    const token = session?.accessToken;
    setSession(null);
    setConsentRetentionState(false);
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    if (token) void logoutAccount(token).catch(() => undefined);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [session]);

  const purgeAccount = useCallback(async () => {
    if (!session?.accessToken) return;
    await deleteAccount();
    setSession(null);
    setConsentRetentionState(false);
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [session]);

  const setConsentRetention = useCallback(
    async (value: boolean) => {
      if (!session?.accessToken) return;
      setConsentBusy(true);
      try {
        const user = await updateProfile(
          value
            ? {
                consent_retention: true,
                age: profile.age,
                income: profile.income,
                land_hectares: profile.landHectares,
                gender: profile.gender,
                category: profile.category,
                occupation: profile.occupation,
              }
            : { consent_retention: false },
        );
        setConsentRetentionState(consentFromUser(user));
      } finally {
        setConsentBusy(false);
      }
    },
    [profile, session?.accessToken],
  );

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

  const enqueueDossier = useCallback((schemeName: string, schemeId?: string) => {
    const localId = `dos-${Date.now()}`;
    const job: DossierJob = {
      id: localId,
      schemeName,
      status: 'queued',
      createdAt: new Date().toISOString(),
    };
    setDossierQueue((current) => [job, ...current].slice(0, 12));
    const token = session?.accessToken;
    if (!token || !schemeId) return;
    void createDossier(schemeId)
      .then((row) => {
        setDossierQueue((current) =>
          current.map((item) =>
            item.id === localId
              ? { ...item, id: row.id, status: row.status === 'ready' ? 'ready' : 'queued' }
              : item,
          ),
        );
      })
      .catch(() => undefined);
  }, [session?.accessToken]);

  const value = useMemo(
    () => ({
      roleView,
      setRoleView,
      session,
      signIn,
      signInAccount,
      signOut,
      purgeAccount,
      consentRetention,
      setConsentRetention,
      consentBusy,
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
      signInAccount,
      signOut,
      purgeAccount,
      consentRetention,
      setConsentRetention,
      consentBusy,
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
