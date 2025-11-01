import logging
import traceback
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi.middleware.cors import CORSMiddleware
from .config import get_settings
from .db import init_db, get_session, Session
from .logic.search_logic import load_menu_cache
from .logic.setup_cache import setup_filtre_cache
from .routers import search as main_router, equivalents, filters as filters_router, test as test_router

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
    with next(get_session()) as session:
        setup_filtre_cache(session)
        load_menu_cache(session)


app.include_router(main_router.router)
app.include_router(equivalents.router)
app.include_router(filters_router.router)
app.include_router(test_router.router)


@app.get("/health")
def health():
    return {"status": "ok"}
