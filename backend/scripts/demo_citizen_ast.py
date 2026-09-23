"""Demo 1 — citizen AST vote from the live API. LLM does not decide."""

from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request

BASE = "http://127.0.0.1:8000"


def _post(path: str, payload: dict) -> dict:
    request = urllib.request.Request(
        f"{BASE}{path}",
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json", "Accept": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=20) as response:
        return json.loads(response.read().decode())


def main() -> int:
    catalog = json.loads(urllib.request.urlopen(f"{BASE}/api/v1/schemes", timeout=20).read().decode())
    schemes = catalog["data"]["schemes"][:3]
    if not schemes:
        print("No published schemes. Ingest first.")
        return 1
    body = _post(
        "/api/v1/eligibility",
        {
            "scheme_ids": [item["id"] for item in schemes],
            "profile": {
                "age": 32,
                "income": 180000,
                "land_hectares": 1.0,
                "gender": "female",
                "category": "OBC",
                "occupation": "farmer",
            },
        },
    )
    print("request_id", body.get("request_id"))
    for item in body["data"]["evaluations"]:
        evaluation = item["evaluation"]
        print(f"{item['scheme']['id']}: {evaluation['status']}  rules={len(evaluation['rules'])}  asOf={evaluation.get('asOf')}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except urllib.error.URLError as exc:
        print("API not running at http://127.0.0.1:8000 — start uvicorn first.", exc)
        sys.exit(2)
