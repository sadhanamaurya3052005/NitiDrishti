"""Officer gazette OCR preview. Does not persist bytes or rows. LLM does not vote."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, File, Request, UploadFile

from app.config import settings
from app.core.deps import require_roles, request_id_of
from app.core.exceptions import ValidationError
from app.schemas.envelope import ok
from app.services.ingestion.ocr import ocr_scanned_document

router = APIRouter(prefix="/api/v1/ocr", tags=["ocr"])

Officer = Annotated[object, Depends(require_roles("POLICY_ANALYST", "WELFARE_OFFICER", "ADMIN"))]


@router.post("/preview", summary="OCR a gazette PDF/image in memory; never stores the file")
async def preview_ocr(
    request: Request,
    user: Officer,
    file: UploadFile = File(...),
) -> dict:
    del user
    raw = await file.read()
    limit = settings.ingestion_max_file_mb * 1024 * 1024
    if len(raw) > limit:
        raise ValidationError("File exceeds ingestion size limit")
    result = ocr_scanned_document(raw, mime_type=file.content_type, filename=file.filename)
    return ok(result.as_api(), request_id_of(request))
