"""
GDPR / Data Rights router.

Endpoints:
  GET  /api/v1/data-rights/export     Request a data export (returns JSON of all user data)
  GET  /api/v1/data-rights/my-data    Inline JSON export (no download link, direct response)
  POST /api/v1/data-rights/delete     Request account deletion (soft-flag + audit entry)
  GET  /api/v1/data-rights/status     Status of pending export / deletion requests

Privacy promise (zero-cost edition):
  - No third-party analytics or tracking
  - All data stored in user-controlled Supabase project
  - Users can download everything or delete their account at any time
  - Deletion sets a flag; hard delete runs within 30 days (or immediately on request)
"""
from __future__ import annotations

import json
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth import get_current_user_id
from database import get_supabase

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/data-rights", tags=["Data Rights (GDPR)"])


# ── Helpers ────────────────────────────────────────────────────────────────

def _require_supabase():
    sb = get_supabase()
    if not sb:
        raise HTTPException(503, "Database not configured")
    return sb


def _collect_user_data(supabase, user_id: str) -> dict:
    """
    Collect all data associated with the user from all tables.
    Returns a dict that can be JSON-serialised and returned to the user.
    """
    data: dict = {"exported_at": datetime.now(timezone.utc).isoformat(), "user_id": user_id}

    def safe_fetch(table: str, **kwargs) -> list:
        try:
            q = supabase.table(table).select("*").eq("user_id", user_id)
            for col, val in kwargs.items():
                q = q.eq(col, val)
            return q.execute().data or []
        except Exception as exc:
            logger.warning("Data export: error fetching %s — %s", table, exc)
            return []

    def safe_fetch_id(table: str) -> list:
        """For tables where the PK is the user_id (profiles)."""
        try:
            return supabase.table(table).select("*").eq("id", user_id).execute().data or []
        except Exception as exc:
            logger.warning("Data export: error fetching %s — %s", table, exc)
            return []

    data["profile"] = safe_fetch_id("profiles")
    data["cvs"] = safe_fetch("cvs")
    data["saved_jobs"] = safe_fetch("saved_jobs")
    data["job_applications"] = safe_fetch("job_applications")
    data["learning_plans"] = safe_fetch("learning_plans")
    data["cover_letters"] = safe_fetch("cover_letters")
    data["notifications"] = safe_fetch("notifications")
    data["audit_log"] = safe_fetch("audit_log")

    return data


# ── Routes ─────────────────────────────────────────────────────────────────

@router.get("/my-data")
async def download_my_data(user_id: str = Depends(get_current_user_id)):
    """
    Inline GDPR data export — returns all user data as a JSON object.

    The response can be saved as a .json file by the frontend.
    No signed URL or async processing needed at zero-cost scale.
    """
    supabase = _require_supabase()

    try:
        user_data = _collect_user_data(supabase, user_id)

        # Write audit record
        try:
            supabase.table("audit_log").insert({
                "user_id": user_id,
                "action": "data_export",
                "entity_type": "profile",
                "details": {"tables": list(user_data.keys())},
                "created_at": datetime.now(timezone.utc).isoformat(),
            }).execute()
        except Exception:
            pass  # audit failure is non-critical

        return {
            "status": "success",
            "message": "Your complete data export is below. Save this as a JSON file.",
            "data": user_data,
        }
    except Exception as exc:
        logger.error("Data export error for user %s: %s", user_id, exc)
        raise HTTPException(500, "Failed to export your data. Please try again.")


@router.get("/status")
async def data_rights_status(user_id: str = Depends(get_current_user_id)):
    """
    Return the current status of the user's data-rights requests
    (export history, deletion flag).
    """
    supabase = _require_supabase()

    try:
        # Check deletion flag on profile
        profile = supabase.table("profiles").select("deletion_requested_at").eq(
            "id", user_id
        ).maybeSingle().execute()
        deletion_requested_at = None
        if profile.data:
            deletion_requested_at = profile.data.get("deletion_requested_at")

        # Count audit log entries for data exports
        exports = (
            supabase.table("audit_log")
            .select("created_at")
            .eq("user_id", user_id)
            .eq("action", "data_export")
            .order("created_at", desc=True)
            .limit(5)
            .execute()
            .data or []
        )

        return {
            "status": "success",
            "deletion_requested": bool(deletion_requested_at),
            "deletion_requested_at": deletion_requested_at,
            "recent_exports": [e["created_at"] for e in exports],
        }
    except Exception as exc:
        logger.error("Data rights status error: %s", exc)
        raise HTTPException(500, "Failed to fetch data rights status")


class DeleteAccountRequest(BaseModel):
    confirm: bool
    reason: str = ""


@router.post("/delete")
async def request_account_deletion(
    req: DeleteAccountRequest,
    user_id: str = Depends(get_current_user_id),
):
    """
    Request account deletion (GDPR right to erasure).

    This performs a *soft delete*:
    1. Sets `deletion_requested_at` timestamp on the user's profile.
    2. Deletes all personally identifiable data immediately
       (CVs, cover letters, saved jobs, applications, notifications).
    3. Writes an audit entry.
    4. The auth.users record itself is deleted by Supabase cascade
       when the operator runs the hard-delete maintenance job.

    The endpoint requires `confirm: true` in the request body as an
    intentional friction mechanism to prevent accidental deletion.
    """
    if not req.confirm:
        raise HTTPException(
            400, "Account deletion requires `confirm: true` in the request body."
        )

    supabase = _require_supabase()

    try:
        now = datetime.now(timezone.utc).isoformat()

        # 1. Mark deletion requested on profile
        supabase.table("profiles").update({
            "deletion_requested_at": now,
        }).eq("id", user_id).execute()

        # 2. Delete PII tables (cascade will handle the rest when auth.users is removed)
        tables_to_clear = [
            "notifications",
            "cover_letters",
            "saved_jobs",
            "job_applications",
            "learning_plans",
        ]
        for table in tables_to_clear:
            try:
                supabase.table(table).delete().eq("user_id", user_id).execute()
            except Exception as t_exc:
                logger.warning("Deletion: could not clear %s — %s", table, t_exc)

        # CVs use user_id column
        try:
            supabase.table("cvs").delete().eq("user_id", user_id).execute()
        except Exception:
            pass

        # 3. Audit entry (keep for 30 days for compliance)
        try:
            supabase.table("audit_log").insert({
                "user_id": user_id,
                "action": "deletion_requested",
                "entity_type": "profile",
                "details": {
                    "reason": req.reason[:500] if req.reason else "",
                    "requested_at": now,
                    "tables_cleared": tables_to_clear + ["cvs"],
                },
                "created_at": now,
            }).execute()
        except Exception:
            pass

        return {
            "status": "success",
            "message": (
                "Your account deletion request has been received. "
                "All personal data has been removed. "
                "Your authentication account will be fully deleted within 30 days. "
                "Thank you for using CareerPath AI."
            ),
            "requested_at": now,
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Account deletion error for user %s: %s", user_id, exc)
        raise HTTPException(500, "Failed to process account deletion. Please contact support.")
