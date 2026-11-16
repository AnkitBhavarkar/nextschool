import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.db.session import engine, AsyncSessionLocal
from app.db.base import Base
from app.core.bootstrap import bootstrap_initial_users
from app.api.routes import auth, teachers, admin, health, data_import, whatsapp_config

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure tables exist in dev & run bootstrap
    logger.info("Initializing database tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    logger.info("Running bootstrap accounts check...")
    async with AsyncSessionLocal() as session:
        await bootstrap_initial_users(session)
    logger.info("Application startup complete.")
    yield
    # Shutdown
    await engine.dispose()
    logger.info("Database engine disposed.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(health.router, tags=["Health"])
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["Authentication"])
app.include_router(teachers.router, prefix=f"{settings.API_V1_STR}/teachers", tags=["Teachers"])
app.include_router(admin.router, prefix=f"{settings.API_V1_STR}/admin", tags=["Admin"])
app.include_router(data_import.router, prefix=f"{settings.API_V1_STR}/admin/import", tags=["Data Import"])
app.include_router(whatsapp_config.router, prefix=f"{settings.API_V1_STR}/admin/whatsapp", tags=["WhatsApp Config"])

