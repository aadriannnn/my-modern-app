import logging
import traceback
from fastapi import FastAPI, Request, APIRouter
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi.middleware.cors import CORSMiddleware
from .config import get_settings
from .db import init_db, get_session

from .routers import (
    search as main_router,
    equivalents,
    filters as filters_router,
    test as test_router,
    contribuie as contribuie_router,
    case as case_router,
    modele as modele_router,
    coduri as coduri_router,
    auth as auth_router,
    settings as settings_router,
    queue_status as queue_router,
    feedback as feedback_router,
    advanced_analysis as advanced_analysis_router,
    dosar_search_router,
    billing_routes as billing_router,
    taxa_timbru_routes as taxa_timbru_router,
    legal_news_routes,
    lawyer_assistance,
    contact_routes,
    dosar as dosar_router
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

# Mount 'data' directory to serve static files (e.g. legal news images)
# backend/app/main.py -> parent=app -> parent=backend -> / data
data_dir = Path(__file__).resolve().parent.parent / "data"
if data_dir.exists():
    app.mount("/data", StaticFiles(directory=data_dir), name="data")
else:
    logger.warning(f"Data directory not found for static mounting: {data_dir}")

from starlette.middleware.sessions import SessionMiddleware

app.add_middleware(ExceptionLoggingMiddleware)
app.add_middleware(
    SessionMiddleware,
    secret_key=settings.SECRET_KEY,
    https_only=settings.SECURE_COOKIE
)
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
    logger.info("Step 1: Initializing database (creating all tables including materie_statistics)...")
    init_db()
    logger.info("Step 1: Database initialization complete. All tables created.")

    logger.info("Step 2: Ensuring subscription fields exist (migration check)...")
    with next(get_session()) as session:
        from .lib.subscription_migration import ensure_subscription_fields, migrate_existing_pro_users
        ensure_subscription_fields(session)
        migrate_existing_pro_users(session)
    logger.info("Step 2: Subscription fields verified and existing users migrated.")

    logger.info("Step 2.1: Ensuring user verification fields exist...")
    with next(get_session()) as session:
        from .lib.upgrade_user_schema import ensure_user_verification_fields
        ensure_user_verification_fields(session)
    logger.info("Step 2.1: User verification fields verified.")

    logger.info("Step 2.2: Ensuring legislation schema fields exist...")
    with next(get_session()) as session:
        from .lib.upgrade_legislation_schema import ensure_legislation_fields
        ensure_legislation_fields(session)
    logger.info("Step 2.2: Legislation schema verified.")


    logger.info("Step 4: Starting queue manager worker...")
    from .logic.queue_manager import queue_manager
    queue_manager.start_worker()
    logger.info("Step 4: Queue manager worker started.")

    logger.info("Step 5: Seeding legal news data...")
    with next(get_session()) as session:
        from .lib.news_seeder import seed_news_data
        seed_news_data(session)
    logger.info("Step 5: Legal news data seeded.")

    logger.info("--- Backend Startup Sequence Finished ---")


# API router
print(f"DEBUG: settings router prefix: {settings_router.router.prefix}")
print(f"DEBUG: settings router file: {settings_router.__file__}")

api_router = APIRouter(prefix="/api")
api_router.include_router(main_router.router)
api_router.include_router(equivalents.router)
api_router.include_router(filters_router.router)
api_router.include_router(test_router.router)
api_router.include_router(contribuie_router.router)
api_router.include_router(case_router.router)
api_router.include_router(modele_router.router)
api_router.include_router(coduri_router.router)
api_router.include_router(auth_router.router)
api_router.include_router(settings_router.router)
api_router.include_router(queue_router.router)
api_router.include_router(feedback_router.router)
api_router.include_router(advanced_analysis_router.router)
api_router.include_router(dosar_search_router)
api_router.include_router(billing_router.router)
api_router.include_router(taxa_timbru_router.router)
api_router.include_router(legal_news_routes)
api_router.include_router(lawyer_assistance.router)
api_router.include_router(contact_routes.router)
api_router.include_router(dosar_router.router)

from .routers import dev_tools
api_router.include_router(dev_tools.router, prefix="/dev", tags=["dev"])

app.include_router(api_router)


@app.get("/health")
def health():
    return {"status": "ok"}
