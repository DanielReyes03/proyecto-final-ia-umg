import time
import logging

logger = logging.getLogger("gerente_ia.tools.sqlserver")

try:
    import pyodbc
    PYODBC_AVAILABLE = True
except ImportError:
    PYODBC_AVAILABLE = False


def _build_connection_string(config: dict) -> str:
    driver = config.get("driver", "ODBC Driver 17 for SQL Server")
    instance = config.get("instance", "")
    server = f"{config['host']}\\{instance}" if instance else config["host"]
    port = config.get("port", 1433)
    return (
        f"DRIVER={{{driver}}};"
        f"SERVER={server},{port};"
        f"DATABASE={config['database']};"
        f"UID={config['user']};"
        f"PWD={config['password']};"
        "Connection Timeout=10;"
    )


def get_schema(config: dict) -> str:
    """
    Returns a compact schema description of all user tables.
    Injected into the tool description so the LLM writes correct T-SQL.
    """
    if not PYODBC_AVAILABLE:
        return "(pyodbc no disponible)"
    try:
        conn = pyodbc.connect(_build_connection_string(config), timeout=10)
        cursor = conn.cursor()
        cursor.execute("""
            SELECT
                c.TABLE_NAME,
                c.COLUMN_NAME,
                c.DATA_TYPE,
                CASE WHEN pk.COLUMN_NAME IS NOT NULL THEN 'PK' ELSE '' END AS pk_flag,
                CASE WHEN fk.COLUMN_NAME IS NOT NULL
                     THEN 'FK→' + fk.REFERENCED_TABLE ELSE '' END AS fk_flag
            FROM INFORMATION_SCHEMA.COLUMNS c
            LEFT JOIN (
                SELECT ku.TABLE_NAME, ku.COLUMN_NAME
                FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
                JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE ku
                  ON tc.CONSTRAINT_NAME = ku.CONSTRAINT_NAME
                WHERE tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
            ) pk ON pk.TABLE_NAME = c.TABLE_NAME AND pk.COLUMN_NAME = c.COLUMN_NAME
            LEFT JOIN (
                SELECT
                    kcu.TABLE_NAME, kcu.COLUMN_NAME,
                    ccu.TABLE_NAME AS REFERENCED_TABLE
                FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS rc
                JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
                  ON rc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
                JOIN INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE ccu
                  ON rc.UNIQUE_CONSTRAINT_NAME = ccu.CONSTRAINT_NAME
            ) fk ON fk.TABLE_NAME = c.TABLE_NAME AND fk.COLUMN_NAME = c.COLUMN_NAME
            WHERE c.TABLE_SCHEMA = 'dbo'
            ORDER BY c.TABLE_NAME, c.ORDINAL_POSITION
        """)
        rows = cursor.fetchall()
        conn.close()

        tables: dict[str, list[str]] = {}
        for table, col, dtype, pk, fk in rows:
            flags = " ".join(filter(None, [pk, fk]))
            entry = f"  {col} {dtype}" + (f" [{flags}]" if flags else "")
            tables.setdefault(table, []).append(entry)

        lines = []
        for table, cols in tables.items():
            lines.append(f"TABLE {table}:")
            lines.extend(cols)
        return "\n".join(lines)

    except Exception as e:
        logger.warning(f"get_schema failed for SQL Server: {e}")
        return "(schema no disponible — usa T-SQL estándar con nombres de columna exactos)"


def execute_query(config: dict, natural_query: str, sql_query: str) -> dict:
    start = time.time()
    if not PYODBC_AVAILABLE:
        return {"success": False, "error": "pyodbc not installed", "duration_ms": 0}
    conn = None
    try:
        conn = pyodbc.connect(_build_connection_string(config), timeout=10)
        cursor = conn.cursor()
        cursor.execute(sql_query)
        columns = [col[0] for col in cursor.description]
        rows = [dict(zip(columns, row)) for row in cursor.fetchmany(200)]
        duration_ms = int((time.time() - start) * 1000)
        return {"success": True, "rows": rows, "row_count": len(rows), "duration_ms": duration_ms}
    except Exception as e:
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
            "name": f"query_sqlserver_{connection_id.replace('-', '_')}",
            "description": (
                f"Consulta la base de datos SQL Server '{connection_name}'. "
                "REGLAS T-SQL — LEE CADA UNA ANTES DE ESCRIBIR EL SQL: "
                "1) Paginación: TOP N al inicio → SELECT TOP 5 ...  "
                "   ❌ LIMIT no existe en T-SQL. NUNCA escribas LIMIT. "
                "2) Año de una fecha: YEAR(columna) → WHERE YEAR(o.order_date) = YEAR(GETDATE())  "
                "   ❌ EXTRACT no existe en T-SQL. NUNCA escribas EXTRACT(). "
                "3) En GROUP BY incluye TODAS las columnas no-agregadas del SELECT. "
                "4) Para columnas de otra tabla SIEMPRE usa JOIN explícito. "
                "   Ejemplo: para filtrar por o.order_date debes incluir JOIN orders o ON od.order_id = o.order_id "
                "5) Columnas en snake_case (product_name, order_date, shipped_date). "
                "6) Solo SELECT — nunca INSERT/UPDATE/DELETE."
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
                            "T-SQL válido para SQL Server. "
                            "Usa EXACTAMENTE los nombres de columna del SCHEMA. "
                            "GROUP BY debe incluir todas las columnas del SELECT que no sean agregaciones."
                        ),
                    },
                },
                "required": ["natural_query", "sql_query"],
            },
        },
    }
