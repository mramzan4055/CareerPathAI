"""
Unified multi-source job fetcher.

Priority order (zero-cost, no scraping):
  1. Database cache (< 6 hours old)
  2. Arbeitnow public API  (no key)
  3. Jobicy public API     (no key)
  4. Adzuna API            (key optional — skipped when not configured)

Each source returns jobs in the canonical schema used by the DB / UI.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from database import get_supabase
from services.arbeitnow import run_full_sync as arbeitnow_sync
from services.jobicy import run_full_sync as jobicy_sync

logger = logging.getLogger(__name__)

CACHE_TTL_HOURS = 6  # how old DB records can be before we re-fetch


# ── helpers ────────────────────────────────────────────────────────────────

def _as_ui_job(row: dict) -> dict:
    """Reshape a DB row into the shape the UI/API expects."""
    return {
        "id": row.get("id"),
        "job_title": row.get("job_title", ""),
        "company": row.get("company", ""),
        "location": row.get("location", ""),
        "clean_description": row.get("clean_description", ""),
        "url": row.get("url"),
        "remote": row.get("remote", False),
        "tags": row.get("tags", []),
        "salary_min": row.get("salary_min"),
        "salary_max": row.get("salary_max"),
        "contract_type": row.get("contract_type"),
        "source": row.get("source", "unknown"),
        "external_id": row.get("external_id"),
    }


def _upsert_jobs_to_db(jobs: list[dict], supabase) -> int:
    """
    Insert/update normalized jobs into the `jobs` table.
    Uses external_id as the conflict resolution key so duplicate
    records are updated rather than re-inserted.
    Returns count of rows processed.
    """
    if not jobs or not supabase:
        return 0

    rows = []
    for j in jobs:
        rows.append({
            "job_title": j.get("job_title", ""),
            "company": j.get("company", ""),
            "location": j.get("location", ""),
            "clean_description": j.get("clean_description", ""),
            "url": j.get("url", ""),
            "remote": j.get("remote", False),
            "tags": j.get("tags", []),
            "salary_min": j.get("salary_min"),
            "salary_max": j.get("salary_max"),
            "contract_type": j.get("contract_type"),
            "source": j.get("source", "unknown"),
            "external_id": j.get("external_id"),
            "query_used": j.get("query_used", j.get("source", "unknown")),
        })

    try:
        # Use upsert with on_conflict on external_id (requires unique index in DB)
        resp = supabase.table("jobs").upsert(rows, on_conflict="external_id").execute()
        return len(resp.data) if resp.data else len(rows)
    except Exception as exc:
        logger.warning("DB upsert failed (falling back to insert): %s", exc)
        try:
            resp = supabase.table("jobs").insert(rows).execute()
            return len(resp.data) if resp.data else 0
        except Exception as exc2:
            logger.error("DB insert also failed: %s", exc2)
            return 0


# ── public API ─────────────────────────────────────────────────────────────

async def get_jobs_multi_source(
    query: str = "software engineer",
    location: str = "us",
    results: int = 20,
    source_filter: Optional[str] = None,   # "arbeitnow" | "jobicy" | "adzuna" | None
    remote_only: bool = False,
) -> dict:
    """
    Main entry-point called by the /jobs/find endpoint.

    Returns:
        {
            "source": str,
            "total": int,
            "data": [<job>, ...]
        }
    """
    supabase = get_supabase()

    # ── 1. Check DB cache ──────────────────────────────────────────────────
    if supabase:
        cutoff = (datetime.now(timezone.utc) - timedelta(hours=CACHE_TTL_HOURS)).isoformat()
        try:
            db_q = (
                supabase.table("jobs")
                .select(
                    "id, job_title, company, location, clean_description, "
                    "url, remote, tags, salary_min, salary_max, contract_type, "
                    "source, external_id"
                )
                .gte("created_at", cutoff)
            )
            if remote_only:
                db_q = db_q.eq("remote", True)
            if source_filter:
                db_q = db_q.eq("source", source_filter)

            db_resp = db_q.limit(results).execute()
            cached = db_resp.data or []

            if len(cached) >= max(1, results // 2):
                logger.info("Serving %d jobs from DB cache", len(cached))
                return {
                    "source": "database",
                    "total": len(cached),
                    "data": [_as_ui_job(r) for r in cached],
                }
        except Exception as exc:
            logger.warning("DB cache read error: %s", exc)

    # ── 2. Live fetch from free public sources ─────────────────────────────
    all_jobs: list[dict] = []

    if source_filter in (None, "arbeitnow"):
        try:
            ar_result = await arbeitnow_sync(pages=2)
            all_jobs.extend(ar_result["jobs"])
            logger.info("Arbeitnow contributed %d jobs", len(ar_result["jobs"]))
        except Exception as exc:
            logger.warning("Arbeitnow fetch error: %s", exc)

    if source_filter in (None, "jobicy"):
        try:
            jc_result = await jobicy_sync(count=50)
            all_jobs.extend(jc_result["jobs"])
            logger.info("Jobicy contributed %d jobs", len(jc_result["jobs"]))
        except Exception as exc:
            logger.warning("Jobicy fetch error: %s", exc)

    # ── 3. Optional Adzuna (key-gated) ────────────────────────────────────
    if source_filter in (None, "adzuna"):
        try:
            from config import settings
            if settings.adzuna_app_id and settings.adzuna_app_key:
                import httpx
                adzuna_url = f"https://api.adzuna.com/v1/api/jobs/{location}/search/1"
                params = {
                    "app_id": settings.adzuna_app_id,
                    "app_key": settings.adzuna_app_key,
                    "results_per_page": min(results, 20),
                    "what": query,
                    "content-type": "application/json",
                }
                async with httpx.AsyncClient(timeout=15) as client:
                    r = await client.get(adzuna_url, params=params)
                    r.raise_for_status()
                    for job in r.json().get("results", []):
                        all_jobs.append({
                            "source": "adzuna",
                            "external_id": f"adzuna_{job.get('id')}",
                            "job_title": job.get("title", ""),
                            "company": job.get("company", {}).get("display_name", ""),
                            "location": job.get("location", {}).get("display_name", ""),
                            "clean_description": job.get("description", "")[:2000],
                            "url": job.get("redirect_url", ""),
                            "remote": False,
                            "tags": [],
                            "salary_min": job.get("salary_min"),
                            "salary_max": job.get("salary_max"),
                            "contract_type": job.get("contract_type"),
                            "query_used": query.lower(),
                        })
                logger.info("Adzuna contributed jobs for query=%s", query)
        except Exception as exc:
            logger.warning("Adzuna fetch error (non-critical): %s", exc)

    # ── 4. Apply filters & limit ───────────────────────────────────────────
    if remote_only:
        all_jobs = [j for j in all_jobs if j.get("remote")]

    # Simple keyword match
    if query and query.lower() not in ("software engineer", "any", ""):
        q_lower = query.lower()
        all_jobs = [
            j for j in all_jobs
            if q_lower in j.get("job_title", "").lower()
            or q_lower in j.get("clean_description", "").lower()
            or any(q_lower in t.lower() for t in j.get("tags", []))
        ] or all_jobs  # fall back to unfiltered if nothing matches

    limited = all_jobs[:results]

    # ── 5. Persist to DB in background (best-effort) ───────────────────────
    if supabase and all_jobs:
        try:
            saved = _upsert_jobs_to_db(all_jobs, supabase)
            logger.info("Upserted %d jobs to DB", saved)
        except Exception as exc:
            logger.warning("Background DB upsert failed: %s", exc)

    sources_used = list({j.get("source", "unknown") for j in limited})
    return {
        "source": ", ".join(sources_used) if sources_used else "live",
        "total": len(limited),
        "data": [_as_ui_job(j) for j in limited],
    }


async def sync_all_sources(pages: int = 3) -> dict:
    """Admin-triggered full sync of all enabled zero-cost sources."""
    results = {}

    try:
        ar = await arbeitnow_sync(pages=pages)
        results["arbeitnow"] = {"fetched": ar["fetched"], "valid": ar["valid"]}
        supabase = get_supabase()
        if supabase and ar["jobs"]:
            saved = _upsert_jobs_to_db(ar["jobs"], supabase)
            results["arbeitnow"]["saved"] = saved
    except Exception as exc:
        results["arbeitnow"] = {"error": str(exc)}

    try:
        jc = await jobicy_sync(count=50)
        results["jobicy"] = {"fetched": jc["fetched"], "valid": jc["valid"]}
        supabase = get_supabase()
        if supabase and jc["jobs"]:
            saved = _upsert_jobs_to_db(jc["jobs"], supabase)
            results["jobicy"]["saved"] = saved
    except Exception as exc:
        results["jobicy"] = {"error": str(exc)}

    return {
        "status": "complete",
        "synced_at": datetime.now(timezone.utc).isoformat(),
        "sources": results,
    }
