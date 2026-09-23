"""In-process sliding-window limiter. Off under pytest / APP_ENV=testing."""

from __future__ import annotations

import os
import sys
import time
from collections import defaultdict, deque
from threading import Lock

from app.config import settings

_WINDOWS: dict[str, deque[float]] = defaultdict(deque)
_LOCK = Lock()

LOGIN_PATHS = {"/api/v1/auth/login", "/api/v1/auth/register"}
ELIGIBILITY_PATHS = {"/api/v1/eligibility", "/api/v1/compare", "/api/v1/what-if"}
SEARCH_PATHS = {"/api/v1/search/schemes", "/api/v1/assistant/ask"}


def limiter_enabled() -> bool:
    if os.environ.get("PYTEST_CURRENT_TEST"):
        return False
    if "pytest" in sys.modules:
        return False
    return bool(settings.rate_limit_active)


def limit_for_path(path: str) -> int | None:
    if path in LOGIN_PATHS:
        return max(1, settings.rate_limit_login_per_minute)
    if path in ELIGIBILITY_PATHS:
        return max(1, settings.rate_limit_eligibility_per_minute)
    if path in SEARCH_PATHS:
        return max(1, settings.rate_limit_search_per_minute)
    return None


def allow(key: str, *, max_per_minute: int, now: float | None = None) -> bool:
    stamp = now if now is not None else time.monotonic()
    cutoff = stamp - 60.0
    with _LOCK:
        bucket = _WINDOWS[key]
        while bucket and bucket[0] < cutoff:
            bucket.popleft()
        if len(bucket) >= max_per_minute:
            return False
        bucket.append(stamp)
        return True
