"""Demo 2 — officer HITL queue. Guests cannot publish."""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request

BASE = "http://127.0.0.1:8000"


def _get(path: str, token: str | None = None) -> tuple[int, dict]:
    headers = {"Accept": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    request = urllib.request.Request(f"{BASE}{path}", headers=headers)
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            return response.status, json.loads(response.read().decode())
    except urllib.error.HTTPError as exc:
        return exc.code, json.loads(exc.read().decode())


def _login(email: str, password: str) -> str:
    payload = json.dumps({"email": email, "password": password}).encode()
    request = urllib.request.Request(
        f"{BASE}/api/v1/auth/login",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=20) as response:
        body = json.loads(response.read().decode())
    return body["data"]["access_token"]


def main() -> int:
    guest_status, guest_body = _get("/api/v1/review/schemes")
    print("guest review", guest_status, guest_body.get("error", {}).get("code"))
    email = os.environ.get("ND_OFFICER_EMAIL", "officer@nitidrishti.local")
    password = os.environ.get("ND_OFFICER_PASSWORD", "")
    if not password:
        print("Set ND_OFFICER_EMAIL / ND_OFFICER_PASSWORD to list the HITL queue as an officer.")
        return 0
    token = _login(email, password)
    status, body = _get("/api/v1/review/schemes", token)
    print("officer review", status)
    rows = body.get("data", {}).get("schemes", [])
    print("queued", len(rows))
    for row in rows[:5]:
        print(" ", row.get("id"), row.get("status"), row.get("reasons"))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except urllib.error.URLError as exc:
        print("API not running at http://127.0.0.1:8000 — start uvicorn first.", exc)
        sys.exit(2)
