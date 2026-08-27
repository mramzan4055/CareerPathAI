"""
Arbeitnow public job API connector — no API key required.

Contract: healthCheck / sync / normalize / validate / upsert / expire
"""
from __future__ import annotations

import hashlib
import logging
from datetime import datetime, timezone
from typing import Any

import httpx

logger = logging.getLogger(__name__)

SOURCE_NAME = "arbeitnow"
BASE_URL = "https://www.arbeitnow.com/api/job-board-api"


def _fingerprint(job: dict) -> str:
    """Stable dedup key — slug + company lower-cased."""
    slug = str(job.get("slug", ""))
    company = str(job.get("company_name", "")).lower().strip()
    return hashlib.sha256(f"{slug}|{company}".encode()).hexdigest()


async def health_check() -> dict:
    """Ping the Arbeitnow API and return status."""
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            r = await client.get(BASE_URL, params={"page": 1})
            r.raise_for_status()
            return {"source": SOURCE_NAME, "status": "ok", "http_code": r.status_code}
    except Exception as exc:
        return {"source": SOURCE_NAME, "status": "error", "detail": str(exc)}


async def sync(pages: int = 3, remote: bool | None = None) -> list[dict]:
    """
    Fetch up to `pages` pages from Arbeitnow (100 jobs/page max).
    Optionally filter to remote-only listings.
    """
    raw: list[dict] = []
    params: dict[str, Any] = {}
    if remote is True:
        params["remote"] = "true"

    async with httpx.AsyncClient(timeout=20) as client:
        for page in range(1, pages + 1):
            params["page"] = page
            try:
                r = await client.get(BASE_URL, params=params)
                r.raise_for_status()
                data = r.json()
                jobs = data.get("data", [])
                if not jobs:
                    break
                raw.extend(jobs)
                logger.info("Arbeitnow page %d: fetched %d jobs", page, len(jobs))
            except httpx.HTTPStatusError as e:
                logger.warning("Arbeitnow HTTP error page %d: %s", page, e)
                break
            except Exception as e:
                logger.warning("Arbeitnow fetch error page %d: %s", page, e)
                break

    return raw


def normalize(raw_job: dict) -> dict:
    """Map Arbeitnow schema → CareerPath AI canonical job schema."""
    tags = raw_job.get("tags", [])
    description = raw_job.get("description", "")
    # Strip HTML tags crudely (no heavy dep)
    import re
    clean_desc = re.sub(r"<[^>]+>", " ", description).strip()
    clean_desc = re.sub(r"\s+", " ", clean_desc)[:2000]

    location_parts = []
    city = raw_job.get("location", "")
    if city:
        location_parts.append(city)
    if raw_job.get("remote"):
        location_parts.append("Remote")
    location = ", ".join(location_parts) if location_parts else "Not specified"

    return {
        "source": SOURCE_NAME,
        "external_id": _fingerprint(raw_job),
        "job_title": raw_job.get("title", "Untitled"),
        "company": raw_job.get("company_name", "Unknown"),
        "location": location,
        "clean_description": clean_desc or "No description available.",
        "url": raw_job.get("url", ""),
        "remote": bool(raw_job.get("remote")),
        "tags": tags[:10],
        "contract_type": raw_job.get("job_types", [None])[0] if raw_job.get("job_types") else None,
        "salary_min": None,
        "salary_max": None,
        "published_at": raw_job.get("created_at"),
        "query_used": "arbeitnow",
    }


def validate(normalized: dict) -> bool:
    """Returns True only if minimum required fields are non-empty."""
    return bool(
        normalized.get("job_title")
        and normalized.get("company")
        and normalized.get("clean_description")
    )


async def run_full_sync(pages: int = 3) -> dict:
    """
    Top-level convenience: fetch → normalize → validate.
    Returns normalized valid jobs ready for upsert.
    """
    raw_jobs = await sync(pages=pages)
    normalized = [normalize(j) for j in raw_jobs]
    valid = [j for j in normalized if validate(j)]
    invalid_count = len(normalized) - len(valid)
    logger.info(
        "Arbeitnow sync complete: %d fetched, %d valid, %d invalid",
        len(raw_jobs),
        len(valid),
        invalid_count,
    )
    return {
        "source": SOURCE_NAME,
        "fetched": len(raw_jobs),
        "valid": len(valid),
        "invalid": invalid_count,
        "jobs": valid,
        "synced_at": datetime.now(timezone.utc).isoformat(),
    }
