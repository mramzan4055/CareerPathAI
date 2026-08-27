"""
Application Assistant — Controlled Auto-Apply with Consent and Audit Trail.

Replaces the old "24/7 Auto Apply" concept with a user-controlled, auditable
flow that respects per-user daily limits and records every action.

Key principles (from spec):
  • User must give explicit consent before any application is submitted.
  • Daily limit enforced per user (default 10, configurable per profile).
  • Every state transition is written to the audit log.
  • No action taken unless job URL is present and consent flag is True.
"""

from __future__ import annotations

import logging
from datetime import date, datetime, timezone
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from auth import get_current_user_id
from database import get_supabase

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/applications", tags=["Application Assistant"])

DEFAULT_DAILY_LIMIT = 10


# ── Pydantic models ─────────────────────────────────────────────────────────

class ApplyRequest(BaseModel):
    job_id: str
    consent: bool  # must be True to proceed
    notes: Optional[str] = None
    cover_letter_id: Optional[str] = None


class ApplicationStatusUpdate(BaseModel):
    status: Literal["applied", "interviewing", "offer", "rejected", "withdrawn"]
    notes: Optional[str] = None


class ApplicationResponse(BaseModel):
    status: str
    message: str
    application_id: Optional[str] = None


# ── Helpers ─────────────────────────────────────────────────────────────────

def _today_iso() -> str:
    return date.today().isoformat()


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _write_audit(supabase, user_id: str, action: str, details: dict) -> None:
    """Append one row to the audit_log table (best-effort — never raises)."""
    try:
        supabase.table("audit_log").insert({
            "user_id": user_id,
            "action": action,
            "details": details,
            "created_at": _now_iso(),
        }).execute()
    except Exception as exc:
        logger.warning("Audit log write failed: %s", exc)


def _daily_apply_count(supabase, user_id: str) -> int:
    """Count how many applications the user has submitted today."""
    try:
        resp = (
            supabase.table("saved_jobs")
            .select("id", count="exact")
            .eq("user_id", user_id)
            .eq("status", "applied")
            .gte("status_updated_at", _today_iso())
            .execute()
        )
        return resp.count or 0
    except Exception:
        return 0


def _get_daily_limit(supabase, user_id: str) -> int:
    """Fetch the user's configured daily apply limit (defaults to 10)."""
    try:
        resp = (
            supabase.table("profiles")
            .select("daily_apply_limit")
            .eq("id", user_id)
            .maybe_single()
            .execute()
        )
        if resp and resp.data and resp.data.get("daily_apply_limit"):
            return int(resp.data["daily_apply_limit"])
    except Exception:
        pass
    return DEFAULT_DAILY_LIMIT


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/apply", response_model=ApplicationResponse)
async def apply_to_job(
    request: ApplyRequest,
    current_user_id: str = Depends(get_current_user_id),
):
    """
    Controlled apply action.

    Workflow:
      1. Verify user consent (``consent: true`` required).
      2. Check daily application limit.
      3. Verify the job exists and has a URL.
      4. Ensure the job is in the user's saved list (auto-save if missing).
      5. Mark the saved_job as ``applied`` and write an audit record.

    The function does **not** submit anything to an external ATS automatically —
    it records the intent and provides the URL so the user (or a browser extension
    they authorise) can complete the submission.
    """
    if not request.consent:
        raise HTTPException(
            status_code=400,
            detail="Consent is required to proceed. Set consent=true to confirm you want to apply.",
        )

    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Database connection is not configured.")

    # ── Enforce daily limit ────────────────────────────────────────────────
    daily_limit = _get_daily_limit(supabase, current_user_id)
    today_count = _daily_apply_count(supabase, current_user_id)
    if today_count >= daily_limit:
        raise HTTPException(
            status_code=429,
            detail=(
                f"Daily application limit reached ({daily_limit}/day). "
                "Increase your limit in Profile → Preferences or wait until tomorrow."
            ),
        )

    # ── Fetch job record ───────────────────────────────────────────────────
    job_resp = (
        supabase.table("jobs")
        .select("id, job_title, company, url")
        .eq("id", request.job_id)
        .maybe_single()
        .execute()
    )
    if not job_resp or not job_resp.data:
        raise HTTPException(status_code=404, detail="Job not found.")

    job = job_resp.data
    if not job.get("url"):
        raise HTTPException(
            status_code=422,
            detail="This job listing has no application URL. Please apply manually.",
        )

    # ── Ensure job is in saved_jobs ────────────────────────────────────────
    saved_resp = (
        supabase.table("saved_jobs")
        .select("id, status")
        .eq("user_id", current_user_id)
        .eq("job_id", request.job_id)
        .maybe_single()
        .execute()
    )

    saved_id: Optional[str] = None
    if saved_resp and saved_resp.data:
        saved_id = saved_resp.data["id"]
    else:
        # Auto-save
        insert_resp = supabase.table("saved_jobs").insert({
            "user_id": current_user_id,
            "job_id": request.job_id,
            "status": "saved",
        }).execute()
        if insert_resp.data:
            saved_id = insert_resp.data[0]["id"]

    if not saved_id:
        raise HTTPException(status_code=500, detail="Could not create saved job record.")

    # ── Mark as applied ────────────────────────────────────────────────────
    now = _now_iso()
    update_payload: dict = {"status": "applied", "status_updated_at": now}
    if request.notes:
        update_payload["notes"] = request.notes

    supabase.table("saved_jobs").update(update_payload).eq("id", saved_id).execute()

    # ── Audit log ──────────────────────────────────────────────────────────
    _write_audit(supabase, current_user_id, "apply_intent", {
        "job_id": request.job_id,
        "saved_job_id": saved_id,
        "job_title": job.get("job_title"),
        "company": job.get("company"),
        "cover_letter_id": request.cover_letter_id,
        "consent_given": True,
        "daily_count_before": today_count,
        "daily_limit": daily_limit,
        "timestamp": now,
    })

    return ApplicationResponse(
        status="success",
        message=(
            f"Application recorded for {job['job_title']} at {job['company']}. "
            f"Open the URL to complete submission: {job['url']}"
        ),
        application_id=saved_id,
    )


@router.get("/")
async def list_applications(
    status_filter: Optional[str] = Query(None, description="Filter by status: applied | interviewing | offer | rejected | withdrawn"),
    current_user_id: str = Depends(get_current_user_id),
):
    """List the current user's job applications with optional status filter."""
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Database connection is not configured.")

    try:
        q = (
            supabase.table("saved_jobs")
            .select("id, created_at, status, notes, status_updated_at, jobs(id, job_title, company, location, url)")
            .eq("user_id", current_user_id)
            .neq("status", "saved")  # only rows that have moved beyond 'saved'
            .order("status_updated_at", desc=True)
        )
        if status_filter:
            q = q.eq("status", status_filter)

        resp = q.execute()
        return {"status": "success", "data": resp.data or []}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to fetch applications: {str(exc)}")


@router.patch("/{saved_job_id}/status")
async def update_application_status(
    saved_job_id: str,
    request: ApplicationStatusUpdate,
    current_user_id: str = Depends(get_current_user_id),
):
    """Update the status of an application and append an audit log entry."""
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Database connection is not configured.")

    try:
        existing = (
            supabase.table("saved_jobs")
            .select("user_id, status, job_id")
            .eq("id", saved_job_id)
            .maybe_single()
            .execute()
        )
        if not existing or not existing.data:
            raise HTTPException(status_code=404, detail="Application not found.")
        if existing.data.get("user_id") != current_user_id:
            raise HTTPException(status_code=403, detail="Access denied.")

        old_status = existing.data.get("status")
        now = _now_iso()
        payload: dict = {"status": request.status, "status_updated_at": now}
        if request.notes is not None:
            payload["notes"] = request.notes

        supabase.table("saved_jobs").update(payload).eq("id", saved_job_id).execute()

        _write_audit(supabase, current_user_id, "status_change", {
            "saved_job_id": saved_job_id,
            "job_id": existing.data.get("job_id"),
            "from_status": old_status,
            "to_status": request.status,
            "timestamp": now,
        })

        return {"status": "success", "message": f"Status updated to '{request.status}'"}

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to update status: {str(exc)}")


@router.get("/audit-log")
async def get_audit_log(
    limit: int = Query(50, ge=1, le=200),
    current_user_id: str = Depends(get_current_user_id),
):
    """Retrieve the calling user's application audit log (most recent first)."""
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Database connection is not configured.")

    try:
        resp = (
            supabase.table("audit_log")
            .select("id, action, details, created_at")
            .eq("user_id", current_user_id)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        return {"status": "success", "data": resp.data or []}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to fetch audit log: {str(exc)}")


@router.get("/stats")
async def application_stats(current_user_id: str = Depends(get_current_user_id)):
    """Return aggregate application statistics for the current user."""
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Database connection is not configured.")

    try:
        resp = (
            supabase.table("saved_jobs")
            .select("status")
            .eq("user_id", current_user_id)
            .execute()
        )
        rows = resp.data or []

        counts: dict[str, int] = {}
        for row in rows:
            s = row.get("status", "saved")
            counts[s] = counts.get(s, 0) + 1

        daily_limit = _get_daily_limit(supabase, current_user_id)
        today_count = _daily_apply_count(supabase, current_user_id)

        return {
            "status": "success",
            "total_saved": len(rows),
            "by_status": counts,
            "today_applied": today_count,
            "daily_limit": daily_limit,
            "remaining_today": max(0, daily_limit - today_count),
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to fetch stats: {str(exc)}")
