# Gerente IA

Agente empresarial con tool calling que consulta múltiples bases de datos simultáneamente y responde en lenguaje natural.

---

## Arquitectura

```
frontend/   → React + Vite + Tailwind (puerto 5173)
backend/    → FastAPI + Python       (puerto 8000)
database/   → schema.sql para Supabase
```

**Bases de datos:**
- **Supabase** — usuarios, conversaciones, logs (BD de la app)
- **PostgreSQL / SQL Server** — datos del negocio (configuradas por el admin, consultadas por el agente)

---

## Prerequisitos

| Herramienta | Versión mínima | Notas |
|---|---|---|
| Python | 3.11+ | |
| Node.js | 18+ | |
| Ollama | cualquier | Solo para modo local |
| Cuenta Supabase | — | Plan gratuito funciona |

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
# AI_MODEL=claude/claude-sonnet-4-20250514  # requiere ANTHROPIC_API_KEY
# AI_MODEL=gpt-4o                           # requiere OPENAI_API_KEY

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

CORS_ORIGINS=http://localhost:5173
```

### 2.3 Instalar Ollama (modo local)

```bash
# macOS / Linux
curl -fsSL https://ollama.com/install.sh | sh

# Windows — descargar instalador desde https://ollama.com/download
```

Descargar el modelo:

```bash
ollama pull llama3.1
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
cd ..   # si estás en /backend
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

Abre `http://localhost:5173`.

---

## 5. Uso rápido

1. Entra con `admin@empresa.com` / `admin123`
2. En el **sidebar**, activa las fuentes de datos con el toggle
3. Escribe una pregunta o haz clic en uno de los chips de ejemplo
4. Para gestionar conexiones: clic en el ícono ⚙️ → **Panel Admin**

---

## Cambiar de modelo

Solo edita `backend/.env` y reinicia el backend:

```env
# Ollama local (gratis)
AI_MODEL=ollama/llama3.1

# Claude Sonnet (demo)
AI_MODEL=claude/claude-sonnet-4-20250514
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

- ¿Cuáles son los 5 productos más vendidos?
- ¿Qué clientes tienen órdenes pendientes de entrega?
- Compara las ventas por categoría entre ambas bases de datos
- ¿Cuál es el empleado con más ventas este año?
- Dame un resumen ejecutivo del estado del negocio

---

## Estructura del proyecto

```
Proyecto-IA/
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   ├── .env.example
│   ├── routers/
│   │   ├── auth.py          # login, logout, /me
│   │   ├── chat.py          # mensajes, conversaciones, logs
│   │   └── connections.py   # CRUD de conexiones (admin)
│   ├── tools/
│   │   ├── tool_registry.py     # construye tools dinámicamente
│   │   ├── postgresql_tool.py   # conector psycopg2
│   │   ├── sqlserver_tool.py    # conector pyodbc
│   │   └── rest_tool.py         # cliente httpx
│   └── services/
│       ├── llm_service.py        # LiteLLM — agnóstico de modelo
│       ├── supabase_service.py   # CRUD Supabase
│       └── encryption_service.py # Fernet para credenciales
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── ChatPage.jsx
│   │   │   └── AdminPage.jsx
│   │   ├── components/
│   │   │   ├── Sidebar.jsx
│   │   │   ├── ChatPanel.jsx
│   │   │   ├── MessageBubble.jsx
│   │   │   ├── ToolIndicator.jsx
│   │   │   ├── ConnectionCard.jsx
│   │   │   └── ConnectionForm.jsx
│   │   ├── hooks/
│   │   │   ├── useChat.js
│   │   │   └── useConnections.js
│   │   └── services/
│   │       └── api.js
│   └── package.json
├── database/
│   └── schema.sql
├── seed_demo.py
└── README.md
```

---

## Seguridad

- Las contraseñas de conexiones se encriptan con **Fernet** antes de guardarse en Supabase
- Los endpoints de admin requieren JWT con `role: admin`
- Las queries al agente son solo **SELECT** — nunca escritura
- Los tokens JWT expiran en 24 horas
