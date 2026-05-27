import time
import httpx


def execute_request(config: dict, url: str, method: str, headers: dict, params: dict, body: dict | None) -> dict:
    start = time.time()
    base_url = config.get("base_url", "").rstrip("/")
    full_url = f"{base_url}/{url.lstrip('/')}" if base_url else url
    merged_headers = {**config.get("default_headers", {}), **headers}
    try:
        with httpx.Client(timeout=15) as client:
            response = client.request(
                method=method.upper(),
                url=full_url,
                headers=merged_headers,
                params=params or None,
                json=body or None,
            )
            duration_ms = int((time.time() - start) * 1000)
            try:
                data = response.json()
            except Exception:
                data = response.text
            return {
                "success": True,
                "status_code": response.status_code,
                "data": data,
                "duration_ms": duration_ms,
            }
    except Exception as e:
        duration_ms = int((time.time() - start) * 1000)
        return {"success": False, "error": str(e), "duration_ms": duration_ms}


def build_tool_definition(connection_id: str, connection_name: str) -> dict:
    return {
        "type": "function",
        "function": {
            "name": f"call_rest_api_{connection_id.replace('-', '_')}",
            "description": (
                f"Llama a la API REST '{connection_name}'. "
                "Úsala para obtener datos de servicios externos o APIs de negocio."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "url": {
                        "type": "string",
                        "description": "Ruta del endpoint (relativa a la base URL configurada)",
                    },
                    "method": {
                        "type": "string",
                        "enum": ["GET", "POST", "PUT", "DELETE"],
                        "description": "Método HTTP",
                    },
                    "headers": {
                        "type": "object",
                        "description": "Headers adicionales (se mezclan con los por defecto)",
                        "default": {},
                    },
                    "params": {
                        "type": "object",
                        "description": "Query params",
                        "default": {},
                    },
                    "body": {
                        "type": "object",
                        "description": "Cuerpo JSON para POST/PUT",
                        "default": None,
                    },
                },
                "required": ["url", "method"],
            },
        },
    }
