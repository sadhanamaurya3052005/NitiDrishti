"""dbt project smoke — prefer .venv-dbt (Python 3.10) when present.

dbt-core 1.8 + mashumaro is broken on Python 3.14; live runs use .venv-dbt.
"""

from __future__ import annotations

import os
import shutil
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
DBT_ROOT = REPO / "dbt"


def _dbt_bin() -> str | None:
    win = REPO / ".venv-dbt" / "Scripts" / "dbt.exe"
    nix = REPO / ".venv-dbt" / "bin" / "dbt"
    if win.is_file():
        return str(win)
    if nix.is_file():
        return str(nix)
    return shutil.which("dbt")


def test_dbt_project_files_exist() -> None:
    assert (DBT_ROOT / "dbt_project.yml").is_file()
    assert (DBT_ROOT / "models" / "marts" / "mart_published_schemes.sql").is_file()
    assert (DBT_ROOT / "models" / "schema.yml").is_file()


def test_dbt_parse_when_cli_installed() -> None:
    dbt = _dbt_bin()
    if dbt is None:
        return
    env = os.environ.copy()
    env.pop("CURL_CA_BUNDLE", None)
    env.pop("SSL_CERT_FILE", None)
    env.pop("REQUESTS_CA_BUNDLE", None)
    env.setdefault("POSTGRES_HOST", "localhost")
    env.setdefault("POSTGRES_USER", "nitidrishti")
    env.setdefault("POSTGRES_PASSWORD", "unused")
    env.setdefault("POSTGRES_DB", "nitidrishti_db")
    result = subprocess.run(
        [dbt, "parse", "--project-dir", str(DBT_ROOT), "--profiles-dir", str(DBT_ROOT), "--no-version-check"],
        capture_output=True,
        text=True,
        check=False,
        env=env,
    )
    if result.returncode != 0 and sys.version_info >= (3, 14) and "mashumaro" in (result.stderr or ""):
        # Documented host constraint: use .venv-dbt for live dbt.
        assert _dbt_bin() and ".venv-dbt" not in dbt
        return
    assert result.returncode == 0, result.stderr[-1500:]
