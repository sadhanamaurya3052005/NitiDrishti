{{ config(materialized='view') }}

select
  id::text as version_id,
  scheme_id::text as scheme_id,
  version_number,
  name,
  source_url,
  source_document_id::text as source_document_id,
  retrieved_at,
  last_verified_at,
  effective_from,
  effective_to,
  governance
from {{ source('nitidrishti_app', 'scheme_versions') }}
