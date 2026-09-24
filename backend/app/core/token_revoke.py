"""In-process denylist for JWT ids already minted by create_token.

Durable session cut-off lives on existing audit_logs logout rows (no new table).
jti/sid entries cover the current process so the access+refresh pair die immediately,
including when both were issued in the same unix second as logout.
"""

from __future__ import annotations

from time import time

_revoked: dict[str, int] = {}
_SID_TTL_SECONDS = 8 * 86400


def _key(kind: str, value: str) -> str:
    return f"{kind}:{value}"


def _revoke(kind: str, value: str | None, until: int) -> None:
    if not value:
        return
    _revoked[_key(kind, value)] = until


def _is_revoked(kind: str, value: object | None) -> bool:
    if not value or not isinstance(value, str):
        return False
    until = _revoked.get(_key(kind, value))
    if until is None:
        return False
    if until < time():
        _revoked.pop(_key(kind, value), None)
        return False
    return True


def revoke_jti(jti: str | None, exp: object | None = None) -> None:
    if exp is not None:
        try:
            until = int(exp)
        except (TypeError, ValueError):
            until = int(time()) + _SID_TTL_SECONDS
    else:
        until = int(time()) + _SID_TTL_SECONDS
    _revoke("jti", jti, until)


def jti_is_revoked(jti: object | None) -> bool:
    return _is_revoked("jti", jti)


def revoke_sid(sid: str | None) -> None:
    """Revoke the access+refresh pair that share this session id.

    TTL follows the refresh window, not the 30-minute access exp.
    """
    _revoke("sid", sid, int(time()) + _SID_TTL_SECONDS)


def sid_is_revoked(sid: object | None) -> bool:
    return _is_revoked("sid", sid)
