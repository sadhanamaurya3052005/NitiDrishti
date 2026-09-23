# API envelope

Feature routes use this shape. System probes (`GET /health`, `GET /api/version`) stay
flat so operators can scrape them without unwrapping.

```json
{
  "success": true,
  "data": {},
  "error": null,
  "request_id": "uuid"
}
```

On failure:

```json
{
  "success": false,
  "data": null,
  "error": { "code": "NOT_FOUND", "message": "…" },
  "request_id": "uuid"
}
```

## Error codes

| code | HTTP |
|---|---|
| VALIDATION_ERROR | 422 |
| AUTH_ERROR | 401 |
| PERMISSION_ERROR | 403 |
| NOT_FOUND | 404 |
| BUSINESS_RULE | 409 |
| SOURCE_UNAVAILABLE | 502 |
| AI_FAILURE | 503 |
| DB_ERROR | 500 |
| INTERNAL_ERROR | 500 |

## Sync vs async

Synchronous: auth, profile, search, eligibility, dashboard/analytics reads.
Asynchronous: crawl, OCR, extraction, dedup, versioning, alerts, embeddings.

## Role × workspace (server-enforced)

| Role | citizen | csc | nyay-mitra | welfare | analytics |
|---|---|---|---|---|---|
| CITIZEN / STUDENT | yes | | | | |
| CSC_OPERATOR | yes | yes | | | |
| WELFARE_OFFICER | | | yes | yes | yes |
| POLICY_ANALYST | | | yes | | yes |
| ADMIN | yes | yes | yes | yes | yes |

## Disaster DSS (`FEATURE_DISASTER_MODULE`)

`GET /api/v1/disaster/summary` is a catalog read. Guests may call it. When the flag is off the
envelope is successful with `enabled: false`, `published_count: 0`, empty `schemes` — no flood or
beneficiary figures. When on, rows are published `category=disaster` schemes from Postgres plus
bundled district names (TopoJSON/LGD join). `ndma_live` and `postgis` stay false.

`POST /api/v1/disaster/focus` is officer / analyst / admin only (guest 401). Body is
`{ "state_iso", "district_name" }` from the bundled list. It does not write PII.
