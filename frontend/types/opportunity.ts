/**
 * Docs3 opportunity entities (jobs, internships, scholarships).
 * Rows arrive only from official ingestion. No seed listings.
 */
export type OpportunityKind = 'scholarship' | 'job' | 'internship';

export interface OpportunityRecord {
  id: string;
  kind: OpportunityKind;
  title: string;
  department: string;
  source_id: string;
  source_document_id: string | null;
  application_start: string | null;
  application_end: string | null;
  qualification: string | null;
  status: 'draft' | 'active' | 'closed';
}
