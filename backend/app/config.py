"""Central application configuration.

Every value comes from the environment (see .env.example). Nothing is hardcoded
here so the same process can run in development, testing, staging and production.
"""

from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import AliasChoices, Field, computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict

Environment = Literal["development", "testing", "staging", "production"]

MANAGED_HOST_MARKERS = ("neon.tech", "supabase.co", "render.com", "azure.com", "rds.amazonaws.com")


def normalise_database_url(url: str) -> str:
    """Accept a connection string exactly as a provider hands it over.

    Managed providers give plain `postgres://` or `postgresql://` URLs; SQLAlchemy
    needs the driver spelled out. Hosted databases also require TLS, so
    `sslmode` is added when the provider left it implicit.
    """
    normalised = url.strip()

    for prefix in ("postgresql+psycopg://", "postgresql+psycopg2://"):
        if normalised.startswith(prefix):
            break
    else:
        for prefix in ("postgresql://", "postgres://"):
            if normalised.startswith(prefix):
                normalised = "postgresql+psycopg://" + normalised[len(prefix) :]
                break

    needs_tls = any(marker in normalised for marker in MANAGED_HOST_MARKERS)
    if needs_tls and "sslmode=" not in normalised:
        separator = "&" if "?" in normalised else "?"
        normalised = f"{normalised}{separator}sslmode=require"

    return normalised


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
        populate_by_name=True,
    )

    # ── Application ──────────────────────────────────────────
    app_name: str = "NitiDrishti"
    app_env: Environment = "development"
    app_version: str = "0.1.0"
    debug: bool = True
    log_level: str = "INFO"
    api_prefix: str = "/api"

    # ── Server ───────────────────────────────────────────────
    backend_host: str = "0.0.0.0"
    backend_port: int = 8000
    cors_origins: str = (
        "http://localhost:3000,http://localhost:3001,"
        "http://127.0.0.1:3000,http://127.0.0.1:3001"
    )

    # ── Database ─────────────────────────────────────────────
    postgres_user: str = "nitidrishti"
    postgres_password: str = "change_me_locally"
    postgres_db: str = "nitidrishti_dev"
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    database_url_override: str | None = Field(default=None, alias="DATABASE_URL")

    # ── JWT ──────────────────────────────────────────────────
    jwt_secret_key: str = "generate_a_long_random_string_32b"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    # ── Ingestion ────────────────────────────────────────────
    ingestion_allowed_domains: str = (
        "myscheme.gov.in,vikaspedia.in,en.vikaspedia.in,dbtbharat.gov.in,"
        "scholarships.gov.in,ugc.gov.in,aicte-india.org,india.gov.in"
    )
    ingestion_user_agent: str = "NitiDrishtiBot/0.1"
    ingestion_request_timeout: int = 30
    ingestion_max_retries: int = 3
    ingestion_max_file_mb: int = 25
    ingestion_crawl_delay_seconds: float = 1.0
    ingest_scheduler_enabled: bool = Field(
        default=True,
        validation_alias=AliasChoices(
            "INGEST_SCHEDULER_ENABLED",
            "INGEST_SCHEDULE_ENABLED",
            "ingest_scheduler_enabled",
        ),
    )
    ingest_interval_hours: int = 24
    raw_storage_path: str = "./storage/raw"

    # Feature flags — OCR runs only when FEATURE_AI_EXTRACTION is true *and* Tesseract exists.
    feature_ai_extraction: bool = False
    feature_disaster_module: bool = False
    feature_what_if_api: bool = True
    tesseract_cmd: str = "tesseract"
    ocr_languages: str = "eng+hin"
    ocr_min_text_chars: int = 12
    ocr_max_pages: int = 4
    rate_limit_enabled: bool = True
    rate_limit_login_per_minute: int = 20
    rate_limit_eligibility_per_minute: int = 60
    rate_limit_search_per_minute: int = 60

    # Operator seed — placeholders in .env.example only. Register stays CITIZEN.
    bootstrap_officer_email: str = ""
    bootstrap_officer_password: str = ""
    bootstrap_admin_email: str = ""
    bootstrap_admin_password: str = ""
    bootstrap_csc_email: str = ""
    bootstrap_csc_password: str = ""

    @computed_field  # type: ignore[prop-decorator]
    @property
    def database_url(self) -> str:
        if self.database_url_override:
            return normalise_database_url(self.database_url_override)
        return (
            f"postgresql+psycopg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    @computed_field  # type: ignore[prop-decorator]
    @property
    def database_host_label(self) -> str:
        """Host shown in logs and health output — never the credentials."""
        url = self.database_url
        if "@" in url:
            return url.rsplit("@", 1)[1]
        return f"{self.postgres_host}:{self.postgres_port}"

    @computed_field  # type: ignore[prop-decorator]
    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @computed_field  # type: ignore[prop-decorator]
    @property
    def is_production(self) -> bool:
        return self.app_env == "production"

    @computed_field  # type: ignore[prop-decorator]
    @property
    def jwt_secret_is_placeholder(self) -> bool:
        secret = self.jwt_secret_key.strip().lower()
        return secret in {
            "",
            "generate_a_long_random_string",
            "generate_a_long_random_string_32b",
            "change_me",
            "changeme",
        }

    @computed_field  # type: ignore[prop-decorator]
    @property
    def ingestion_allowed_domain_list(self) -> list[str]:
        return [item.strip().lower() for item in self.ingestion_allowed_domains.split(",") if item.strip()]

    @computed_field  # type: ignore[prop-decorator]
    @property
    def rate_limit_active(self) -> bool:
        if self.app_env == "testing":
            return False
        return bool(self.rate_limit_enabled)


@lru_cache
def get_settings() -> Settings:
    """Cached settings accessor — import this, never instantiate Settings directly."""
    return Settings()


settings = get_settings()
