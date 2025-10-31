import logging
import traceback
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi.middleware.cors import CORSMiddleware
from .config import get_settings
from .db import init_db
from .logic.search_logic import load_menu_cache
from .routers import search as main_router, equivalents

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("backend_error.log"),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

class ExceptionLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        try:
            return await call_next(request)
        except Exception as e:
            logger.error(f"Unhandled exception: {e}\n{traceback.format_exc()}")
            return JSONResponse(
                status_code=500,
                content={"detail": "Internal Server Error"},
            )

settings = get_settings()
app = FastAPI(title=settings.APP_NAME)

app.add_middleware(ExceptionLoggingMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    init_db()
    load_menu_cache()


app.include_router(main_router.router)
app.include_router(equivalents.router)


@app.get("/health")
def health():
    return {"status": "ok"}
