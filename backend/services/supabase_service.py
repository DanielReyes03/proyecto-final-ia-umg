import os
from supabase import create_client, Client


def get_client() -> Client:
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY")
    if not url or not key:
        raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set")
    return create_client(url, key)


# ── Users ──────────────────────────────────────────────────────────────────────

def get_user_by_email(email: str) -> dict | None:
    sb = get_client()
    result = sb.table("users").select("*").eq("email", email).limit(1).execute()
    return result.data[0] if result.data else None


def get_user_by_id(user_id: str) -> dict | None:
    sb = get_client()
    result = sb.table("users").select("*").eq("id", user_id).limit(1).execute()
    return result.data[0] if result.data else None


def create_user(email: str, password_hash: str, name: str, role: str = "user") -> dict:
    sb = get_client()
    result = sb.table("users").insert({
        "email": email,
        "password_hash": password_hash,
        "name": name,
        "role": role,
    }).execute()
    return result.data[0]


# ── Connections ────────────────────────────────────────────────────────────────

def list_connections(include_credentials: bool = False) -> list[dict]:
    sb = get_client()
    fields = "id, name, type, icon_name, is_active, created_at" if not include_credentials else "*"
    result = sb.table("connections").select(fields).execute()
    return result.data


def get_connection_by_id(conn_id: str) -> dict | None:
    sb = get_client()
    result = sb.table("connections").select("*").eq("id", conn_id).limit(1).execute()
    return result.data[0] if result.data else None


def get_connections_by_ids(ids: list[str]) -> list[dict]:
    if not ids:
        return []
    sb = get_client()
    result = sb.table("connections").select("*").in_("id", ids).eq("is_active", True).execute()
    return result.data


def create_connection(data: dict) -> dict:
    sb = get_client()
    result = sb.table("connections").insert(data).execute()
    return result.data[0]


def update_connection(conn_id: str, data: dict) -> dict:
    sb = get_client()
    result = sb.table("connections").update(data).eq("id", conn_id).execute()
    return result.data[0]


def delete_connection(conn_id: str) -> None:
    sb = get_client()
    sb.table("connections").delete().eq("id", conn_id).execute()


# ── Conversations ──────────────────────────────────────────────────────────────

def list_conversations(user_id: str) -> list[dict]:
    sb = get_client()
    result = (
        sb.table("conversations")
        .select("*")
        .eq("user_id", user_id)
        .order("updated_at", desc=True)
        .execute()
    )
    return result.data


def get_conversation(conv_id: str) -> dict | None:
    sb = get_client()
    result = sb.table("conversations").select("*").eq("id", conv_id).maybe_single().execute()
    return result.data


def create_conversation(user_id: str, title: str = "Nueva conversación") -> dict:
    sb = get_client()
    result = sb.table("conversations").insert({
        "user_id": user_id,
        "title": title,
    }).execute()
    return result.data[0]


def update_conversation_title(conv_id: str, title: str) -> None:
    sb = get_client()
    sb.table("conversations").update({"title": title, "updated_at": "now()"}).eq("id", conv_id).execute()


# ── Messages ───────────────────────────────────────────────────────────────────

def get_messages(conv_id: str) -> list[dict]:
    sb = get_client()
    result = (
        sb.table("messages")
        .select("*")
        .eq("conversation_id", conv_id)
        .order("created_at")
        .execute()
    )
    return result.data


def save_message(conv_id: str, role: str, content: str) -> dict:
    sb = get_client()
    result = sb.table("messages").insert({
        "conversation_id": conv_id,
        "role": role,
        "content": content,
    }).execute()
    # bump conversation updated_at
    sb.table("conversations").update({"updated_at": "now()"}).eq("id", conv_id).execute()
    return result.data[0]


# ── Tool logs ──────────────────────────────────────────────────────────────────

def save_tool_log(
    conv_id: str,
    tool_name: str,
    input_summary: str,
    duration_ms: int,
    success: bool,
) -> None:
    sb = get_client()
    sb.table("tool_logs").insert({
        "conversation_id": conv_id,
        "tool_name": tool_name,
        "input_summary": input_summary,
        "duration_ms": duration_ms,
        "success": success,
    }).execute()


def list_tool_logs(filters: dict | None = None) -> list[dict]:
    sb = get_client()
    query = sb.table("tool_logs").select("*").order("created_at", desc=True)
    if filters:
        if filters.get("tool_name"):
            query = query.eq("tool_name", filters["tool_name"])
        if filters.get("date_from"):
            query = query.gte("created_at", filters["date_from"])
        if filters.get("date_to"):
            query = query.lte("created_at", filters["date_to"])
    return query.limit(500).execute().data
