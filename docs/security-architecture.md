# Security notes

DPDP-oriented defaults. JWT is live for register, login, logout, `/me`, profile update, and account purge.

## Do not store

Full Aadhaar, bank account numbers, OTPs, raw passwords (Argon2id hash only), document images that contain identity digits. Long digit runs in display names and profile notes are scrubbed before persistence.

## Do not log

Passwords, tokens, secrets, full profiles, document bodies with personal data. Structured logging redacts those keys.

## Request identity

Every HTTP request gets `X-Request-ID`. Error envelopes echo it. Audit rows may store it. Bodies are not attached to the id.

## JWT

- Access token: HS256, `typ=access`, subject = user UUID, roles claim. Default lifetime 30 minutes.
- Refresh token: HS256, `typ=refresh`, subject only. Default lifetime 7 days. Stateless (no extra table), so ingestion migrations are not forked.
- Secret from `JWT_SECRET_KEY`. `.env.example` holds a placeholder only; production refuses to sign with that placeholder.
- Responses never include `password_hash`. Email is returned masked (`c***@example.com`).

## Roles

Six role codes in `roles`. New self-registered accounts receive **CITIZEN** only. CSC / officer / admin are assigned through `user_roles`, not self-serve. Seed local operators with `python -m scripts.bootstrap_operators` (emails/passwords from `BOOTSTRAP_*` env). Server enforcement lives in `app.core.deps.require_roles` / `require_workspace`, matching the matrix already frozen in `docs/api-contracts.md`. The UI role selector is a preview for guests; a JWT session prefers the server role.

## Guests

Unauthenticated traffic must not insert `users`, `user_profiles`, `alerts`, `action_dossiers`, or `audit_logs`. Failed login and missing-token 401s write nothing. Guest browsing stays on the device (`nd.session` without tokens).

## Account purge (DPDP)

`DELETE /api/v1/auth/account` hard-deletes the user and cascades personal rows (profile, alerts, dossiers, role links). Audit keeps `profile_purge` with `entity_id` only — no profile payload, no secrets. `audit_logs.actor_user_id` is SET NULL when the user row goes.

## Errors

Routes raise `AppError` subclasses. Auth feature routes use `{success, data, error, request_id}`. `GET /health` and `GET /api/version` stay flat. Stack traces stay in logs.
