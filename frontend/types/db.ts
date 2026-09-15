/** Production table shapes used by typed API clients. */

export type Uuid = string;

export type RoleCode =
  | 'CITIZEN'
  | 'STUDENT'
  | 'CSC_OPERATOR'
  | 'WELFARE_OFFICER'
  | 'POLICY_ANALYST'
  | 'ADMIN';

export type StateKind = 'STATE' | 'UT';

export type ConnectorType = 'html' | 'dynamic' | 'pdf' | 'tabular' | 'json';

export type IngestionStatus = 'running' | 'ok' | 'failed';

export type RecordStatus = 'draft' | 'published' | 'archived' | 'needs_review';

export type DbSchemeCategory =
  | 'agriculture'
  | 'welfare'
  | 'education'
  | 'msme'
  | 'women'
  | 'skills'
  | 'banking'
  | 'health'
  | 'housing'
  | 'sports'
  | 'science'
  | 'transport'
  | 'tourism'
  | 'jal'
  | 'legal'
  | 'artisans'
  | 'disaster'
  | 'gig'
  | 'other';

export type RuleKind = 'age' | 'income' | 'land' | 'gender' | 'category' | 'occupation' | 'always';

export type Gender = 'any' | 'female' | 'male';

export type CasteCategory = 'GEN' | 'OBC' | 'SC' | 'ST' | 'EWS';

export type Occupation = 'farmer' | 'student' | 'artisan' | 'shg' | 'other';

export type AlertType = 'NEW_SCHEME_MATCH' | 'DEADLINE_APPROACHING' | 'RULE_MODIFIED' | 'CSC_CAMP_DISPATCH';

export type DossierStatus = 'queued' | 'ready' | 'failed';

export type ChangeKind = 'added' | 'removed' | 'amended' | 'numeric';

export type AuditAction =
  | 'login'
  | 'logout'
  | 'role_change'
  | 'profile_update'
  | 'profile_purge'
  | 'ingestion_run'
  | 'review_approve';

export interface Timestamps {
  created_at: string;
  updated_at: string;
}

export interface RoleRow extends Timestamps {
  id: Uuid;
  code: RoleCode;
  name: string;
  name_hi: string;
}

export interface UserRow extends Timestamps {
  id: Uuid;
  email: string | null;
  display_name: string | null;
  is_active: boolean;
  deleted_at: string | null;
}

export interface UserRoleRow {
  user_id: Uuid;
  role_id: Uuid;
}

export interface StateRow extends Timestamps {
  id: Uuid;
  lgd_code: number;
  iso_code: string;
  name: string;
  name_hi: string;
  kind: StateKind;
}

export interface DistrictRow extends Timestamps {
  id: Uuid;
  state_id: Uuid;
  lgd_code: number | null;
  name: string;
  name_hi: string;
}

export interface UserProfileRow extends Timestamps {
  id: Uuid;
  user_id: Uuid;
  age: number | null;
  income: number | null;
  land_hectares: number | null;
  gender: Gender | null;
  category: CasteCategory | null;
  occupation: Occupation | null;
  state_id: Uuid | null;
  district_id: Uuid | null;
  consent_retention: boolean;
  consent_at: string | null;
  notes: string | null;
}

export interface DepartmentRow extends Timestamps {
  id: Uuid;
  code: string;
  name: string;
  name_hi: string;
  ministry: string | null;
  source_url: string | null;
}

export interface SourceRow extends Timestamps {
  id: Uuid;
  name: string;
  source_url: string;
  domain: string;
  connector_type: ConnectorType;
  is_active: boolean;
  last_checked_at: string | null;
  department_id: Uuid | null;
}

export interface SourceDocumentRow extends Timestamps {
  id: Uuid;
  source_id: Uuid;
  uri: string;
  content_hash: string;
  mime_type: string | null;
  byte_size: number | null;
  storage_path: string | null;
  retrieved_at: string;
}

export interface IngestionLogRow {
  id: Uuid;
  source_id: Uuid;
  started_at: string;
  finished_at: string | null;
  status: IngestionStatus;
  http_status: number | null;
  error_code: string | null;
  detail: string | null;
  rows_upserted: number;
  content_hash: string | null;
}

export interface SchemeRow extends Timestamps {
  id: Uuid;
  code: string | null;
  slug: string;
  category: DbSchemeCategory;
  status: RecordStatus;
  department_id: Uuid | null;
  state_id: Uuid | null;
  current_version_id: Uuid | null;
}

export interface SchemeVersionRow extends Timestamps {
  id: Uuid;
  scheme_id: Uuid;
  version_number: number;
  name: string;
  name_hi: string;
  summary: string;
  summary_hi: string;
  source_url: string;
  source_document_id: Uuid | null;
  retrieved_at: string;
  last_verified_at: string | null;
  effective_from: string | null;
  effective_to: string | null;
}

export interface EligibilityRuleRow extends Timestamps {
  id: Uuid;
  scheme_version_id: Uuid;
  rule_key: string;
  kind: RuleKind;
  label: string;
  detail: string;
  ast_json: Record<string, unknown>;
  age_min: number | null;
  age_max: number | null;
  income_limit: number | null;
  sort_order: number;
}

export interface BenefitRow extends Timestamps {
  id: Uuid;
  scheme_version_id: Uuid;
  label: string;
  label_hi: string;
  amount_paise: number | null;
  amount_text: string;
  periodicity: string | null;
}

export interface RequiredDocumentRow extends Timestamps {
  id: Uuid;
  scheme_version_id: Uuid;
  code: string;
  label: string;
  is_mandatory: boolean;
}

export interface OpportunityRow extends Timestamps {
  id: Uuid;
  title: string;
  title_hi: string;
  department_id: Uuid | null;
  state_id: Uuid | null;
  source_url: string;
  content_hash: string;
  deadline: string | null;
  status: RecordStatus;
  retrieved_at: string;
  summary: string;
}

export interface ScholarshipRow extends OpportunityRow {
  income_limit: number | null;
}

export interface PolicyRow extends Timestamps {
  id: Uuid;
  code: string;
  title: string;
  title_hi: string;
  issuing_body: string;
  current_version_id: Uuid | null;
}

export interface PolicyVersionRow extends Timestamps {
  id: Uuid;
  policy_id: Uuid;
  version_number: number;
  gazette_ref: string | null;
  source_url: string;
  source_document_id: Uuid | null;
  retrieved_at: string;
  effective_from: string | null;
  effective_to: string | null;
}

export interface PolicyClauseRow extends Timestamps {
  id: Uuid;
  policy_version_id: Uuid;
  clause_ref: string;
  text: string;
  page_no: number | null;
  sort_order: number;
}

export interface PolicyChangeRow extends Timestamps {
  id: Uuid;
  from_version_id: Uuid;
  to_version_id: Uuid;
  change_kind: ChangeKind;
  clause_ref: string | null;
  summary: string;
  numeric_old: number | null;
  numeric_new: number | null;
}

export interface AlertRow extends Timestamps {
  id: Uuid;
  user_id: Uuid;
  scheme_id: Uuid | null;
  alert_type: AlertType;
  payload: Record<string, unknown>;
  read_at: string | null;
}

export interface ActionDossierRow extends Timestamps {
  id: Uuid;
  user_id: Uuid;
  scheme_id: Uuid | null;
  status: DossierStatus;
  storage_path: string | null;
  scheme_name: string;
}

export interface AuditLogRow {
  id: Uuid;
  actor_user_id: Uuid | null;
  action: AuditAction;
  entity_type: string | null;
  entity_id: string | null;
  request_id: string | null;
  detail: string | null;
  created_at: string;
}

export const PRODUCTION_TABLES = [
  'users',
  'roles',
  'user_roles',
  'states',
  'districts',
  'user_profiles',
  'departments',
  'sources',
  'source_documents',
  'ingestion_logs',
  'schemes',
  'scheme_versions',
  'eligibility_rules',
  'benefits',
  'required_documents',
  'jobs',
  'internships',
  'scholarships',
  'policies',
  'policy_versions',
  'policy_clauses',
  'policy_changes',
  'alerts',
  'action_dossiers',
  'audit_logs',
] as const;

export type ProductionTable = (typeof PRODUCTION_TABLES)[number];
