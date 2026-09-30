{{ config(materialized='view') }}

select
  id::text as source_id,
  name,
  source_url,
  domain,
  connector_type,
  is_active,
  health_status,
  last_checked_at,
  consecutive_failures,
  total_successes,
  total_failures
from {{ source('nitidrishti_app', 'sources') }}
