"""Demo 3 — Nyay gazette as-of compare. Prints ingested versions, not invented text."""

from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request

BASE = "http://127.0.0.1:8000"


def main() -> int:
    listed = json.loads(urllib.request.urlopen(f"{BASE}/api/v1/policies", timeout=20).read().decode())
    policies = listed["data"]["policies"]
    if not policies:
        print("No ingested policies.")
        return 1
    policy = next((item for item in policies if (item.get("version_number") or 0) >= 2), policies[0])
    print(policy["title"], policy["id"], "v", policy.get("version_number"))
    url = f"{BASE}/api/v1/policies/{policy['id']}/compare?as_of=2022-06-01"
    compare = json.loads(urllib.request.urlopen(url, timeout=20).read().decode())
    data = compare["data"]
    print("asOf", data.get("asOf"))
    left = data.get("from_version") or {}
    right = data.get("to_version") or {}
    print("from", left.get("version_number"), left.get("gazette_ref"), left.get("effective_from"))
    print("to", right.get("version_number"), right.get("gazette_ref"), right.get("effective_from"))
    for change in data.get("changes", [])[:6]:
        print(change.get("change_kind"), change.get("clause_ref"), change.get("summary", "")[:120])
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except urllib.error.URLError as exc:
        print("API not running at http://127.0.0.1:8000 — start uvicorn first.", exc)
        sys.exit(2)
