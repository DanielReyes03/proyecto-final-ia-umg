# Gerente IA

Agente empresarial con tool calling que consulta múltiples fuentes de datos simultáneamente —bases de datos relacionales, APIs REST y documentos internos (RAG)— y responde en lenguaje natural en español.

Proyecto académico desarrollado para el curso de Inteligencia Artificial Aplicada.

---

## Equipo de desarrollo

| Nombre | Teléfono | Rol |
|---|---|---|
| William Manuel Garcia Gonzalez | 090-22-3022 | Líder de proyecto |
| Fredy Jose Daniel Reyes Saban | 090-22-9800 | Desarrollo |
| Jose Pablo Medina Gonzalez | 090-22-2592 | Desarrollo |

---

## ¿Qué hace?

El **Gerente IA** actúa como un analista ejecutivo que puede:

- Consultar **bases de datos PostgreSQL y SQL Server** en lenguaje natural (genera SQL automáticamente)
- Buscar en **documentos internos de la empresa** mediante RAG (Retrieval-Augmented Generation)
- Llamar **APIs REST** externas
- Cruzar información de **múltiples fuentes al mismo tiempo** en una sola pregunta
- Responder siempre en **español**, con tablas markdown cuando aplica

---

## Arquitectura

```
frontend/   → Next.js 14 App Router + Tailwind   (puerto 3000)
backend/    → FastAPI + Python                    (puerto 8000)
database/   → schema.sql para Supabase
```

**Bases de datos y almacenamiento:**
| Componente | Uso |
|---|---|
| Supabase (PostgreSQL) | Usuarios, conversaciones, mensajes, logs, conexiones |
| PostgreSQL / SQL Server | Datos del negocio (configurados por el admin) |
| ChromaDB (local) | Índice vectorial para RAG |
| Ollama | LLM local (llama3.1) + embeddings (nomic-embed-text) |

---

## Prerequisitos

| Herramienta | Versión mínima | Notas |
|---|---|---|
| Python | 3.10+ | |
| Node.js | 18+ | |
| Ollama | cualquier | LLM + embeddings locales |
| Cuenta Supabase | — | Plan gratuito funciona |
| ODBC Driver 17 | — | Solo si usas SQL Server |

---

## 1. Supabase — crear las tablas

1. Crea un proyecto en [supabase.com](https://supabase.com)
2. Ve a **SQL Editor** y ejecuta el archivo `database/schema.sql`
3. Copia la **Project URL** y la **service_role key** (Settings → API)

---

## 2. Backend

### 2.1 Instalar dependencias

```bash
cd backend
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

> **macOS/Linux:** si `pyodbc` falla (solo necesario para SQL Server), instala los drivers ODBC:
> ```bash
> brew install unixodbc
> # Luego instala "ODBC Driver 17 for SQL Server" desde Microsoft
> ```
> Si no usas SQL Server, puedes quitar `pyodbc` del requirements.txt.

### 2.2 Variables de entorno

```bash
cp .env.example .env
```

Edita `.env` con tus valores:

```env
# Modelo — elige uno:
AI_MODEL=ollama/llama3.1           # local, gratis
# AI_MODEL=claude-sonnet-4-20250514   # requiere ANTHROPIC_API_KEY
# AI_MODEL=gpt-4o                     # requiere OPENAI_API_KEY

OLLAMA_BASE_URL=http://localhost:11434

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...

# Generar encryption key:
# python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
ENCRYPTION_KEY=

# Generar JWT secret:
# python -c "import secrets; print(secrets.token_hex(32))"
JWT_SECRET=

CORS_ORIGINS=http://localhost:3000
```

### 2.3 Instalar Ollama (modo local)

```bash
# macOS / Linux
curl -fsSL https://ollama.com/install.sh | sh

# Windows — descargar instalador desde https://ollama.com/download
```

Descargar los modelos necesarios:

```bash
ollama pull llama3.1          # LLM principal
ollama pull nomic-embed-text  # embeddings para RAG
```

Verificar:

```bash
ollama run llama3.1 "hola"
```

### 2.4 Ejecutar el backend

```bash
uvicorn main:app --reload
```

La API estará disponible en `http://localhost:8000`.
Documentación automática: `http://localhost:8000/docs`

---

## 3. Seed — usuarios y conexiones demo

```bash
# Desde la raíz del proyecto (no desde /backend)
python seed_demo.py
```

Crea:
- `admin@empresa.com` / `admin123`
- `usuario@empresa.com` / `user123`
- 2 conexiones demo (PostgreSQL Northwind + SQL Server)

---

## 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

Abre `http://localhost:3000`.

---

## 5. Uso rápido

1. Entra con `admin@empresa.com` / `admin123`
2. En el **sidebar**, activa las fuentes de datos con el toggle
3. Escribe una pregunta o haz clic en uno de los chips de ejemplo
4. Para gestionar conexiones y documentos RAG: clic en ⚙️ → **Panel Admin**

---

## 6. Configurar RAG (Base de Conocimiento)

1. **Panel Admin → Conexiones → Agregar conexión → tipo "Base de Conocimiento"**
2. **Panel Admin → RAG / Documentos** → selecciona la base y sube documentos
   - Formatos soportados: PDF, Word (.docx), Excel (.xlsx), CSV, TXT
   - Tamaño máximo por archivo: 20 MB
3. Activa la conexión en el sidebar del chat
4. Pregunta sobre el contenido de los documentos

Los documentos se indexan automáticamente al subirlos (chunking + embeddings con `nomic-embed-text`). El índice vectorial se guarda localmente en `backend/chroma_db/`.

---

## Cambiar de modelo

Solo edita `backend/.env` y reinicia el backend:

```env
# Ollama local (gratis)
AI_MODEL=ollama/llama3.1

# Claude Sonnet
AI_MODEL=claude-sonnet-4-20250514
ANTHROPIC_API_KEY=sk-ant-...

# GPT-4o
AI_MODEL=gpt-4o
OPENAI_API_KEY=sk-...

# Gemini
AI_MODEL=gemini/gemini-1.5-pro
GEMINI_API_KEY=...
```

No hay que tocar nada más del código — LiteLLM maneja todo.

---

## Preguntas de ejemplo

**Bases de datos:**
- ¿Cuáles son los 5 productos más vendidos?
- ¿Qué clientes tienen órdenes pendientes de entrega?
- Compara las ventas por categoría entre ambas bases de datos
- ¿Cuál es el empleado con más ventas este año?
- Dame un resumen ejecutivo del estado del negocio

**Base de conocimiento (RAG):**
- ¿Cuál es la política de descuentos para clientes?
- ¿Qué procedimiento aplica si un empleado llega tarde reiteradamente?
- ¿Cuáles son los tiempos de entrega según la región?

---

## Estructura del proyecto

```
Proyecto-IA/
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   ├── .env.example
│   ├── chroma_db/           # índice vectorial RAG (generado automáticamente)
│   ├── documents/           # archivos subidos por conexión (generado automáticamente)
│   ├── routers/
│   │   ├── auth.py          # login, logout, /me
│   │   ├── chat.py          # mensajes, conversaciones, logs
│   │   ├── connections.py   # CRUD de conexiones (admin)
│   │   └── documents.py     # upload / list / delete documentos RAG
│   ├── tools/
│   │   ├── tool_registry.py     # construye tools dinámicamente
│   │   ├── postgresql_tool.py   # conector psycopg2
│   │   ├── sqlserver_tool.py    # conector pyodbc
│   │   ├── rest_tool.py         # cliente httpx
│   │   └── rag_tool.py          # ChromaDB + embeddings Ollama
│   └── services/
│       ├── llm_service.py        # LiteLLM — agnóstico de modelo
│       ├── supabase_service.py   # CRUD Supabase
│       └── encryption_service.py # Fernet para credenciales
├── frontend/
│   ├── app/
│   │   ├── layout.jsx
│   │   ├── page.jsx
│   │   ├── login/page.jsx
│   │   ├── chat/page.jsx
│   │   └── admin/page.jsx       # gestión de conexiones + RAG
│   ├── components/
│   │   ├── Sidebar.jsx
│   │   ├── ChatPanel.jsx
│   │   ├── MessageBubble.jsx
│   │   ├── ToolIndicator.jsx
│   │   ├── ConnectionCard.jsx
│   │   └── ConnectionForm.jsx
│   ├── hooks/
│   │   ├── useChat.js
│   │   └── useConnections.js
│   └── services/
│       └── api.js
├── database/
│   └── schema.sql
├── docker/
│   ├── postgres/northwind.sql
│   └── sqlserver/northwind.sql
├── docker-compose.yml
├── seed_demo.py
└── README.md
```

---

## Seguridad

- Las contraseñas de conexiones se encriptan con **Fernet** antes de guardarse en Supabase
- Los endpoints de admin requieren JWT con `role: admin`
- Las queries al agente son solo **SELECT** — nunca escritura
- Los tokens JWT expiran en 24 horas
- Los documentos RAG se almacenan localmente en el servidor, nunca en servicios externos
