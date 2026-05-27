import logging
from services.encryption_service import decrypt_config
from tools import postgresql_tool, sqlserver_tool, rest_tool, rag_tool

logger = logging.getLogger("gerente_ia.tool_registry")


def build_tools(active_connections: list[dict]) -> tuple[list[dict], dict]:
    """
    Builds the tools list and executor map for all active connections.
    For DB connections, fetches the live schema and injects it into
    the tool description so the LLM writes correct SQL from the start.

    Returns:
        tools       — list of tool defs in LiteLLM/OpenAI format
        executor_map — { tool_name -> callable(inputs) -> result }
    """
    tools = []
    executor_map = {}

    for conn in active_connections:
        conn_id   = conn["id"]
        conn_name = conn["name"]
        conn_type = conn["type"]

        try:
            config = decrypt_config(conn["config_encrypted"])
        except Exception as e:
            logger.warning(f"Could not decrypt config for '{conn_name}': {e}")
            continue

        # ── PostgreSQL ──────────────────────────────────────────────────────────
        if conn_type == "postgresql":
            logger.info(f"  [{conn_name}] Fetching PostgreSQL schema...")
            schema_text = postgresql_tool.get_schema(config)
            logger.info(f"  [{conn_name}] Schema loaded ({len(schema_text)} chars)")

            tool_def  = postgresql_tool.build_tool_definition(conn_id, conn_name, schema_text)
            tool_name = tool_def["function"]["name"]
            tools.append(tool_def)

            def make_pg_executor(cfg):
                def executor(inputs: dict) -> dict:
                    return postgresql_tool.execute_query(
                        cfg,
                        inputs.get("natural_query", ""),
                        inputs.get("sql_query", ""),
                    )
                return executor

            executor_map[tool_name] = make_pg_executor(config)

        # ── SQL Server ──────────────────────────────────────────────────────────
        elif conn_type == "sqlserver":
            logger.info(f"  [{conn_name}] Fetching SQL Server schema...")
            schema_text = sqlserver_tool.get_schema(config)
            logger.info(f"  [{conn_name}] Schema loaded ({len(schema_text)} chars)")

            tool_def  = sqlserver_tool.build_tool_definition(conn_id, conn_name, schema_text)
            tool_name = tool_def["function"]["name"]
            tools.append(tool_def)

            def make_ss_executor(cfg):
                def executor(inputs: dict) -> dict:
                    return sqlserver_tool.execute_query(
                        cfg,
                        inputs.get("natural_query", ""),
                        inputs.get("sql_query", ""),
                    )
                return executor

            executor_map[tool_name] = make_ss_executor(config)

        # ── REST API ────────────────────────────────────────────────────────────
        elif conn_type == "rest_api":
            tool_def  = rest_tool.build_tool_definition(conn_id, conn_name)
            tool_name = tool_def["function"]["name"]
            tools.append(tool_def)

            def make_rest_executor(cfg):
                def executor(inputs: dict) -> dict:
                    return rest_tool.execute_request(
                        cfg,
                        url=inputs.get("url", "/"),
                        method=inputs.get("method", "GET"),
                        headers=inputs.get("headers", {}),
                        params=inputs.get("params", {}),
                        body=inputs.get("body"),
                    )
                return executor

            executor_map[tool_name] = make_rest_executor(config)

        # ── Knowledge Base (RAG) ────────────────────────────────────────────────
        elif conn_type == "knowledge_base":
            doc_count = len(rag_tool.list_documents(conn_id))
            logger.info(f"  [{conn_name}] Knowledge base — {doc_count} documentos indexados")

            tool_def  = rag_tool.build_tool_definition(conn_id, conn_name, doc_count)
            tool_name = tool_def["function"]["name"]
            tools.append(tool_def)

            def make_kb_executor(cid):
                def executor(inputs: dict) -> dict:
                    return rag_tool.search(cid, inputs.get("query", ""))
                return executor

            executor_map[tool_name] = make_kb_executor(conn_id)

        else:
            logger.warning(f"Unknown connection type '{conn_type}' for '{conn_name}' — skipped")

    logger.info(f"  Tools ready: {list(executor_map.keys())}")
    return tools, executor_map
