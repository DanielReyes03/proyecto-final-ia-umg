#!/usr/bin/env python3
"""
seed_demo.py — Crea usuarios y conexiones demo en Supabase.

Uso:
  cd backend
  pip install -r requirements.txt
  cd ..
  python seed_demo.py
"""

import os
import sys
from dotenv import load_dotenv

load_dotenv("./backend/.env")

from passlib.context import CryptContext
from supabase import create_client

sys.path.insert(0, "backend")
from services.encryption_service import encrypt_config

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("ERROR: SUPABASE_URL y SUPABASE_SERVICE_KEY deben estar en backend/.env")
    sys.exit(1)

sb = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


def upsert_user(email: str, password: str, name: str, role: str):
    result = sb.table("users").select("id").eq("email", email).limit(1).execute()
    if result.data:
        print(f"  Usuario ya existe: {email}")
        return result.data[0]["id"]
    inserted = sb.table("users").insert({
        "email": email,
        "password_hash": pwd_context.hash(password),
        "name": name,
        "role": role,
    }).execute()
    uid = inserted.data[0]["id"]
    print(f"  Usuario creado: {email} ({role})")
    return uid


def upsert_connection(name: str, conn_type: str, icon: str, config: dict, created_by: str):
    result = sb.table("connections").select("id").eq("name", name).limit(1).execute()
    if result.data:
        print(f"  Conexión ya existe: {name}")
        return
    sb.table("connections").insert({
        "name": name,
        "type": conn_type,
        "icon_name": icon,
        "config_encrypted": encrypt_config(config),
        "is_active": True,
        "created_by": created_by,
    }).execute()
    print(f"  Conexión creada: {name} ({conn_type})")


if __name__ == "__main__":
    print("\n── Creando usuarios demo ──────────────────────────────────────────")
    admin_id = upsert_user(
        email="admin@empresa.com",
        password="admin123",
        name="Administrador",
        role="admin",
    )
    upsert_user(
        email="usuario@empresa.com",
        password="user123",
        name="Usuario Demo",
        role="user",
    )

    print("\n── Creando conexiones demo ────────────────────────────────────────")
    upsert_connection(
        name="PostgreSQL Northwind",
        conn_type="postgresql",
        icon="database",
        config={
            "host": "localhost",
            "port": 5432,
            "database": "northwind",
            "user": "postgres",
            "password": "postgres",
        },
        created_by=admin_id,
    )
    upsert_connection(
        name="SQL Server Northwind",
        conn_type="sqlserver",
        icon="server",
        config={
            "host": "localhost",
            "port": 1433,
            "database": "NorthwindSS",
            "user": "sa",
            "password": "Admin1234!",
            "instance": "",
        },
        created_by=admin_id,
    )

    print("\n✓ Seed completado.\n")
    print("  Admin:   admin@empresa.com   / admin123")
    print("  Usuario: usuario@empresa.com / user123\n")
