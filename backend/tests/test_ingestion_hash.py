"""Content hashing is stable and used as the document identity."""

from __future__ import annotations

from app.services.ingestion.hashing import canonical_json_hash, sha256_bytes, sha256_text


def test_sha256_bytes_is_stable() -> None:
    payload = b"official gazette bytes"
    assert sha256_bytes(payload) == sha256_bytes(payload)
    assert len(sha256_bytes(payload)) == 64
    assert sha256_bytes(payload) != sha256_bytes(b"official gazette bytes ")


def test_canonical_json_hash_ignores_key_order() -> None:
    left = canonical_json_hash({"name": "PM-KISAN", "amount": 6000})
    right = canonical_json_hash({"amount": 6000, "name": "PM-KISAN"})
    assert left == right
    assert left != canonical_json_hash({"name": "PM-KISAN", "amount": 6001})


def test_sha256_text_matches_utf8_bytes() -> None:
    assert sha256_text("kisan") == sha256_bytes(b"kisan")
