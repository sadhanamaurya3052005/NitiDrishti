"""Standard API envelope."""

from __future__ import annotations

from typing import Generic, TypeVar
from uuid import uuid4

from pydantic import BaseModel, Field

T = TypeVar("T")


class ErrorBody(BaseModel):
    code: str
    message: str


class ApiEnvelope(BaseModel, Generic[T]):
    success: bool
    data: T | None = None
    error: ErrorBody | None = None
    request_id: str = Field(default_factory=lambda: str(uuid4()))


def ok(data: T, request_id: str) -> dict:
    return ApiEnvelope[T](success=True, data=data, error=None, request_id=request_id).model_dump()


def fail(code: str, message: str, request_id: str) -> dict:
    return ApiEnvelope[None](
        success=False,
        data=None,
        error=ErrorBody(code=code, message=message),
        request_id=request_id,
    ).model_dump()
