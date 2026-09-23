"""NitiDrishti backend application package."""

from __future__ import annotations

import os

# PostgreSQL 18 on Windows often exports CURL_CA_BUNDLE to a file that
# does not exist. Drop only missing paths so uvicorn / alembic can boot
# from a normal VS Code terminal without a manual unset.
for _ca_key in ("CURL_CA_BUNDLE", "SSL_CERT_FILE", "REQUESTS_CA_BUNDLE"):
    _ca_path = os.environ.get(_ca_key)
    if _ca_path and not os.path.isfile(_ca_path):
        os.environ.pop(_ca_key, None)

__all__ = ["__version__"]

__version__ = "0.1.0"
