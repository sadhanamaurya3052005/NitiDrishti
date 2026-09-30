{{ config(materialized='view') }}

select
  id::text as document_id,
  source_id::text as source_id,
  uri,
  content_hash,
  mime_type,
  byte_size,
  storage_path,
  retrieved_at
from {{ source('nitidrishti_app', 'source_documents') }}
