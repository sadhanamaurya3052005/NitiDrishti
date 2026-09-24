# Database schema

Native PostgreSQL. No Docker. Enums are `VARCHAR` plus `CHECK`, not native PG enums, so labels can grow without a migration rewrite.

UUIDs are primary keys. Updates that change meaning insert a **new version row**; old rows stay.

**PostGIS is not required.** District maps join bundled TopoJSON by name. **pgvector is not required.** Do not install either on native PostgreSQL 18 just to silence a warning.

`user_roles` uniqueness is the composite primary key `(user_id, role_id)`. There is no extra UNIQUE constraint on those columns.

## Production tables (26)

| Table | Purpose |
|---|---|
| `users` | Account. Email optional. Soft-delete via `deleted_at`. |
| `roles` | Six codes: CITIZEN, STUDENT, CSC_OPERATOR, WELFARE_OFFICER, POLICY_ANALYST, ADMIN. |
| `user_roles` | Many-to-many. Composite PK `(user_id, role_id)`. |
| `states` | 36 States/UTs with LGD + ISO codes. |
| `districts` | Official district names; unique per `(state_id, name)`. |
| `user_profiles` | Eligibility inputs only. No Aadhaar, bank, or OTP columns. |
| `departments` | Real ministries / departments. Reference seed, not scheme facts. |
| `sources` | Whitelisted official URLs and connector type. |
| `source_documents` | Retrieved artefact + content hash. |
| `ingestion_logs` | Per-run status. |
| `schemes` | Catalog head. `current_version_id` points at the live version. |
| `scheme_versions` | Immutable gazette snapshot. |
| `eligibility_rules` | Deterministic AST JSON + optional age/income bounds. `age_min <= age_max`. |
| `benefits` | Amounts as text plus optional paise. |
| `required_documents` | Document *types* a scheme asks for, never identity digits. |
| `jobs` | Gazette rows only. |
| `internships` | Gazette rows only. |
| `scholarships` | Gazette rows only. |
| `policies` | Nyay-Mitra policy head. |
| `policy_versions` | Immutable gazette snapshot. |
| `policy_clauses` | Clause text + page. |
| `policy_changes` | Diff between two versions. |
| `alerts` | Per-user notifications. Guest traffic never inserts. |
| `action_dossiers` | Generated pack metadata. |
| `audit_logs` | Insert-only. No `updated_at`. |
| `applications` | Authenticated citizen/CSC submit rows. Guests never insert. No identity digits. |

## Reserved

`document_embeddings` is reserved so a `VECTOR` column can be added after pgvector is installed. The production schema does **not** store embeddings yet. Empty until that writer exists — do not seed fake vectors.

## Empty operational tables (expected on this local DB)

These stay empty until a signed-in workflow writes them. Do not fabricate rows.

| Table | When a row appears |
|---|---|
| `applications` | `POST /api/v1/applications` (authenticated). Officer queue/stage updates follow. |
| `action_dossiers` | `POST /api/v1/dossiers` (authenticated pack queue). |
| `document_embeddings` | Future semantic-search writer after pgvector. No current pipeline inserts here. |

## Seed (reference only)

Roles, departments, 36 States/UTs, district names. No schemes, no beneficiary counts, no invented KPIs.

## Constraints worth knowing

- Profile: age 0–120, income ≥ 0, land ≥ 0; gender / category / occupation closed vocabularies.
- Eligibility: `age_min <= age_max`; `income_limit >= 0`.
- Scheme / job / internship / scholarship `status` ∈ draft, published, archived, needs_review.
