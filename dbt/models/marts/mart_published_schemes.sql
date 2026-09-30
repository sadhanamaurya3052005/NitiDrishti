{{ config(materialized='table') }}

select
  scheme_id,
  slug,
  status,
  version_id,
  version_number,
  source_url,
  source_document_id,
  content_hash,
  retrieved_at,
  storage_path,
  domain,
  health_status,
  case
    when status = 'published' and source_document_id is not null and content_hash is not null then true
    else false
  end as provenance_complete
from {{ ref('int_scheme_lineage') }}
where status = 'published'
