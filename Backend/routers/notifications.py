"""
In-app notification system router.

Endpoints:
  GET    /api/v1/notifications/          List notifications (with optional ?unread_only=true)
  PATCH  /api/v1/notifications/{id}/read Mark a single notification as read
  POST   /api/v1/notifications/read-all  Mark all notifications as read
  DELETE /api/v1/notifications/{id}      Delete a notification
  GET    /api/v1/notifications/unread-count  Fast unread badge count
  POST   /api/v1/notifications/          (internal/admin) Create a notification — useful for testing

Notification types:
  match_alert   — new job matches user's profile
  reminder      — application follow-up reminder
  system        — platform announcements
  digest        — weekly activity digest
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from auth import get_current_user_id
from database import get_supabase

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/notifications", tags=["Notifications"])


# ── Pydantic models ────────────────────────────────────────────────────────

class NotificationOut(BaseModel):
    id: str
    type: str
    title: str
    body: Optional[str] = None
    metadata: dict = Field(default_factory=dict)
    read: bool
    created_at: str


class CreateNotificationRequest(BaseModel):
    user_id: str
    type: str = Field(..., description="match_alert | reminder | system | digest")
    title: str = Field(..., min_length=1, max_length=200)
    body: Optional[str] = None
    metadata: dict = Field(default_factory=dict)


# ── Helpers ────────────────────────────────────────────────────────────────

def _require_supabase():
    sb = get_supabase()
    if not sb:
        raise HTTPException(503, "Database not configured")
    return sb


# ── Routes ─────────────────────────────────────────────────────────────────

@router.get("/unread-count")
async def get_unread_count(user_id: str = Depends(get_current_user_id)):
    """Return the number of unread notifications (used for the badge)."""
    supabase = _require_supabase()
    try:
        resp = (
            supabase.table("notifications")
            .select("id", count="exact")
            .eq("user_id", user_id)
            .eq("read", False)
            .execute()
        )
        return {"unread_count": resp.count or 0}
    except Exception as exc:
        logger.error("unread-count error: %s", exc)
        raise HTTPException(500, "Failed to fetch unread count")


@router.get("/")
async def list_notifications(
    unread_only: bool = Query(False, description="Return only unread notifications"),
    limit: int = Query(50, ge=1, le=200),
    user_id: str = Depends(get_current_user_id),
):
    """
    List the current user's notifications, newest first.
    """
    supabase = _require_supabase()
    try:
        q = (
            supabase.table("notifications")
            .select("id, type, title, body, metadata, read, created_at")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .limit(limit)
        )
        if unread_only:
            q = q.eq("read", False)

        resp = q.execute()
        items = resp.data or []
        return {
            "status": "success",
            "total": len(items),
            "notifications": items,
        }
    except Exception as exc:
        logger.error("list_notifications error: %s", exc)
        raise HTTPException(500, "Failed to fetch notifications")


@router.patch("/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    user_id: str = Depends(get_current_user_id),
):
    """Mark a single notification as read."""
    supabase = _require_supabase()
    try:
        resp = (
            supabase.table("notifications")
            .update({"read": True})
            .eq("id", notification_id)
            .eq("user_id", user_id)  # RLS double-check
            .execute()
        )
        if not resp.data:
            raise HTTPException(404, "Notification not found")
        return {"status": "success", "id": notification_id}
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("mark_read error: %s", exc)
        raise HTTPException(500, "Failed to mark notification as read")


@router.post("/read-all")
async def mark_all_read(user_id: str = Depends(get_current_user_id)):
    """Mark all of the current user's notifications as read."""
    supabase = _require_supabase()
    try:
        supabase.table("notifications").update({"read": True}).eq(
            "user_id", user_id
        ).eq("read", False).execute()
        return {"status": "success", "message": "All notifications marked as read"}
    except Exception as exc:
        logger.error("mark_all_read error: %s", exc)
        raise HTTPException(500, "Failed to mark all notifications as read")


@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: str,
    user_id: str = Depends(get_current_user_id),
):
    """Delete a single notification."""
    supabase = _require_supabase()
    try:
        resp = (
            supabase.table("notifications")
            .delete()
            .eq("id", notification_id)
            .eq("user_id", user_id)
            .execute()
        )
        if not resp.data:
            raise HTTPException(404, "Notification not found")
        return {"status": "success", "deleted": notification_id}
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("delete_notification error: %s", exc)
        raise HTTPException(500, "Failed to delete notification")


@router.post("/", status_code=201)
async def create_notification(
    req: CreateNotificationRequest,
    _: str = Depends(get_current_user_id),  # auth-gated; typically called by scheduler/admin
):
    """
    Create a notification for a user.
    In production this is called by the scheduler and internal services.
    Exposed here for testing and admin tooling.
    """
    supabase = _require_supabase()
    try:
        row = {
            "user_id": req.user_id,
            "type": req.type,
            "title": req.title,
            "body": req.body,
            "metadata": req.metadata,
            "read": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        resp = supabase.table("notifications").insert(row).execute()
        if not resp.data:
            raise HTTPException(500, "Failed to create notification")
        return {"status": "success", "notification": resp.data[0]}
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("create_notification error: %s", exc)
        raise HTTPException(500, "Failed to create notification")


# ── Helper for internal use (called by scheduler / applications router) ────

async def create_notification_internal(
    supabase,
    user_id: str,
    ntype: str,
    title: str,
    body: Optional[str] = None,
    metadata: Optional[dict] = None,
) -> bool:
    """
    Fire-and-forget helper for creating notifications from other modules.
    Returns True on success, False on failure (never raises).
    """
    try:
        row = {
            "user_id": user_id,
            "type": ntype,
            "title": title,
            "body": body,
            "metadata": metadata or {},
            "read": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        supabase.table("notifications").insert(row).execute()
        return True
    except Exception as exc:
        logger.warning("create_notification_internal failed: %s", exc)
        return False
