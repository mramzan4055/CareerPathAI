"""
CareerPath AI — Background job scheduler (v2.1 Zero-Cost Edition)

Uses APScheduler (AsyncIOScheduler) to run periodic tasks:
  • Job source sync    — every 6 hours (matches CACHE_TTL_HOURS)
  • Notification pruner — daily at 03:00 UTC (deletes read notifs > 30 days old)

The scheduler is started/stopped as part of the FastAPI application lifespan
(see main.py). It runs in the same event loop as the FastAPI server so that
async service functions (arbeitnow.sync, jobicy.sync, etc.) can be called
directly without spinning up additional threads.

Zero-cost guarantee: all scheduled tasks use only the free public APIs.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

logger = logging.getLogger(__name__)

# ── Singleton scheduler instance ──────────────────────────────────────────
scheduler = AsyncIOScheduler(timezone="UTC")


# ── Scheduled job callbacks ────────────────────────────────────────────────

async def _sync_all_sources_job() -> None:
    """
    Periodic full sync of all zero-cost job sources.
    Called every SYNC_INTERVAL_HOURS hours.
    Errors are caught and logged; the scheduler continues regardless.
    """
    logger.info("[Scheduler] Starting periodic job-source sync — %s", datetime.now(timezone.utc).isoformat())
    try:
        # Import here to avoid circular deps at module-load time
        from services.job_sources import sync_all_sources
        result = await sync_all_sources(pages=3)
        logger.info("[Scheduler] Sync complete: %s", result)
    except Exception as exc:
        logger.error("[Scheduler] Sync failed: %s", exc, exc_info=True)


async def _prune_old_notifications_job() -> None:
    """
    Daily pruner: delete read notifications older than 30 days.
    This keeps the notifications table small without a manual vacuum.
    """
    logger.info("[Scheduler] Pruning old notifications — %s", datetime.now(timezone.utc).isoformat())
    try:
        from database import get_supabase
        supabase = get_supabase()
        if not supabase:
            logger.warning("[Scheduler] No Supabase client — skipping notification prune")
            return

        from datetime import timedelta
        cutoff = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
        result = (
            supabase.table("notifications")
            .delete()
            .eq("read", True)
            .lt("created_at", cutoff)
            .execute()
        )
        deleted = len(result.data) if result.data else 0
        logger.info("[Scheduler] Pruned %d old notifications", deleted)
    except Exception as exc:
        logger.error("[Scheduler] Notification prune failed: %s", exc, exc_info=True)


async def _expire_old_export_requests_job() -> None:
    """
    Daily: mark data-export requests older than 7 days as 'expired'.
    """
    logger.info("[Scheduler] Expiring old data-export requests")
    try:
        from database import get_supabase
        from datetime import timedelta
        supabase = get_supabase()
        if not supabase:
            return

        cutoff = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
        supabase.table("data_export_requests").update({"status": "expired"}).eq(
            "status", "ready"
        ).lt("created_at", cutoff).execute()
        logger.info("[Scheduler] Export-request expiry done")
    except Exception as exc:
        logger.error("[Scheduler] Export-request expiry failed: %s", exc, exc_info=True)


# ── Setup & lifecycle ──────────────────────────────────────────────────────

SYNC_INTERVAL_HOURS = 6  # matches CACHE_TTL_HOURS in job_sources.py


def setup_scheduler() -> AsyncIOScheduler:
    """
    Register all jobs and return the configured scheduler.
    Call this once before `scheduler.start()`.
    """
    # ── Job-source sync every 6 hours ──────────────────────────────────────
    scheduler.add_job(
        _sync_all_sources_job,
        trigger=IntervalTrigger(hours=SYNC_INTERVAL_HOURS),
        id="sync_all_sources",
        name="Periodic job-source sync (all zero-cost APIs)",
        replace_existing=True,
        # Start immediately so the DB is populated on first boot, not 6 hours later
        next_run_time=datetime.now(timezone.utc),
    )

    # ── Notification pruner at 03:00 UTC every day ─────────────────────────
    scheduler.add_job(
        _prune_old_notifications_job,
        trigger=CronTrigger(hour=3, minute=0, timezone="UTC"),
        id="prune_notifications",
        name="Daily notification pruner",
        replace_existing=True,
    )

    # ── Export-request expiry at 03:30 UTC every day ───────────────────────
    scheduler.add_job(
        _expire_old_export_requests_job,
        trigger=CronTrigger(hour=3, minute=30, timezone="UTC"),
        id="expire_export_requests",
        name="Daily data-export request expiry",
        replace_existing=True,
    )

    logger.info(
        "[Scheduler] Registered %d job(s): %s",
        len(scheduler.get_jobs()),
        [j.id for j in scheduler.get_jobs()],
    )
    return scheduler


def get_scheduler_status() -> dict:
    """Return a JSON-serialisable status summary (for the /admin endpoint)."""
    jobs = []
    for job in scheduler.get_jobs():
        jobs.append({
            "id": job.id,
            "name": job.name,
            "next_run": job.next_run_time.isoformat() if job.next_run_time else None,
        })
    return {
        "running": scheduler.running,
        "jobs": jobs,
    }
