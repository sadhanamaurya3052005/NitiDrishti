"""Unset a broken Postgres CA path before any network/DB test import."""

from __future__ import annotations

import os

os.environ.pop("CURL_CA_BUNDLE", None)
