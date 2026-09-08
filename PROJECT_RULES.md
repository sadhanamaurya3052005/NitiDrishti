# NitiDrishti — Project Rules

These rules are binding for every phase. If a change violates a rule, the change is wrong — not the rule.

---

## RULE 1 — Data Sourcing (highest priority)

1. **No third-party or paid data API** is used to obtain government information. Not for schemes, not for scholarships, not for jobs, not for internships, not for policies.
2. All information is obtained by **our own ingestion pipeline** from **official government sources**:
   - static HTML pages
   - JavaScript-rendered pages (headless browser)
   - official PDFs (text-based)
   - scanned PDFs (OCR)
   - CSV / Excel / XML / JSON files published by departments
3. An **official government API is allowed only when both conditions are true**:
   - the data is restricted / not publicly retrievable, **and**
   - it cannot be obtained by any permitted ingestion method without that authorized API.
   Examples of that narrow category: DigiLocker document verification, UIDAI-based identity verification, authenticated departmental application status.
4. Until such authorized access exists, the feature must degrade honestly in the UI:
   - `Self-declared` instead of `Verified via DigiLocker`
   - never imply verification that did not happen.
5. We never bypass security controls: no CAPTCHA solving, no login bypass, no scraping of restricted areas, no ignoring `robots.txt` disallow rules. Only whitelisted official domains.

## RULE 2 — No dummy data in the product

1. No hardcoded scheme lists, no fake counts, no invented impact numbers ("12 lakh beneficiaries") anywhere in UI or docs.
2. Every number shown to a user must be computed from the database or from the user's own input.
3. Structural facts (e.g. "5 workspaces", "6 roles") are allowed because they describe the system, not the data.
4. Seed data is allowed only for reference tables: states, districts, roles, departments.

## RULE 3 — AI never decides eligibility

1. AI/NLP is used to **extract** rules from documents and to **search / explain**. Nothing else.
2. The final eligibility decision is always produced by the **deterministic rule engine**.
3. AI output must pass: JSON schema validation → evidence presence check → confidence threshold.
4. Low-confidence extraction becomes `needs_review`. It is **never** authoritative until a human approves it.
5. AI must never silently overwrite authoritative data.
6. If AI is unavailable, deterministic features must keep working.

## RULE 4 — Every fact carries provenance

Every scheme, opportunity, rule and policy clause stores:
- official source URL
- source document + page/section where applicable
- `retrieved_at` / `last_verified`
- version number

The UI must surface source + last-verified for anything a citizen could act on.

## RULE 5 — Never overwrite history

Updates create a **new version row**. Old versions stay immutable so policy comparison remains possible.

## RULE 6 — Architecture layering

- Backend: `API → Service → Repository → Database`. An API route never touches the DB directly.
- Ingestion writes only through validation → dedup → change detection → versioning.
- Frontend talks only to our FastAPI backend, never to a government source directly.

## RULE 7 — Privacy

1. We do **not** store: full Aadhaar numbers, bank account numbers, OTPs, raw credentials.
2. Identifiers, if ever displayed, are masked (`XXXX-XXXX-1234`).
3. Never logged: passwords, tokens, secrets, full user profiles, document contents containing personal data.
4. Account deletion cascades and hard-deletes personal records.

## RULE 8 — Frontend quality bar

1. Theme: warm ivory canvas, navy typography, controlled indigo/violet primary with mint / peach / sky category accents. No pure white page, no dark dashboard, no rainbow cards.
2. Every route has: loading (skeleton), empty, and error state.
3. Motion is purposeful: page transitions, staggered reveals, hover micro-interactions, animated counters, shared-element logo transition. No decorative jitter.
4. `prefers-reduced-motion` is always respected.
5. Zero layout shift; responsive down to 360px; keyboard navigable; AA contrast.

## RULE 9 — Sync vs async

Synchronous (user waits): auth, profile, search, eligibility check, dashboard reads, analytics reads.
Asynchronous (background worker): source crawling, document download, OCR, AI extraction, validation, dedup, change detection, versioning, alert generation, embeddings, analytics refresh.

## RULE 10 — Definition of Done

A phase is complete only when its checklist in `TASKS.md` is fully ticked, tests pass, and no rule above is violated.
