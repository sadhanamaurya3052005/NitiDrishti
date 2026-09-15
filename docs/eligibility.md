# Eligibility engine

Eligibility is **deterministic**. A language model may later extract candidate clauses; it never casts the pass/fail vote.

## Inputs

Rules live on `eligibility_rules` for the scheme’s current version:

- `ast_json` — boolean AST (`and` / `or` / `not`, `gte` / `lte` / `eq` / `in`, …)
- optional column bounds `age_min` / `age_max` / `income_limit` used when the AST is empty
- `kind` — `age`, `income`, `land`, `gender`, `category`, `occupation`, `always`

The profile is either:

- a **self-declared** body (`age`, `income`, `land_hectares`, `gender`, `category`, `occupation`), or
- the signed-in `user_profiles` row when no body profile is sent

No Aadhaar or bank digits are accepted or stored. Guests do not write profile rows.

## Verdicts

Each rule is `pass`, `fail`, or `unknown` (undeclared field, `kind=always`, or an official exclusion that is checked at application time). Overall:

- any `fail` → `INELIGIBLE`
- else any `unknown` → `PARTIAL_INFO`
- else `ELIGIBLE`

## APIs (envelope `{success,data,error,request_id}`)

| Method | Path | Notes |
|---|---|---|
| GET | `/api/v1/search/schemes?q=&category=` | Published title/summary search (`pg_trgm` / `unaccent` when enabled). Same scheme-card JSON as the catalog. `source` is `postgres` or `static_fallback`. Honest empty when Postgres has published rows but the query matches none. |
| POST | `/api/v1/eligibility` | Body: `{scheme_ids?, profile?}`. Server AST is the source of truth. |
| POST | `/api/v1/compare` | At least two scheme ids. Returns scheme cards, evaluations, required **document types**. |
| GET | `/api/v1/schemes/{id}/documents` | Document types only — never identity numbers. |
| POST | `/api/v1/dossiers` | JWT required. Inserts `action_dossiers` (`queued`). Guest = 0 rows. |
| GET | `/api/v1/dossiers` | JWT required. Own rows only. |

`GET /health` and `GET /api/version` stay flat.
