"""
KaamYabi AI — FastAPI Application Entry Point (v2.1 Zero-Cost Edition)

Zero-cost job sources enabled by default:
  • Arbeitnow public API   (no key required)
  • Jobicy public API      (no key required)
  • Greenhouse ATS boards  (no key required — public board feeds)
  • Lever ATS postings     (no key required — public postings API)
  • Adzuna API             (optional — requires ADZUNA_APP_ID/KEY env vars)

All LLM features (CV parsing, skill-gap, cover letters) work with either
GROQ_API_KEY or GEMINI_API_KEY; the app starts and serves job search even
when neither key is present.

Background scheduler (APScheduler) syncs job sources every 6 hours
and runs housekeeping tasks (notification pruner, export expiry) daily.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings, validate_keys
from routers import applications, cover_letters, cv, jobs, learning_plans, skills, notifications, data_rights
from scheduler import setup_scheduler, scheduler

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle for background scheduler."""
    # ── Startup ──────────────────────────────────────────────────────────
    validate_keys()   # emit config warnings, never raises
    setup_scheduler()
    scheduler.start()
    logger.info("APScheduler started — %d job(s) registered", len(scheduler.get_jobs()))
    yield
    # ── Shutdown ─────────────────────────────────────────────────────────
    scheduler.shutdown(wait=False)
    logger.info("APScheduler stopped")


app = FastAPI(
    title="KaamYabi AI — CareerPath AI Backend",
    description=(
        "Zero-cost career platform API.\n\n"
        "**Job sources**: Arbeitnow · Jobicy · Greenhouse · Lever (all free) · Adzuna (optional key)\n\n"
        "**LLM features**: Groq (preferred) · Gemini (fallback)\n\n"
        "**Scheduler**: APScheduler syncs job sources every 6 hours automatically.\n\n"
        "All routes except `GET /` and `GET /jobs/find` require a Supabase Bearer token."
    ),
    version="2.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS — restricted to configured frontend origin(s)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.frontend_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(cv.router)
app.include_router(jobs.router)
app.include_router(skills.router)
app.include_router(learning_plans.router)
app.include_router(cover_letters.router)
app.include_router(applications.router)
app.include_router(notifications.router)
app.include_router(data_rights.router)


@app.get("/", tags=["Health"])
def health_check():
    """
    Health check endpoint.

    Returns configuration status so operators can verify which features
    are available without exposing secret values.
    """
    from scheduler import get_scheduler_status
    return {
        "status": "online",
        "version": "2.1.0",
        "service": "KaamYabi AI — CareerPath AI Backend",
        "features": {
            "job_search": True,  # always on — uses Arbeitnow + Jobicy + Greenhouse + Lever
            "llm_parsing": settings.has_llm,
            "adzuna_enabled": settings.has_adzuna,
            "database": settings.has_supabase,
            "scheduler": get_scheduler_status(),
        },
    }
