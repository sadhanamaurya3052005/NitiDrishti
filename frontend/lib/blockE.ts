/**
 * Opportunity, policy, alert, and analytics API helpers.
 * Frontend talks only to our FastAPI (Rule 6).
 */
import { apiFetch, ApiError } from '@/lib/api';
import type { ApiEnvelope } from '@/types';
import type { AlertType } from '@/types/db';

export type OpportunityKind = 'job' | 'internship' | 'scholarship';

export interface OpportunityItem {
  id: string;
  kind: OpportunityKind;
  title: string;
  title_hi: string;
  summary: string;
  source_url: string;
  retrieved_at: string;
  deadline: string | null;
  status: 'published';
  department_id: string | null;
  state_id: string | null;
  income_limit?: number | null;
}

export interface OpportunityList {
  items: OpportunityItem[];
  jobs: OpportunityItem[];
  internships: OpportunityItem[];
  scholarships: OpportunityItem[];
  counts: { jobs: number; internships: number; scholarships: number };
}

export interface PolicySummary {
  id: string;
  code: string;
  title: string;
  title_hi: string;
  issuing_body: string;
  current_version_id: string | null;
  source_url: string | null;
  retrieved_at: string | null;
  gazette_ref: string | null;
  version_number: number | null;
}

export interface PolicyVersionSummary {
  id: string;
  version_number: number;
  gazette_ref: string | null;
  source_url: string;
  retrieved_at: string;
  effective_from?: string | null;
  effective_to?: string | null;
  is_current: boolean;
}

export interface PolicyClauseItem {
  id: string;
  clause_ref: string;
  text: string;
  page_no: number | null;
  sort_order: number;
}

export interface PolicyChangeItem {
  id: string | null;
  change_kind: string;
  clause_ref: string | null;
  summary: string;
  numeric_old: number | null;
  numeric_new: number | null;
}

export interface PolicyCompare {
  policy_id: string;
  from_version: PolicyVersionSummary | null;
  to_version: PolicyVersionSummary;
  changes: PolicyChangeItem[];
  note?: string;
  asOf?: string | null;
}

export interface AlertItem {
  id: string;
  scheme_id: string | null;
  alert_type: AlertType;
  payload: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

export interface AnalyticsSummary {
  published_schemes: number;
  scheme_versions: number;
  jobs: number;
  internships: number;
  scholarships: number;
  policies: number;
  policy_versions: number;
  ingestion: {
    ok: number;
    failed: number;
    running: number;
    recent: {
      source_name: string;
      source_url: string;
      status: string;
      rows_upserted: number;
      started_at: string;
      finished_at: string | null;
      error_code: string | null;
    }[];
  };
  postgis_enabled: boolean;
  pgvector_enabled: boolean;
  application_rows: boolean;
  map: { available: boolean; reason: string | null };
  funnel: { stage: string; count: number | null }[];
  workspace?: string;
  kiosk_queue?: string;
  note?: string;
}

export interface AssistantAnswer {
  mode: 'keyword';
  semantic_available: boolean;
  decides_eligibility: boolean;
  text: string;
  citations: { title: string; source_url: string; kind: string }[];
  note: string;
}

async function envelope<T>(path: string, options?: RequestInit & { skipAuth?: boolean }): Promise<T> {
  const payload = await apiFetch<ApiEnvelope<T>>(path, options);
  if (!payload.success || payload.data == null) {
    throw new ApiError(payload.error?.message ?? 'Request failed', 400, payload.error?.code);
  }
  return payload.data;
}

export function getOpportunities(kind?: OpportunityKind): Promise<OpportunityList> {
  const suffix = kind ? `?kind=${kind}` : '';
  return envelope<OpportunityList>(`/api/v1/opportunities${suffix}`, { cache: 'no-store', skipAuth: true });
}

export function getPolicies(): Promise<{ policies: PolicySummary[] }> {
  return envelope<{ policies: PolicySummary[] }>('/api/v1/policies', { cache: 'no-store', skipAuth: true });
}

export function getPolicy(id: string): Promise<{ policy: PolicySummary & { versions: PolicyVersionSummary[]; clauses: PolicyClauseItem[] } }> {
  return envelope(`/api/v1/policies/${id}`, { cache: 'no-store', skipAuth: true });
}

export function comparePolicy(id: string, asOf?: string | null): Promise<PolicyCompare> {
  const search = asOf ? `?as_of=${encodeURIComponent(asOf)}` : '';
  return envelope<PolicyCompare>(`/api/v1/policies/${id}/compare${search}`, { cache: 'no-store', skipAuth: true });
}

export function getPolicyVersionClauses(
  policyId: string,
  versionId: string,
): Promise<{ clauses: PolicyClauseItem[] }> {
  return envelope(`/api/v1/policies/${policyId}/versions/${versionId}/clauses`, {
    cache: 'no-store',
    skipAuth: true,
  });
}

export function getAlerts(): Promise<{ alerts: AlertItem[] }> {
  return envelope<{ alerts: AlertItem[] }>('/api/v1/alerts');
}

export function createAlert(input: { alert_type: AlertType; scheme_id?: string }): Promise<{ alert: AlertItem }> {
  return envelope<{ alert: AlertItem }>('/api/v1/alerts', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function markAlertRead(id: string): Promise<{ alert: AlertItem }> {
  return envelope<{ alert: AlertItem }>(`/api/v1/alerts/${id}/read`, { method: 'POST' });
}

export function scanPublishedAlerts(): Promise<{ created: number; skipped: number; alerts: AlertItem[] }> {
  return envelope('/api/v1/alerts/scan-published', { method: 'POST' });
}

export function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  return envelope<AnalyticsSummary>('/api/v1/analytics/summary', { cache: 'no-store', skipAuth: true });
}

export function getCscSummary(): Promise<AnalyticsSummary> {
  return envelope<AnalyticsSummary>('/api/v1/csc/summary', { cache: 'no-store', skipAuth: true });
}

export function getWelfareSummary(): Promise<AnalyticsSummary> {
  return envelope<AnalyticsSummary>('/api/v1/welfare/summary', { cache: 'no-store', skipAuth: true });
}

export type DistrictMetric =
  | 'coverage_saturation'
  | 'application_dropoff'
  | 'cohort_gap'
  | 'disbursement_velocity';

export interface DistrictMetricMeta {
  available: boolean;
  reason: string;
}

export interface DistrictStateOption {
  id: string;
  name: string;
  name_hi: string;
  iso_code: string;
  kind: string;
  lgd_code: number;
}

export interface DistrictMetricRow {
  id: string;
  name: string;
  name_hi: string;
  lgd_code: number | null;
  state_id: string;
  state_name: string;
  state_name_hi: string;
  state_iso: string;
  saturation_pct: number | null;
  published_schemes: number;
  catalog_schemes?: number;
  national_schemes: number;
  jobs: number;
  internships: number;
  scholarships: number;
  consented_profiles: number;
  alerts: number;
  dossier_queued: number;
  dossier_ready: number;
  application_dropoff_pct: number | null;
  disbursement_velocity_pct: number | null;
  cohort_gap_pct: number | null;
  bottleneck: string;
}

export interface DistrictAnalytics {
  metric: DistrictMetric;
  metric_available: boolean;
  metric_reason: string;
  metrics: Record<DistrictMetric, DistrictMetricMeta>;
  states: DistrictStateOption[];
  districts: DistrictMetricRow[];
  national_schemes: number;
  application_rows: boolean;
  geometry: string;
}

export interface DistrictHeatmap {
  age_bins: string[];
  income_bins: string[];
  cells: number[][];
  sample_size: number;
  consented_profiles: number;
  sparse: boolean;
  note: string;
}

export interface DistrictDetail extends DistrictMetricRow {
  target_population: number | null;
  enrolled: number | null;
  population_note: string;
  application_funnel: { stage: string; count: number | null }[];
  application_funnel_note: string;
  dossier_stages: { stage: string; count: number }[];
  dossier_note: string;
  heatmap: DistrictHeatmap;
}

export interface CscCampDispatch {
  district_id: string;
  district_name: string;
  state_name: string;
  created: number;
  skipped: number;
  operator_count: number;
  sms_gateway: false;
  note: string;
}

export function getDistrictAnalytics(params?: {
  stateId?: string;
  metric?: DistrictMetric;
}): Promise<DistrictAnalytics> {
  const query = new URLSearchParams();
  if (params?.stateId) query.set('state_id', params.stateId);
  if (params?.metric) query.set('metric', params.metric);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return envelope<DistrictAnalytics>(`/api/v1/analytics/districts${suffix}`, {
    cache: 'no-store',
    skipAuth: true,
  });
}

export function getDistrictDetail(districtId: string): Promise<DistrictDetail> {
  return envelope<DistrictDetail>(`/api/v1/analytics/districts/${districtId}`, {
    cache: 'no-store',
    skipAuth: true,
  });
}

export function dispatchCscCamp(districtId: string): Promise<CscCampDispatch> {
  return envelope<CscCampDispatch>(`/api/v1/analytics/districts/${districtId}/csc-camp`, {
    method: 'POST',
  });
}

export interface ApplicationRecord {
  id: string;
  scheme_id: string | null;
  scheme_name: string;
  district_id: string | null;
  stage: string;
  official_apply_url: string | null;
  created_at: string;
}

export function createApplication(input: {
  scheme_id: string;
  district_id?: string;
  stage?: 'Discovered' | 'Submitted';
}): Promise<ApplicationRecord> {
  return envelope<ApplicationRecord>('/api/v1/applications', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function listApplications(): Promise<{ applications: ApplicationRecord[] }> {
  return envelope<{ applications: ApplicationRecord[] }>('/api/v1/applications');
}

export function listApplicationQueue(): Promise<{ applications: ApplicationRecord[] }> {
  return envelope<{ applications: ApplicationRecord[] }>('/api/v1/applications/queue');
}

export function recordApplicationStage(
  applicationId: string,
  stage: 'Submitted' | 'Tehsil Verified' | 'Sanctioned' | 'DBT Disbursed',
): Promise<ApplicationRecord> {
  return envelope<ApplicationRecord>(`/api/v1/applications/${encodeURIComponent(applicationId)}/stage`, {
    method: 'PATCH',
    body: JSON.stringify({ stage }),
  });
}

export function askAssistant(query: string): Promise<AssistantAnswer> {
  return envelope<AssistantAnswer>('/api/v1/assistant/ask', {
    method: 'POST',
    body: JSON.stringify({ query }),
    skipAuth: true,
  });
}
