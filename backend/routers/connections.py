from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Any
from routers.auth import get_current_user, require_admin
from services import supabase_service
from services.encryption_service import encrypt_config, decrypt_config

router = APIRouter(prefix="/api/connections", tags=["connections"])


class ConnectionCreate(BaseModel):
    name: str
    type: str  # postgresql | sqlserver | rest_api
    icon_name: str = "database"
    config: dict[str, Any]  # raw config, will be encrypted
    is_active: bool = True


class ConnectionUpdate(BaseModel):
    name: str | None = None
    icon_name: str | None = None
    config: dict[str, Any] | None = None
    is_active: bool | None = None


@router.get("/available")
def available_connections(user: dict = Depends(get_current_user)):
    """Returns connections without credentials — safe for all users."""
    return supabase_service.list_connections(include_credentials=False)


@router.get("")
def list_connections(admin: dict = Depends(require_admin)):
    connections = supabase_service.list_connections(include_credentials=True)
    # Decrypt so admin can see field names (but not passwords) — strip sensitive values
    result = []
    for conn in connections:
        try:
            cfg = decrypt_config(conn["config_encrypted"])
            # Mask password fields
            for k in list(cfg.keys()):
                if "password" in k.lower() or "secret" in k.lower() or "key" in k.lower():
                    cfg[k] = "********"
        except Exception:
            cfg = {}
        result.append({**conn, "config_preview": cfg, "config_encrypted": "[hidden]"})
    return result


@router.get("/{conn_id}")
def get_connection(conn_id: str, admin: dict = Depends(require_admin)):
    conn = supabase_service.get_connection_by_id(conn_id)
    if not conn:
        raise HTTPException(status_code=404, detail="Conexión no encontrada")
    try:
        cfg = decrypt_config(conn["config_encrypted"])
        for k in list(cfg.keys()):
            if "password" in k.lower() or "secret" in k.lower() or "key" in k.lower():
                cfg[k] = "********"
    except Exception:
        cfg = {}
    return {**conn, "config_preview": cfg, "config_encrypted": "[hidden]"}


@router.post("")
def create_connection(body: ConnectionCreate, admin: dict = Depends(require_admin)):
    encrypted = encrypt_config(body.config)
    data = {
        "name": body.name,
        "type": body.type,
        "icon_name": body.icon_name,
        "config_encrypted": encrypted,
        "is_active": body.is_active,
        "created_by": admin["id"],
    }
    conn = supabase_service.create_connection(data)
    return {**conn, "config_encrypted": "[hidden]"}


@router.put("/{conn_id}")
def update_connection(conn_id: str, body: ConnectionUpdate, admin: dict = Depends(require_admin)):
    existing = supabase_service.get_connection_by_id(conn_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Conexión no encontrada")
    update_data = {}
    if body.name is not None:
        update_data["name"] = body.name
    if body.icon_name is not None:
        update_data["icon_name"] = body.icon_name
    if body.is_active is not None:
        update_data["is_active"] = body.is_active
    if body.config is not None:
        update_data["config_encrypted"] = encrypt_config(body.config)
    if not update_data:
        raise HTTPException(status_code=400, detail="Nada que actualizar")
    conn = supabase_service.update_connection(conn_id, update_data)
    return {**conn, "config_encrypted": "[hidden]"}


@router.delete("/{conn_id}")
def delete_connection(conn_id: str, admin: dict = Depends(require_admin)):
    existing = supabase_service.get_connection_by_id(conn_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Conexión no encontrada")
    supabase_service.delete_connection(conn_id)
    return {"message": "Conexión eliminada"}
