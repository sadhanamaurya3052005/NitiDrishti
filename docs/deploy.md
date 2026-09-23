# Deploy notes (academic 2026–27, SIH260092)

NitiDrishti is a college / SIH project, not a live sarkari portal. There is no production
URL to publish here. Native PostgreSQL is required; **PostGIS is not required**. Docker is
not part of the local or suggested remote story.

## Frontend (Vercel or similar)

1. Root directory: `frontend`.
2. Build: `npm ci && npm run build`. Start: `npm run start` (or the host's Next.js preset).
3. Set `NEXT_PUBLIC_API_BASE_URL` to the public FastAPI origin (https).
4. Set `NEXT_PUBLIC_FEATURE_OFFLINE_CATALOG=true` only if you want the catalog snapshot
   service worker. `false` keeps the worker unregistered.
5. Do not claim the static host caches identity or eligibility.

## Backend (VM + uvicorn)

1. Native Python 3.11+ and native PostgreSQL 16/18 on the VM (or a managed Postgres URL).
2. Copy `.env.example` → `.env`. Replace `JWT_SECRET_KEY` and `POSTGRES_PASSWORD`.
3. `cd backend` → venv → `pip install -r requirements.txt` → `python -m scripts.init_extensions`
   → `alembic upgrade head` → `python -m scripts.seed_reference` →
   `python -m scripts.bootstrap_operators`.
4. Run: `uvicorn app.main:app --host 0.0.0.0 --port 8000` (put nginx/caddy in front for TLS).
5. CORS must list the real frontend origin. `FEATURE_DISASTER_MODULE` stays off unless you
   want the catalog DSS strip.

## Backup drill

On Windows with PostgreSQL 18 client tools:

```powershell
cd D:\NitiDrishti
if ($env:CURL_CA_BUNDLE) { Remove-Item Env:CURL_CA_BUNDLE }
powershell -File scripts\backup-drill.ps1 -DryRun
powershell -File scripts\backup-drill.ps1 -RestoreDb nitidrishti_verify
```

The script never prints passwords. It fail-closes if `pg_dump` is missing. Restore-verify
prints `alembic_current` and table counts (`users`, `schemes`, `scheme_versions`) — not KPIs.
