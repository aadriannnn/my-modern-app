import logging
import traceback
from fastapi import FastAPI, Request, APIRouter
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi.middleware.cors import CORSMiddleware
from .config import get_settings
from .db import init_db, get_session
from .cache import load_all_filters_into_memory
from .routers import (
    search as main_router,
    equivalents,
    filters as filters_router,
    test as test_router,
    contribuie as contribuie_router,
    case as case_router,
    modele as modele_router
)

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
    logger.info("--- Backend Startup Sequence Initiated ---")
    logger.info("Step 1: Initializing database...")
    init_db()
    logger.info("Step 1: Database initialization complete.")

    logger.info("Step 2: Loading all filter data into memory cache...")
    with next(get_session()) as session:
        load_all_filters_into_memory(session)
    logger.info("Step 2: In-memory cache loaded successfully.")
    logger.info("--- Backend Startup Sequence Finished ---")


# API router
api_router = APIRouter(prefix="/api")
api_router.include_router(main_router.router)
api_router.include_router(equivalents.router)
api_router.include_router(filters_router.router)
api_router.include_router(test_router.router)
api_router.include_router(contribuie_router.router)
api_router.include_router(case_router.router)
api_router.include_router(modele_router.router)

app.include_router(api_router)


@app.get("/health")
def health():
    return {"status": "ok"}
