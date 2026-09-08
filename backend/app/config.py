"""Central application configuration.

Every value comes from the environment (see .env.example). Nothing is hardcoded
here so the same image can run in development, testing, staging and production.
"""

from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import Field, computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict

Environment = Literal["development", "testing", "staging", "production"]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
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
    cors_origins: str = "http://localhost:3000"

    # ── Database ─────────────────────────────────────────────
    postgres_user: str = "nitidrishti"
    postgres_password: str = "change_me_locally"
    postgres_db: str = "nitidrishti_dev"
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    database_url_override: str | None = Field(default=None, alias="DATABASE_URL")

    @computed_field  # type: ignore[prop-decorator]
    @property
    def database_url(self) -> str:
        if self.database_url_override:
            return self.database_url_override
        return (
            f"postgresql+psycopg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    @computed_field  # type: ignore[prop-decorator]
    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @computed_field  # type: ignore[prop-decorator]
    @property
    def is_production(self) -> bool:
        return self.app_env == "production"


@lru_cache
def get_settings() -> Settings:
    """Cached settings accessor — import this, never instantiate Settings directly."""
    return Settings()


settings = get_settings()
