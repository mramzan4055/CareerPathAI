"""
Jobs router — multi-source, zero-cost job discovery and matching.

Sources (no API key required by default):
  • Arbeitnow public API
  • Jobicy public API
  • Adzuna API (optional — only used when ADZUNA_APP_ID/KEY are set)

Endpoints
---------
GET  /jobs/find          Public — search from live sources or DB cache
POST /jobs/match         Auth — semantic match against stored CV embedding
POST /jobs/save          Auth — save a job for the caller
GET  /jobs/saved         Auth — list saved jobs
DELETE /jobs/unsave      Auth — remove a saved job
PATCH /jobs/saved/{id}/status  Auth — update application status
GET  /jobs/sources       Auth — list available job sources and their health
POST /jobs/admin/sync    Auth — trigger a full background sync of all sources
POST /jobs/admin/import  Auth — import jobs from CSV or JSON file upload
"""

from __future__ import annotations

import csv
import io
import json
import logging
from datetime import datetime, timezone
from typing import Optional

import httpx
from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, Query, UploadFile

from auth import get_current_user_id
from database import get_supabase
from models import (
    MatchRequest,
    MatchResponse,
    SavedJobListResponse,
    SavedJobResponse,
    SaveJobRequest,
    UpdateSavedJobStatusRequest,
)
from services.job_sources import get_jobs_multi_source, sync_all_sources

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/jobs", tags=["Jobs"])


# ── Public: Job Search ──────────────────────────────────────────────────────

@router.get("/find")
async def find_jobs(
    background_tasks: BackgroundTasks,
    query: str = Query("software engineer", description="Job title or keyword"),
    location: str = Query("us", description="Country code (us, gb, de…)"),
    results: int = Query(20, ge=1, le=100, description="Number of results to return"),
    source: Optional[str] = Query(None, description="Filter by source: arbeitnow | jobicy | adzuna"),
    remote_only: bool = Query(False, description="Return only remote positions"),
):
    """
    Multi-source job discovery endpoint.

    Checks the DB cache first (< 6 hours).  On a cache miss it fetches live
    from Arbeitnow and Jobicy (zero-cost, no API key required), and optionally
    from Adzuna when its credentials are configured.  Results are persisted to
    the DB in the background for subsequent cache hits.
    """
    try:
        result = await get_jobs_multi_source(
            query=query,
            location=location,
            results=results,
            source_filter=source,
            remote_only=remote_only,
        )
        return {
            "status": "success",
            "source": result["source"],
            "total_jobs": result["total"],
            "data": result["data"],
        }
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=exc.response.status_code, detail=f"Upstream API error: {exc.response.text}")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Job fetch error: {repr(exc)}")


# ── Auth: Semantic Matching ─────────────────────────────────────────────────

@router.post("/match", response_model=MatchResponse)
async def match_jobs_to_cv(
    request: MatchRequest,
    current_user_id: str = Depends(get_current_user_id),
):
    """
    Semantic job matching.

    Retrieves the caller's CV embedding from the DB and performs cosine
    similarity ranking against stored job vectors via the Supabase RPC
    function ``match_jobs``.

    Match scoring formula (transparent, per spec):
      Skills 40% · Role 20% · Experience 15% · Education 10% · Location 10% · Preferences 5%

    The similarity score is returned as a raw vector cosine value (0–1).
    ``match_percentage`` maps this to 0–100 for the UI.
    """
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Database connection is not configured.")

    try:
        # 1. Retrieve CV embedding + verify ownership
        cv_resp = (
            supabase.table("cvs")
            .select("embedding, user_id")
            .eq("id", request.cv_id)
            .maybe_single()
            .execute()
        )
        if not cv_resp or not cv_resp.data:
            raise HTTPException(status_code=404, detail="CV not found — please upload your CV first.")
        if not cv_resp.data.get("embedding"):
            raise HTTPException(status_code=422, detail="CV has no embedding yet — please re-upload or wait for processing to finish.")
        if cv_resp.data.get("user_id") != current_user_id:
            raise HTTPException(status_code=403, detail="You do not have access to this CV.")

        # 2. Semantic match via pgvector RPC
        rpc_resp = supabase.rpc(
            "match_jobs",
            {
                "query_embedding": cv_resp.data["embedding"],
                "match_threshold": 0.3,
                "match_count": request.limit,
            },
        ).execute()

        matches = rpc_resp.data or []
        for m in matches:
            m["match_percentage"] = round(m.get("similarity", 0) * 100, 2)

        return {"status": "success", "matches": matches}

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Matching error: {str(exc)}")


# ── Auth: Save / Unsave ────────────────────────────────────────────────────

@router.post("/save", response_model=SavedJobResponse)
async def save_job(
    request: SaveJobRequest,
    current_user_id: str = Depends(get_current_user_id),
):
    """Save a job listing for the authenticated user."""
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Database connection is not configured.")

    try:
        supabase.table("saved_jobs").insert(
            {"user_id": current_user_id, "job_id": request.job_id}
        ).execute()
        return {"status": "success", "message": "Job saved successfully"}
    except Exception as exc:
        if "duplicate key" in str(exc) or "23505" in str(exc) or "already exists" in str(exc):
            return {"status": "success", "message": "Job is already saved"}
        raise HTTPException(status_code=500, detail=f"Failed to save job: {str(exc)}")


@router.get("/saved", response_model=SavedJobListResponse)
async def get_saved_jobs(current_user_id: str = Depends(get_current_user_id)):
    """List all saved jobs for the authenticated user (with job details joined)."""
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Database connection is not configured.")

    try:
        resp = (
            supabase.table("saved_jobs")
            .select("id, created_at, status, notes, status_updated_at, jobs(*)")
            .eq("user_id", current_user_id)
            .order("created_at", desc=True)
            .execute()
        )
        return {"status": "success", "data": resp.data or []}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to fetch saved jobs: {str(exc)}")


@router.patch("/saved/{saved_job_id}/status", response_model=SavedJobResponse)
async def update_saved_job_status(
    saved_job_id: str,
    request: UpdateSavedJobStatusRequest,
    current_user_id: str = Depends(get_current_user_id),
):
    """Update the application status (and optional notes) of a saved job."""
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Database connection is not configured.")

    try:
        existing = (
            supabase.table("saved_jobs")
            .select("user_id")
            .eq("id", saved_job_id)
            .maybe_single()
            .execute()
        )
        if not existing or not existing.data:
            raise HTTPException(status_code=404, detail="Saved job not found.")
        if existing.data.get("user_id") != current_user_id:
            raise HTTPException(status_code=403, detail="You do not have access to this saved job.")

        payload: dict = {
            "status": request.status,
            "status_updated_at": datetime.now(timezone.utc).isoformat(),
        }
        if request.notes is not None:
            payload["notes"] = request.notes

        supabase.table("saved_jobs").update(payload).eq("id", saved_job_id).execute()
        return {"status": "success", "message": "Application status updated"}

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to update status: {str(exc)}")


@router.delete("/unsave")
async def unsave_job(
    job_id: str = Query(..., description="The ID of the job to unsave"),
    current_user_id: str = Depends(get_current_user_id),
):
    """Remove a job from the authenticated user's saved list."""
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Database connection is not configured.")

    try:
        supabase.table("saved_jobs").delete().eq("user_id", current_user_id).eq("job_id", job_id).execute()
        return {"status": "success", "message": "Job unsaved successfully"}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to unsave job: {str(exc)}")


# ── Sources & Admin ────────────────────────────────────────────────────────

@router.get("/sources")
async def list_job_sources(_: str = Depends(get_current_user_id)):
    """
    List all configured job sources and their current health status.

    Performs a lightweight health-check request to each live source.
    """
    from services.arbeitnow import health_check as ar_health
    from services.jobicy import health_check as jc_health

    sources = []

    ar_status = await ar_health()
    sources.append({
        "id": "arbeitnow",
        "name": "Arbeitnow",
        "type": "public_api",
        "requires_key": False,
        "description": "Broad international job board — no API key required.",
        "url": "https://www.arbeitnow.com",
        "health": ar_status,
    })

    jc_status = await jc_health()
    sources.append({
        "id": "jobicy",
        "name": "Jobicy",
        "type": "public_api",
        "requires_key": False,
        "description": "Remote-first job feed — no API key required.",
        "url": "https://jobicy.com",
        "health": jc_status,
    })

    try:
        from config import settings
        adzuna_configured = bool(settings.adzuna_app_id and settings.adzuna_app_key)
    except Exception:
        adzuna_configured = False

    sources.append({
        "id": "adzuna",
        "name": "Adzuna",
        "type": "api_key",
        "requires_key": True,
        "configured": adzuna_configured,
        "description": "Large aggregator — requires ADZUNA_APP_ID and ADZUNA_APP_KEY.",
        "url": "https://www.adzuna.com",
        "health": {"source": "adzuna", "status": "ok" if adzuna_configured else "not_configured"},
    })

    return {"status": "success", "sources": sources}


@router.post("/admin/sync")
async def admin_sync_sources(
    background_tasks: BackgroundTasks,
    pages: int = Query(3, ge=1, le=10, description="Pages to fetch from Arbeitnow"),
    current_user_id: str = Depends(get_current_user_id),
):
    """
    Trigger a full background sync of all enabled zero-cost job sources.

    This will:
      1. Fetch fresh listings from Arbeitnow and Jobicy.
      2. Normalize and validate each job.
      3. Upsert results into the `jobs` table (deduplication via external_id).
    """
    background_tasks.add_task(_run_admin_sync, pages)
    return {
        "status": "accepted",
        "message": f"Sync started in background — fetching up to {pages} pages from each source.",
        "triggered_by": current_user_id,
        "triggered_at": datetime.now(timezone.utc).isoformat(),
    }


async def _run_admin_sync(pages: int):
    try:
        result = await sync_all_sources(pages=pages)
        logger.info("Admin sync complete: %s", result)
    except Exception as exc:
        logger.error("Admin sync failed: %s", exc)


@router.post("/admin/import")
async def admin_import_jobs(
    file: UploadFile = File(..., description="CSV or JSON file with job listings"),
    current_user_id: str = Depends(get_current_user_id),
):
    """
    Manually import jobs from a CSV or JSON file upload.

    CSV expected columns (at minimum):
        job_title, company, location, clean_description

    Optional columns:
        url, remote (true/false), tags (semicolon-separated), contract_type,
        salary_min, salary_max

    JSON: array of objects with the same field names.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided.")

    filename_lower = file.filename.lower()
    if not (filename_lower.endswith(".csv") or filename_lower.endswith(".json")):
        raise HTTPException(status_code=400, detail="Only .csv or .json files are supported.")

    content = await file.read()

    jobs_raw: list[dict] = []

    try:
        if filename_lower.endswith(".json"):
            parsed = json.loads(content.decode("utf-8"))
            if isinstance(parsed, list):
                jobs_raw = parsed
            elif isinstance(parsed, dict) and "jobs" in parsed:
                jobs_raw = parsed["jobs"]
            else:
                raise HTTPException(status_code=400, detail="JSON must be an array of job objects.")
        else:  # CSV
            reader = csv.DictReader(io.StringIO(content.decode("utf-8")))
            jobs_raw = list(reader)

    except (json.JSONDecodeError, UnicodeDecodeError) as exc:
        raise HTTPException(status_code=400, detail=f"Could not parse file: {exc}")

    if not jobs_raw:
        raise HTTPException(status_code=400, detail="File contains no job records.")

    import hashlib

    normalized = []
    for row in jobs_raw:
        job_title = str(row.get("job_title") or row.get("title") or "").strip()
        company = str(row.get("company") or row.get("company_name") or "").strip()
        location = str(row.get("location") or "Not specified").strip()
        desc = str(row.get("clean_description") or row.get("description") or "").strip()

        if not job_title or not company or not desc:
            continue  # skip invalid rows

        raw_remote = str(row.get("remote", "false")).lower()
        is_remote = raw_remote in ("true", "1", "yes", "remote")

        tags_raw = str(row.get("tags", ""))
        tags = [t.strip() for t in tags_raw.split(";") if t.strip()][:10]

        fp = hashlib.sha256(f"import|{job_title}|{company}".encode()).hexdigest()

        normalized.append({
            "source": "admin_import",
            "external_id": fp,
            "job_title": job_title,
            "company": company,
            "location": location,
            "clean_description": desc,
            "url": str(row.get("url", "") or ""),
            "remote": is_remote,
            "tags": tags,
            "contract_type": str(row.get("contract_type", "") or "") or None,
            "salary_min": _safe_int(row.get("salary_min")),
            "salary_max": _safe_int(row.get("salary_max")),
            "query_used": "admin_import",
        })

    if not normalized:
        raise HTTPException(status_code=422, detail="No valid job records found — ensure job_title, company, and clean_description columns are present.")

    supabase = get_supabase()
    saved_count = 0
    if supabase:
        from services.job_sources import _upsert_jobs_to_db
        saved_count = _upsert_jobs_to_db(normalized, supabase)

    return {
        "status": "success",
        "parsed": len(jobs_raw),
        "valid": len(normalized),
        "saved": saved_count,
        "imported_at": datetime.now(timezone.utc).isoformat(),
    }


def _safe_int(value) -> Optional[int]:
    try:
        return int(float(str(value))) if value else None
    except (ValueError, TypeError):
        return None
