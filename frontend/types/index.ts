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
export type Accent = 'primary' | 'violet' | 'mint' | 'peach' | 'sky' | 'amber';

/** The six roles defined in the architecture (wired in Phase 4). */
export type Role =
  | 'CITIZEN'
  | 'STUDENT'
  | 'CSC_OPERATOR'
  | 'WELFARE_OFFICER'
  | 'POLICY_ANALYST'
  | 'ADMIN';
