"""
app/main.py — FastAPI application factory with lifespan, CORS, scheduler, and routers.
"""
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

from app.core.config import get_settings
from app.core.database import init_db, AsyncSessionLocal
from app.core.logging import setup_logging, get_logger
from app.api import protocols, analytics, alerts

settings = get_settings()
logger = get_logger(__name__)

scheduler = AsyncIOScheduler()
_last_pipeline_run: datetime | None = None


async def _run_pipeline_job():
    global _last_pipeline_run
    from app.analytics.pipeline import run_pipeline
    async with AsyncSessionLocal() as db:
        try:
            result = await run_pipeline(db)
            _last_pipeline_run = datetime.now(timezone.utc)
            logger.info("scheduled_pipeline_done", **result)
        except Exception as e:
            logger.error("scheduled_pipeline_error", error=str(e))


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ──────────────────────────────────────────
    setup_logging(debug=settings.debug)
    logger.info("startup", environment=settings.environment)

    await init_db()
    logger.info("database_initialized")

    # Kick off an immediate data load, then schedule recurring refreshes
    scheduler.add_job(
        _run_pipeline_job,
        trigger=IntervalTrigger(minutes=settings.data_refresh_interval_minutes),
        id="data_pipeline",
        replace_existing=True,
        next_run_time=datetime.now(timezone.utc),   # run immediately on start
    )

    # Daily digest at 08:00 UTC
    from apscheduler.triggers.cron import CronTrigger

    async def _daily_digest_job():
        from app.services.alert_dispatcher import send_daily_digest
        async with AsyncSessionLocal() as db:
            try:
                await send_daily_digest(db)
                logger.info("daily_digest_sent")
            except Exception as e:
                logger.error("daily_digest_error", error=str(e))

    scheduler.add_job(
        _daily_digest_job,
        trigger=CronTrigger(hour=8, minute=0, timezone="UTC"),
        id="daily_digest",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("scheduler_started", interval_minutes=settings.data_refresh_interval_minutes)

    yield

    # ── Shutdown ─────────────────────────────────────────
    scheduler.shutdown(wait=False)
    from app.services.defillama import defillama_service
    from app.services.coingecko import coingecko_service
    await defillama_service.close()
    await coingecko_service.close()
    logger.info("shutdown_complete")


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        version="1.0.0",
        description="DeFi Protocol Revenue & Sustainability Analytics API",
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    # ── CORS ─────────────────────────────────────────────
    # ── CORS ─────────────────────────────────────────────
    origins = ["*"]

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
if settings.environment == "production":
    origins = [
        settings.frontend_url,
        "https://frontend-theta-nine-77.vercel.app",
        "https://frontend-fhfgbzvps-adewuys-projects.vercel.app",
    ]

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Routers ──────────────────────────────────────────
    app.include_router(protocols.router)
    app.include_router(analytics.router)
    app.include_router(alerts.router)

    # ── Health check ─────────────────────────────────────
    @app.get("/api/health", tags=["health"])
    async def health():
        from app.services.telegram import telegram_service
        from app.services.dune import dune_service
        from app.api.schemas import HealthResponse
        return HealthResponse(
            status="ok",
            environment=settings.environment,
            database="connected",
            telegram_configured=telegram_service.is_enabled,
            dune_configured=dune_service.is_enabled,
            last_pipeline_run=_last_pipeline_run,
        )

    @app.post("/api/pipeline/run", tags=["admin"])
    async def trigger_pipeline():
        """Manually trigger a data pipeline run."""
        await _run_pipeline_job()
        return {"status": "triggered", "ran_at": _last_pipeline_run}

    return app


app = create_app()
