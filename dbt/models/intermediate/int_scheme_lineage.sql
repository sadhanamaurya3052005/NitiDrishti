{{ config(materialized='view') }}

select
  s.scheme_id,
  s.slug,
  s.status,
  v.version_id,
  v.version_number,
  v.source_url,
  v.source_document_id,
  d.content_hash,
  v.retrieved_at,
  d.storage_path,
  src.domain,
  src.health_status
from {{ ref('stg_schemes') }} s
left join {{ ref('stg_scheme_versions') }} v
  on v.version_id = s.current_version_id
left join {{ ref('stg_documents') }} d
  on d.document_id = v.source_document_id
left join {{ ref('stg_sources') }} src
  on src.source_id = d.source_id
