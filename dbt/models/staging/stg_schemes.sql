{{ config(materialized='view') }}

select
  id::text as scheme_id,
  slug,
  code,
  category,
  status,
  current_version_id::text as current_version_id
from {{ source('nitidrishti_app', 'schemes') }}
