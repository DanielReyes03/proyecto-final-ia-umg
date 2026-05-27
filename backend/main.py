import os
import logging
import traceback
from dotenv import load_dotenv

load_dotenv()

# Monkey-patch: passlib 1.7.4 no es compatible con bcrypt 4.x+ de dos formas:
# 1) Busca __about__.__version__ que ya no existe.
# 2) Su detect_wrap_bug() pasa una contraseña de 73 bytes, que bcrypt 4.x rechaza.
# Este parche corrige ambos problemas sin cambiar el comportamiento real de hashing.
import bcrypt as _bcrypt
if not hasattr(_bcrypt, '__about__'):
    _bcrypt.__about__ = type('_about', (), {'__version__': _bcrypt.__version__})()
_orig_hashpw = _bcrypt.hashpw
def _patched_hashpw(password, salt):
    if isinstance(password, (bytes, bytearray)) and len(password) > 72:
        password = password[:72]
    return _orig_hashpw(password, salt)
_bcrypt.hashpw = _patched_hashpw

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from routers import auth, connections, chat, documents

# ── Logging visible en consola ──────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("gerente_ia")

app = FastAPI(title="Gerente IA API", version="1.0.0")

# CORS — acepta tanto puerto 3000 (Next.js) como 5173 (Vite) y lo del .env
default_origins = "http://localhost:3000,http://localhost:5173"
origins = os.getenv("CORS_ORIGINS", default_origins).split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Handler global — muestra el traceback completo en consola y en la respuesta
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    tb = traceback.format_exc()
    logger.error("─── UNHANDLED EXCEPTION ───────────────────────────────")
    logger.error(f"  Path   : {request.method} {request.url}")
    logger.error(f"  Error  : {type(exc).__name__}: {exc}")
    logger.error(f"  Trace  :\n{tb}")
    logger.error("────────────────────────────────────────────────────────")
    return JSONResponse(
        status_code=500,
        content={
            "detail": str(exc),
            "type": type(exc).__name__,
            "trace": tb,
        },
    )

app.include_router(auth.router)
app.include_router(connections.router)
app.include_router(chat.router)
app.include_router(documents.router)


@app.get("/")
def root():
    return {"status": "ok", "app": "Gerente IA"}


@app.get("/health")
def health():
    return {"status": "healthy"}
