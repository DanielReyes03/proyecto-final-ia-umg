import time
import logging
import psycopg2
import psycopg2.extras

logger = logging.getLogger("gerente_ia.tools.postgresql")


def _connect(config: dict):
    return psycopg2.connect(
        host=config["host"],
        port=int(config.get("port", 5432)),
        dbname=config["database"],
        user=config["user"],
        password=config["password"],
        connect_timeout=10,
    )


def get_schema(config: dict) -> str:
    """
    Returns a compact text description of all tables and columns
    to inject into the tool description so the LLM knows the schema.
    """
    try:
        conn = _connect(config)
        with conn.cursor() as cur:
            cur.execute("""
                SELECT
                    c.table_name,
                    c.column_name,
                    c.data_type,
                    CASE WHEN pk.column_name IS NOT NULL THEN 'PK' ELSE '' END AS pk_flag,
                    CASE WHEN fk.column_name IS NOT NULL THEN 'FK→' || fk.foreign_table_name ELSE '' END AS fk_flag
                FROM information_schema.columns c
                LEFT JOIN (
                    SELECT ku.table_name, ku.column_name
                    FROM information_schema.table_constraints tc
                    JOIN information_schema.key_column_usage ku
                      ON tc.constraint_name = ku.constraint_name
                    WHERE tc.constraint_type = 'PRIMARY KEY'
                      AND tc.table_schema = 'public'
                ) pk ON pk.table_name = c.table_name AND pk.column_name = c.column_name
                LEFT JOIN (
                    SELECT
                        kcu.table_name, kcu.column_name,
                        ccu.table_name AS foreign_table_name
                    FROM information_schema.table_constraints tc
                    JOIN information_schema.key_column_usage kcu
                      ON tc.constraint_name = kcu.constraint_name
                    JOIN information_schema.constraint_column_usage ccu
                      ON ccu.constraint_name = tc.constraint_name
                    WHERE tc.constraint_type = 'FOREIGN KEY'
                ) fk ON fk.table_name = c.table_name AND fk.column_name = c.column_name
                WHERE c.table_schema = 'public'
                ORDER BY c.table_name, c.ordinal_position
            """)
            rows = cur.fetchall()
        conn.close()

        # Format as compact schema
        tables: dict[str, list[str]] = {}
        for table, col, dtype, pk, fk in rows:
            short_type = _short_type(dtype)
            flags = " ".join(filter(None, [pk, fk]))
            entry = f"  {col} {short_type}" + (f" [{flags}]" if flags else "")
            tables.setdefault(table, []).append(entry)

        lines = []
        for table, cols in tables.items():
            lines.append(f"TABLE {table}:")
            lines.extend(cols)
        return "\n".join(lines)

    except Exception as e:
        logger.warning(f"get_schema failed for PostgreSQL: {e}")
        return "(schema no disponible — usa nombres de columnas en snake_case)"


def _short_type(pg_type: str) -> str:
    mapping = {
        "integer": "int", "bigint": "int", "smallint": "int",
        "numeric": "decimal", "real": "float", "double precision": "float",
        "character varying": "varchar", "character": "char", "text": "text",
        "boolean": "bool", "date": "date",
        "timestamp without time zone": "timestamp",
        "timestamp with time zone": "timestamptz",
    }
    return mapping.get(pg_type, pg_type)


def execute_query(config: dict, natural_query: str, sql_query: str) -> dict:
    start = time.time()
    conn = None
    try:
        conn = _connect(config)
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(sql_query)
            rows = cur.fetchmany(200)
            results = [dict(r) for r in rows]
        duration_ms = int((time.time() - start) * 1000)
        return {"success": True, "rows": results, "row_count": len(results), "duration_ms": duration_ms}
    except psycopg2.Error as e:
        duration_ms = int((time.time() - start) * 1000)
        return {"success": False, "error": str(e), "duration_ms": duration_ms}
    finally:
        if conn:
            conn.close()


def build_tool_definition(connection_id: str, connection_name: str, schema_text: str = "") -> dict:
    schema_section = f"\n\nSCHEMA:\n{schema_text}" if schema_text else ""
    return {
        "type": "function",
        "function": {
            "name": f"query_postgresql_{connection_id.replace('-', '_')}",
            "description": (
                f"Consulta la base de datos PostgreSQL '{connection_name}'. "
                "REGLAS SQL OBLIGATORIAS: "
                "1) Usa LIMIT (nunca TOP). "
                "2) En GROUP BY incluye TODAS las columnas no-agregadas del SELECT. "
                "3) Para columnas de otra tabla siempre usa JOIN explícito. "
                "4) Columnas en snake_case (product_name, order_date, shipped_date). "
                "5) Solo SELECT — nunca INSERT/UPDATE/DELETE."
                f"{schema_section}"
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "natural_query": {
                        "type": "string",
                        "description": "Qué información se busca en lenguaje natural",
                    },
                    "sql_query": {
                        "type": "string",
                        "description": (
                            "SQL PostgreSQL válido. "
                            "Usa EXACTAMENTE los nombres de columna del SCHEMA. "
                            "GROUP BY debe incluir todas las columnas del SELECT que no sean agregaciones."
                        ),
                    },
                },
                "required": ["natural_query", "sql_query"],
            },
        },
    }
