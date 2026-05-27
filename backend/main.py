import os
import logging
import traceback
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from routers import auth, connections, chat

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


@app.get("/")
def root():
    return {"status": "ok", "app": "Gerente IA"}


@app.get("/health")
def health():
    return {"status": "healthy"}
