/** Static, non-secret application configuration for the browser bundle. */

import type { Role } from '@/types';

export const APP = {
  name: 'NitiDrishti',
  nameDevanagari: 'नीतिदृष्टि',
  tagline: 'Right Scheme. Right Opportunity. Right Rule. Right Time.',
  taglineDevanagari: 'सही योजना। सही अवसर। सही नियम। सही समय।',
  subtitle: 'Citizen Welfare & Opportunity Intelligence Engine',
  subtitleDevanagari: 'नागरिक कल्याण एवं अवसर इंटेलिजेंस इंजन',
  version: process.env.NEXT_PUBLIC_APP_VERSION ?? '0.1.0',
} as const;

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

export const LOCALES = ['en', 'hi'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale =
  (process.env.NEXT_PUBLIC_DEFAULT_LOCALE as Locale | undefined) ?? 'en';

export const LOCALE_STORAGE_KEY = 'nd.locale';
export const SPLASH_SESSION_KEY = 'nd.splash.seen';
export const THEME_STORAGE_KEY = 'nd.theme';
export const CONTRAST_STORAGE_KEY = 'nd.contrast';
export const FONT_STORAGE_KEY = 'nd.font';
export const ROLE_VIEW_STORAGE_KEY = 'nd.roleView';
export const SESSION_STORAGE_KEY = 'nd.session';
export const PREVIEW_ROLE_STORAGE_KEY = 'nd.previewRole';

export type ThemeMode = 'light' | 'dark';
export type ContrastMode = 'default' | 'high';
export type FontScale = 'sm' | 'md' | 'lg';
export type RoleView = 'citizen' | 'csc';
export type SessionMode = 'guest' | 'citizen' | 'csc' | 'officer';

export interface LocalSession {
  mode: SessionMode;
  displayName: string | null;
  startedAt: string;
  accessToken?: string;
  refreshToken?: string;
  userId?: string;
  roles?: Role[];
  emailMasked?: string | null;
}

export function sessionDeskPath(mode: SessionMode): '/citizen' | '/csc' | '/welfare' {
  if (mode === 'csc') return '/csc';
  if (mode === 'officer') return '/welfare';
  return '/citizen';
}

export function fallbackDisplayName(mode: SessionMode): string | null {
  if (mode === 'guest') return null;
  if (mode === 'csc') return 'CSC operator';
  if (mode === 'officer') return 'Welfare officer';
  return 'Citizen';
}

export function previewRoleForSession(mode: SessionMode): 'CITIZEN' | 'CSC_OPERATOR' | 'WELFARE_OFFICER' {
  if (mode === 'csc') return 'CSC_OPERATOR';
  if (mode === 'officer') return 'WELFARE_OFFICER';
  return 'CITIZEN';
}

const ROLE_PRECEDENCE: readonly Role[] = [
  'ADMIN',
  'WELFARE_OFFICER',
  'POLICY_ANALYST',
  'CSC_OPERATOR',
  'STUDENT',
  'CITIZEN',
];

export function preferredServerRole(roles: readonly Role[] | undefined): Role | null {
  if (!roles?.length) return null;
  for (const code of ROLE_PRECEDENCE) {
    if (roles.includes(code)) return code;
  }
  return roles[0] ?? null;
}

export function readStoredSession(): LocalSession | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as LocalSession;
  } catch {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
}
