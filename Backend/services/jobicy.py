"""
Jobicy public job API connector — no API key required.

Jobicy specialises in remote-only positions and provides a free JSON feed.
Contract: healthCheck / sync / normalize / validate / upsert / expire
"""
from __future__ import annotations

import hashlib
import logging
import re
from datetime import datetime, timezone

import httpx

logger = logging.getLogger(__name__)

SOURCE_NAME = "jobicy"
# Public feed — up to 50 jobs, optional tag & geo filters
BASE_URL = "https://jobicy.com/api/v2/remote-jobs"


def _fingerprint(job: dict) -> str:
    """Stable dedup key: job_id or slug+company."""
    jid = str(job.get("id", ""))
    slug = str(job.get("jobSlug", ""))
    company = str(job.get("companyName", "")).lower().strip()
    raw = jid if jid else f"{slug}|{company}"
    return hashlib.sha256(raw.encode()).hexdigest()


async def health_check() -> dict:
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            r = await client.get(BASE_URL, params={"count": 1})
            r.raise_for_status()
            return {"source": SOURCE_NAME, "status": "ok", "http_code": r.status_code}
    except Exception as exc:
        return {"source": SOURCE_NAME, "status": "error", "detail": str(exc)}


async def sync(count: int = 50, industry_tag: str | None = None, geo: str | None = None) -> list[dict]:
    """
    Fetch remote jobs from Jobicy.
    - count: 1-50 (API maximum)
    - industry_tag: optional keyword e.g. "engineering", "marketing"
    - geo: optional two-letter country code e.g. "us", "gb"
    """
    params: dict = {"count": min(count, 50)}
    if industry_tag:
        params["tag"] = industry_tag
    if geo:
        params["geo"] = geo

    try:
        async with httpx.AsyncClient(timeout=20) as client:
            r = await client.get(BASE_URL, params=params)
            r.raise_for_status()
            data = r.json()
            jobs = data.get("jobs", [])
            logger.info("Jobicy fetch complete: %d jobs returned", len(jobs))
            return jobs
    except Exception as exc:
        logger.warning("Jobicy fetch failed: %s", exc)
        return []


def normalize(raw_job: dict) -> dict:
    """Map Jobicy schema → CareerPath AI canonical job schema."""
    # Strip HTML
    desc_raw = raw_job.get("jobDescription", "")
    clean_desc = re.sub(r"<[^>]+>", " ", desc_raw).strip()
    clean_desc = re.sub(r"\s+", " ", clean_desc)[:2000]

    # Build location string
    geo_list = raw_job.get("jobGeo", "Worldwide")
    if isinstance(geo_list, list):
        location = ", ".join(geo_list) if geo_list else "Remote"
    else:
        location = str(geo_list) if geo_list else "Remote"

    # Jobicy is always remote
    if "remote" not in location.lower():
        location = f"Remote — {location}" if location else "Remote"

    # Salary
    sal_raw = raw_job.get("annualSalaryMin"), raw_job.get("annualSalaryMax")
    salary_min = int(sal_raw[0]) if sal_raw[0] else None
    salary_max = int(sal_raw[1]) if sal_raw[1] else None

    industry = raw_job.get("jobIndustry", [])
    tags = industry if isinstance(industry, list) else [industry]

    return {
        "source": SOURCE_NAME,
        "external_id": _fingerprint(raw_job),
        "job_title": raw_job.get("jobTitle", "Untitled"),
        "company": raw_job.get("companyName", "Unknown"),
        "location": location,
        "clean_description": clean_desc or "No description available.",
        "url": raw_job.get("url", ""),
        "remote": True,
        "tags": [str(t) for t in tags[:10]],
        "contract_type": raw_job.get("jobType"),
        "salary_min": salary_min,
        "salary_max": salary_max,
        "published_at": raw_job.get("pubDate"),
        "query_used": "jobicy",
    }


def validate(normalized: dict) -> bool:
    return bool(
        normalized.get("job_title")
        and normalized.get("company")
        and normalized.get("clean_description")
    )


async def run_full_sync(count: int = 50) -> dict:
    """Top-level convenience: fetch → normalize → validate."""
    raw_jobs = await sync(count=count)
    normalized = [normalize(j) for j in raw_jobs]
    valid = [j for j in normalized if validate(j)]
    invalid_count = len(normalized) - len(valid)
    logger.info(
        "Jobicy sync complete: %d fetched, %d valid, %d invalid",
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
