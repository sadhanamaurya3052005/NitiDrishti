# NitiDrishti — Architecture

This file records decisions. Detailed contracts are frozen in Phase 1 under `docs/`.

## 1. System view

```
            OFFICIAL GOVERNMENT SOURCES
                        │
                 SOURCE REGISTRY
                        │
                MODULAR CONNECTORS
                        │
              AUTOMATIC INGESTION  (scheduled, background)
                        │
        ┌───────────────┴───────────────┐
   Raw documents                   Raw datasets
        └───────────────┬───────────────┘
                        │
              EXTRACTION / OCR
                        │
                   AI / NLP            → structured candidate output
                        │
              NORMALISATION
                        │
        VALIDATION → DEDUPLICATION → CHANGE DETECTION → VERSIONING
                        │
                    POSTGRESQL  (+ PostGIS)
                        │
        ┌───────────────┼───────────────┬───────────────┐
   Eligibility     Opportunity      Nyay-Mitra      Analytics
   rule engine       matching     policy intelligence
        └───────────────┴───────────────┴───────────────┘
                        │
                     FASTAPI
                        │
                     NEXT.JS
                        │
   ┌────────────────┬───────────────┬────────────────────┐
 Citizen /        CSC / Kiosk     Welfare officer /
 Student                          district analytics
                        │
     ACTION · ALERT · DOSSIER · INSIGHT → AUDIT + ANALYTICS
```

## 2. Layering

- **Backend:** `API → Service → Repository → Database`. Routes never query the database.
- **Ingestion:** writes only through validation → dedup → change detection → versioning.
- **AI:** produces *candidate* structured output. It passes schema validation, evidence checks and
  a confidence threshold before it can become authoritative. Low confidence → human review.
- **Frontend:** talks only to our FastAPI backend.

## 3. Synchronous vs asynchronous

| Synchronous (user waits) | Asynchronous (background worker) |
|---|---|
| Authentication, profile | Source crawling, document download |
| Search, filters | OCR and text extraction |
| Eligibility check, what-if | AI extraction and rule mining |
| Dashboard and analytics reads | Validation, dedup, change detection, versioning |
| Document checklist, dossier request | Alert generation, embeddings, analytics refresh |

## 4. Decisions taken in Phase 0

1. **Theme:** warm ivory canvas, navy typography, indigo/violet primary, one accent per category
   (mint, peach, sky, amber, rose). No dark dashboard, no pure-white page.
2. **Eligibility:** decided by a deterministic rule engine. AI never decides eligibility.
3. **Local AI:** local/self-hosted models only; Ollama is an optional provider, never a requirement.
4. **Restricted data:** an official government API is used only where the data cannot be obtained
   by any permitted ingestion method. Until then the UI says "self-declared".
5. **Daily freshness:** achieved with scheduled ingestion + change detection + versioning
   (APScheduler), not manual data entry.
6. **Motion:** one shared vocabulary in `frontend/lib/motion.ts`; the emblem uses a Framer shared
   layout id so it travels between the boot screen and the header instead of cutting.

## 5. Roles

| Role | Scope |
|---|---|
| `CITIZEN` / `STUDENT` | Own profile, discovery, eligibility, alerts, dossier |
| `CSC_OPERATOR` | Assisted citizen sessions, print output |
| `WELFARE_OFFICER` | District/state delivery analytics |
| `POLICY_ANALYST` | Nyay-Mitra, policy versions, diff, review queue |
| `ADMIN` | Users, roles, source registry, ingestion monitoring |

Authorisation is enforced on the server. Frontend guards are user experience only.
