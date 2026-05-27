import shutil
import logging
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from routers.auth import require_admin
from services import supabase_service
from tools import rag_tool

router = APIRouter(prefix="/api/documents", tags=["documents"])
logger = logging.getLogger("gerente_ia.documents")

ALLOWED_EXTENSIONS = {"pdf", "doc", "docx", "xlsx", "xls", "csv", "txt", "md"}
MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB


def _require_kb(conn_id: str) -> dict:
    conn = supabase_service.get_connection_by_id(conn_id)
    if not conn or conn["type"] != "knowledge_base":
        raise HTTPException(status_code=404, detail="Base de conocimiento no encontrada")
    return conn


@router.get("/{conn_id}")
def list_documents(conn_id: str, admin: dict = Depends(require_admin)):
    _require_kb(conn_id)
    return rag_tool.list_documents(conn_id)


@router.post("/{conn_id}/upload")
def upload_document(
    conn_id: str,
    file: UploadFile = File(...),
    admin: dict = Depends(require_admin),
):
    _require_kb(conn_id)

    filename = file.filename or "documento"
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=422,
            detail=f"Tipo de archivo no soportado (.{ext}). Permitidos: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    docs_dir = rag_tool.DOCS_DIR / conn_id
    docs_dir.mkdir(parents=True, exist_ok=True)
    file_path = docs_dir / filename

    content = file.file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="El archivo supera el límite de 20 MB")

    file_path.write_bytes(content)
    logger.info(f"[documents] Archivo guardado: {file_path} ({len(content)} bytes)")

    result = rag_tool.ingest_file(conn_id, file_path, filename)
    if not result["success"]:
        file_path.unlink(missing_ok=True)
        raise HTTPException(status_code=422, detail=result["error"])

    return result


@router.delete("/{conn_id}/{filename:path}")
def delete_document(conn_id: str, filename: str, admin: dict = Depends(require_admin)):
    _require_kb(conn_id)

    rag_tool.delete_document(conn_id, filename)

    file_path = rag_tool.DOCS_DIR / conn_id / filename
    file_path.unlink(missing_ok=True)

    logger.info(f"[documents] Eliminado: {conn_id}/{filename}")
    return {"message": f"Documento '{filename}' eliminado"}
