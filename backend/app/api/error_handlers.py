"""Map application errors to the frozen JSON envelope."""

from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError

from app.core.exceptions import AppError, DBError
from app.core.logging import get_logger
from app.schemas.envelope import fail

log = get_logger("nitidrishti.errors")


def _request_id(request: Request) -> str:
    return getattr(request.state, "request_id", None) or request.headers.get("x-request-id") or "unknown"


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(status_code=exc.status_code, content=fail(exc.code, exc.message, _request_id(request)))

    @app.exception_handler(RequestValidationError)
    async def validation_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
        parts: list[str] = []
        for err in exc.errors():
            loc = ".".join(str(item) for item in err.get("loc", ()) if item != "body")
            msg = str(err.get("msg", "invalid"))
            parts.append(f"{loc}: {msg}" if loc else msg)
        message = "; ".join(parts) or "Request failed validation"
        return JSONResponse(
            status_code=422,
            content=fail("VALIDATION_ERROR", message, _request_id(request)),
        )

    @app.exception_handler(SQLAlchemyError)
    async def db_error_handler(request: Request, exc: SQLAlchemyError) -> JSONResponse:
        log.error("database_error", error_type=type(exc).__name__)
        wrapped = DBError("Database request failed")
        return JSONResponse(
            status_code=wrapped.status_code,
            content=fail(wrapped.code, wrapped.message, _request_id(request)),
        )

    @app.exception_handler(Exception)
    async def unhandled_handler(request: Request, exc: Exception) -> JSONResponse:
        log.error("unhandled_error", error_type=type(exc).__name__)
        return JSONResponse(
            status_code=500,
            content=fail("INTERNAL_ERROR", "An unexpected error occurred", _request_id(request)),
        )
