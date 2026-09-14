/** Static, non-secret application configuration for the browser bundle. */

export const APP = {
  name: 'NitiDrishti',
  nameDevanagari: 'नीतिदृष्टि',
  tagline: 'Right Scheme. Right Opportunity. Right Rule. Right Time.',
  taglineDevanagari: 'सही योजना। सही अवसर। सही नियम। सही समय।',
  subtitle: 'Citizen Welfare & Opportunity Intelligence Engine',
  subtitleDevanagari: 'नागरिक कल्याण एवं अवसर इंटेलिजेंस इंजन',
  version: process.env.NEXT_PUBLIC_APP_VERSION ?? '0.1.0',
  buildPhase: 'Phase 0 — Foundation',
  institute: 'Buddha Institute of Technology, GIDA, Gorakhpur',
  session: 'Session 2026–27',
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

export type ThemeMode = 'light' | 'dark';
export type ContrastMode = 'default' | 'high';
export type FontScale = 'sm' | 'md' | 'lg';
export type RoleView = 'citizen' | 'csc';
export type SessionMode = 'guest' | 'citizen' | 'csc';

export interface LocalSession {
  mode: SessionMode;
  displayName: string | null;
  startedAt: string;
}
