"""Application errors. Routes never leak raw stack traces to the client."""

from __future__ import annotations


class AppError(Exception):
    """Base error mapped to the standard JSON envelope."""

    code = "INTERNAL_ERROR"
    status_code = 500

    def __init__(self, message: str, *, code: str | None = None) -> None:
        super().__init__(message)
        self.message = message
        if code:
            self.code = code


class ValidationError(AppError):
    code = "VALIDATION_ERROR"
    status_code = 422


class AuthError(AppError):
    code = "AUTH_ERROR"
    status_code = 401


class ForbiddenError(AppError):
    code = "PERMISSION_ERROR"
    status_code = 403


class NotFoundError(AppError):
    code = "NOT_FOUND"
    status_code = 404


class BusinessRuleError(AppError):
    code = "BUSINESS_RULE"
    status_code = 409


class SourceUnavailableError(AppError):
    code = "SOURCE_UNAVAILABLE"
    status_code = 502


class AIFailureError(AppError):
    code = "AI_FAILURE"
    status_code = 503


class DBError(AppError):
    code = "DB_ERROR"
    status_code = 500


class RateLimitError(AppError):
    code = "RATE_LIMITED"
    status_code = 429
