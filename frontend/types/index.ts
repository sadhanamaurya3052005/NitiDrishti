/** Shared frontend types. Domain models arrive with their phases. */

export interface DatabaseStatus {
  connected: boolean;
  server: string | null;
  postgis_enabled: boolean;
  error: string | null;
}

export interface HealthResponse {
  status: 'ok' | 'degraded';
  app: string;
  environment: string;
  version: string;
  timestamp: string;
  database: DatabaseStatus;
}

/** Accent token assigned per content category (see tailwind.config.ts). */
export type Accent = 'primary' | 'violet' | 'mint' | 'peach' | 'sky' | 'amber' | 'saffron';

export type SchemeCategory =
  | 'agriculture'
  | 'women'
  | 'education'
  | 'health'
  | 'msme';

export type CasteCategory = 'GEN' | 'OBC' | 'SC' | 'ST' | 'EWS';

export type DocState = 'ok' | 'missing' | 'unknown';

export interface SchemeDocumentNeed {
  id: string;
  label: string;
}

export interface SchemeRule {
  id: string;
  label: string;
  /** Human explanation used in the XAI inspector. */
  detail: string;
  kind: 'age' | 'income' | 'land' | 'gender' | 'category' | 'occupation' | 'always';
  min?: number;
  max?: number;
  equals?: string | boolean;
  includes?: string[];
}

export interface SchemeRecord {
  id: string;
  code: string;
  name: string;
  nameHi: string;
  ministry: string;
  ministryHi: string;
  category: SchemeCategory;
  badge: string;
  badgeHi: string;
  summary: string;
  summaryHi: string;
  benefit: string;
  benefitHi: string;
  documents: SchemeDocumentNeed[];
  rules: SchemeRule[];
  sourceUrl: string;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  error: { code: string; message: string } | null;
  request_id: string;
}

/** The six roles defined in the architecture (wired in Phase 4). */
export type Role =
  | 'CITIZEN'
  | 'STUDENT'
  | 'CSC_OPERATOR'
  | 'WELFARE_OFFICER'
  | 'POLICY_ANALYST'
  | 'ADMIN';
