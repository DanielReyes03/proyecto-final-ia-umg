import json
import time
import logging
import traceback
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from routers.auth import get_current_user
from services import supabase_service
from services.llm_service import (
    get_completion, safe_tool_calls, get_text_content,
    extract_tool_calls_from_text, SYSTEM_PROMPT,
)
from tools.tool_registry import build_tools

router = APIRouter(prefix="/api/chat", tags=["chat"])
logger = logging.getLogger("gerente_ia.chat")


def _looks_like_raw_tool_result(text: str) -> bool:
    """
    Detecta si el LLM devolvió JSON crudo de resultado de tool en lugar de
    lenguaje natural. Evita guardar esos mensajes sin síntesis.
    """
    t = text.strip()
    if not t.startswith("{"):
        return False
    try:
        obj = json.loads(t)
        # Parece resultado de tool si tiene claves típicas de nuestro formato
        return any(k in obj for k in ("success", "rows", "row_count", "error", "duration_ms"))
    except (json.JSONDecodeError, ValueError):
        return False


class ChatRequest(BaseModel):
    message: str
    conversation_id: str | None = None
    active_connection_ids: list[str] = []


@router.post("")
def chat(body: ChatRequest, user: dict = Depends(get_current_user)):
    logger.info(f"── Chat request ── user={user['email']} connections={body.active_connection_ids}")

    try:
        # ── Conversación ────────────────────────────────────────────────────────
        if body.conversation_id:
            conv = supabase_service.get_conversation(body.conversation_id)
            if not conv:
                raise HTTPException(status_code=404, detail="Conversación no encontrada")
        else:
            title = body.message[:60] + ("..." if len(body.message) > 60 else "")
            conv = supabase_service.create_conversation(user["id"], title)
            logger.info(f"  Nueva conversación: {conv['id']}")

        conv_id = conv["id"]

        # ── Historial ────────────────────────────────────────────────────────────
        history = supabase_service.get_messages(conv_id)
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]
        for m in history:
            messages.append({"role": m["role"], "content": m["content"]})
        messages.append({"role": "user", "content": body.message})
        supabase_service.save_message(conv_id, "user", body.message)

        # ── Construir tools ──────────────────────────────────────────────────────
        active_connections = supabase_service.get_connections_by_ids(body.active_connection_ids)
        logger.info(f"  Conexiones activas cargadas: {[c['name'] for c in active_connections]}")
        tools, executor_map = build_tools(active_connections)
        logger.info(f"  Tools construidas: {list(executor_map.keys())}")

        # Mapa tool_name → nombre amigable de la conexión (para mostrar en el frontend)
        _prefix = {
            "postgresql": "query_postgresql_",
            "sqlserver": "query_sqlserver_",
            "rest_api": "call_rest_api_",
            "knowledge_base": "search_knowledge_base_",
        }
        tool_display_names = {
            f"{_prefix.get(c['type'], '')}{c['id'].replace('-', '_')}": c["name"]
            for c in active_connections if c["type"] in _prefix
        }

        # ── Loop agéntico ────────────────────────────────────────────────────────
        tool_calls_made = []
        text_content = ""
        max_iterations = 5
        # True solo cuando la iteración anterior terminó SIN errores.
        # Si alguna tool falló, permitimos una iteración más para que el LLM reintente.
        all_prev_iteration_succeeded = False

        for iteration in range(max_iterations):
            logger.info(f"  Iteración LLM #{iteration + 1} — mensajes en contexto: {len(messages)}")

            # Desactivar tools únicamente cuando la iteración anterior tuvo TODOS los éxitos.
            # Esto permite reintentos cuando una consulta falla (ej. SQL incorrecto).
            has_good_results = (
                any(tc["success"] for tc in tool_calls_made)
                and all_prev_iteration_succeeded
            )
            active_tools = None if has_good_results else (tools if tools else None)

            if has_good_results and active_tools is None:
                logger.info("  → Forzando respuesta textual (tools desactivadas — todas las consultas previas exitosas)")

            response = get_completion(messages, tools=active_tools)
            tool_calls = safe_tool_calls(response)
            text_content = get_text_content(response) or ""

            # Llama a veces imprime el tool call como texto JSON en lugar de ejecutarlo.
            # Si no hay tool_calls reales pero el texto parece un tool call, lo recuperamos.
            if not tool_calls and text_content and active_tools:
                known_names = set(executor_map.keys())
                recovered = extract_tool_calls_from_text(text_content, known_names)
                if recovered:
                    tool_calls = recovered
                    text_content = ""  # Ignorar el texto crudo — se reemplazará por la respuesta real

            logger.info(f"  → tool_calls={len(tool_calls) if tool_calls else 0}  text_len={len(text_content)}")

            if not tool_calls:
                if not text_content:
                    text_content = "No pude consultar las fuentes en este momento, pero puedo responder con lo que sé."
                break

            # Agregar mensaje del asistente con tool_calls al contexto
            assistant_msg = {
                "role": "assistant",
                "content": text_content or None,
                "tool_calls": [
                    {
                        "id": tc.id,
                        "type": "function",
                        "function": {
                            "name": tc.function.name,
                            "arguments": tc.function.arguments,
                        },
                    }
                    for tc in tool_calls
                ],
            }
            messages.append(assistant_msg)

            iteration_successes = []
            for tc in tool_calls:
                tool_name = tc.function.name
                logger.info(f"  Ejecutando tool: {tool_name}")
                logger.info(f"    args: {tc.function.arguments[:200]}")

                try:
                    inputs = json.loads(tc.function.arguments)
                except json.JSONDecodeError as e:
                    logger.warning(f"    JSON decode error en args: {e}")
                    inputs = {}

                executor = executor_map.get(tool_name)
                t_start = time.time()

                if executor:
                    result = executor(inputs)
                else:
                    result = {"success": False, "error": f"Tool '{tool_name}' not found in executor_map"}
                    logger.warning(f"    Tool no encontrada. Disponibles: {list(executor_map.keys())}")

                duration_ms = int((time.time() - t_start) * 1000)
                success = result.get("success", False)
                logger.info(f"    resultado: success={success} rows={result.get('row_count')} ms={duration_ms}")

                if not success:
                    logger.warning(f"    error de tool: {result.get('error', 'desconocido')}")

                iteration_successes.append(success)

                # Guardar log en Supabase
                try:
                    supabase_service.save_tool_log(
                        conv_id=conv_id,
                        tool_name=tool_name,
                        input_summary=inputs.get("natural_query", str(inputs))[:300],
                        duration_ms=duration_ms,
                        success=success,
                    )
                except Exception as log_err:
                    logger.warning(f"    No se pudo guardar tool_log: {log_err}")

                tool_calls_made.append({
                    "tool_name": tool_name,
                    "display_name": tool_display_names.get(tool_name, tool_name),
                    "success": success,
                    "row_count": result.get("row_count"),
                    "duration_ms": duration_ms,
                })

                messages.append({
                    "role": "tool",
                    "tool_call_id": tc.id,
                    "content": json.dumps(result, default=str),
                })

            # Si alguna tool falló esta iteración, mantener tools activas para reintento
            all_prev_iteration_succeeded = all(iteration_successes)
            if not all_prev_iteration_succeeded:
                failed = [tool_calls[i].function.name for i, ok in enumerate(iteration_successes) if not ok]
                logger.info(f"  → Fallos en esta iteración — se permitirá reintento: {failed}")

        # ── Fallback: si aún no hay texto pero tenemos resultados, forzar síntesis ─
        if not text_content and tool_calls_made:
            logger.info("  Fallback: forzando síntesis final sin tools...")
            synthesis_response = get_completion(messages, tools=None)
            text_content = get_text_content(synthesis_response) or (
                "Obtuve los datos solicitados pero no pude generar un resumen. "
                "Intenta reformular la pregunta."
            )
            logger.info(f"  Síntesis fallback: {len(text_content)} chars")

        # ── Sanity check: detectar si el LLM devolvió JSON crudo en vez de texto ─
        # Llama a veces "alucina" el resultado de una tool como texto JSON.
        # En ese caso forzamos una síntesis adicional con instrucción explícita.
        if text_content and _looks_like_raw_tool_result(text_content):
            logger.warning("  LLM devolvió JSON crudo como respuesta — forzando re-síntesis en lenguaje natural")
            messages.append({
                "role": "user",
                "content": (
                    "Por favor, responde en lenguaje natural en español. "
                    "NO devuelvas JSON. Explica los datos obtenidos de forma clara y ejecutiva."
                ),
            })
            resynthesis = get_completion(messages, tools=None)
            text_content = get_text_content(resynthesis) or text_content
            logger.info(f"  Re-síntesis: {len(text_content)} chars")

        # ── Guardar respuesta ────────────────────────────────────────────────────
        logger.info(f"  Guardando respuesta final ({len(text_content)} chars)")
        supabase_service.save_message(conv_id, "assistant", text_content)

        return {
            "response": text_content,
            "tool_calls_made": tool_calls_made,
            "conversation_id": conv_id,
        }

    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"  ERROR en chat endpoint: {type(exc).__name__}: {exc}")
        logger.error(traceback.format_exc())
        return JSONResponse(
            status_code=500,
            content={
                "detail": str(exc),
                "type": type(exc).__name__,
                "trace": traceback.format_exc(),
            },
        )


@router.get("/conversations")
def list_conversations(user: dict = Depends(get_current_user)):
    return supabase_service.list_conversations(user["id"])


@router.get("/conversations/{conv_id}/messages")
def get_messages(conv_id: str, user: dict = Depends(get_current_user)):
    conv = supabase_service.get_conversation(conv_id)
    if not conv or conv["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Sin acceso a esta conversación")
    return supabase_service.get_messages(conv_id)


@router.get("/logs")
def get_tool_logs(
    tool_name: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    user: dict = Depends(get_current_user),
):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Solo admin puede ver logs")
    filters = {"tool_name": tool_name, "date_from": date_from, "date_to": date_to}
    return supabase_service.list_tool_logs(filters)
