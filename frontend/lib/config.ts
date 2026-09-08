/** Static, non-secret application configuration for the browser bundle. */

export const APP = {
  name: 'NitiDrishti',
  nameDevanagari: 'नीतिदृष्टि',
  tagline: 'Right Scheme. Right Opportunity. Right Rule. Right Time.',
  taglineDevanagari: 'सही योजना। सही अवसर। सही नियम। सही समय।',
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
