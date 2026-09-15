"""Structured logging setup.

Rule 7: passwords, tokens, secrets and full user profiles are never logged.
"""

from __future__ import annotations

import logging
import sys

import structlog

from app.config import settings

REDACTED_KEYS = {
    "password",
    "password_hash",
    "token",
    "access_token",
    "refresh_token",
    "authorization",
    "jwt_secret_key",
    "bootstrap_officer_password",
    "bootstrap_admin_password",
    "bootstrap_csc_password",
    "otp",
    "aadhaar",
    "bank_account",
    "secret",
    "email",
}


def _redact_sensitive(_logger: object, _name: str, event_dict: dict) -> dict:
    for key in list(event_dict):
        if key.lower() in REDACTED_KEYS:
            event_dict[key] = "[REDACTED]"
    return event_dict


def configure_logging() -> None:
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=getattr(logging, settings.log_level.upper(), logging.INFO),
    )

    renderer = (
        structlog.processors.JSONRenderer()
        if settings.is_production
        else structlog.dev.ConsoleRenderer(colors=True)
    )

    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            _redact_sensitive,
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            renderer,
        ],
        wrapper_class=structlog.make_filtering_bound_logger(
            getattr(logging, settings.log_level.upper(), logging.INFO)
        ),
        cache_logger_on_first_use=True,
    )


def get_logger(name: str | None = None) -> structlog.BoundLogger:
    return structlog.get_logger(name)
