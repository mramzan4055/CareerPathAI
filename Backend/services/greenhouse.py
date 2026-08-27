"""
Greenhouse ATS public job board connector — no API key required.

Greenhouse exposes a public JSON feed for every company that uses it:
  https://boards-api.greenhouse.io/v1/boards/{board_token}/jobs?content=true

This connector aggregates jobs from a curated list of known public board
tokens. The list is intentionally limited to well-known tech companies that
publish open roles; it can be extended via the GREENHOUSE_BOARD_TOKENS
environment variable (comma-separated).

Contract: healthCheck / sync / normalize / validate / run_full_sync
"""
from __future__ import annotations

import hashlib
import logging
import os
import re
from datetime import datetime, timezone
from typing import Any

import httpx

logger = logging.getLogger(__name__)

SOURCE_NAME = "greenhouse"
BASE_URL = "https://boards-api.greenhouse.io/v1/boards"

# Default curated board tokens — all are public Greenhouse boards (no key needed)
_DEFAULT_BOARDS: list[str] = [
    "airbnb",
    "stripe",
    "notion",
    "discord",
    "figma",
    "databricks",
    "huggingface",
    "openai",
    "anthropic",
    "linear",
    "vercel",
    "hashicorp",
    "supabase",
    "clickup",
]


def _get_board_tokens() -> list[str]:
    """Return board tokens: env override OR the curated defaults."""
    env = os.environ.get("GREENHOUSE_BOARD_TOKENS", "").strip()
    if env:
        return [t.strip() for t in env.split(",") if t.strip()]
    return _DEFAULT_BOARDS


def _fingerprint(board_token: str, job_id: Any) -> str:
    """Stable SHA-256 dedup key — greenhouse|board|job_id."""
    raw = f"greenhouse|{board_token}|{job_id}"
    return hashlib.sha256(raw.encode()).hexdigest()


def _strip_html(text: str) -> str:
    """Remove HTML tags and decode common entities."""
    text = re.sub(r"<[^>]+>", " ", text or "")
    text = re.sub(r"&nbsp;", " ", text)
    text = re.sub(r"&amp;", "&", text)
    text = re.sub(r"&lt;", "<", text)
    text = re.sub(r"&gt;", ">", text)
    text = re.sub(r"&quot;", '"', text)
    text = re.sub(r"&#39;", "'", text)
    return re.sub(r"\s+", " ", text).strip()


async def health_check() -> dict:
    """
    Ping the Greenhouse boards API using the first configured board token.
    Returns a status dict compatible with the multi-source aggregator.
    """
    token = _get_board_tokens()[0]
    url = f"{BASE_URL}/{token}/jobs"
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            r = await client.get(url, params={"content": "false"})
            r.raise_for_status()
            data = r.json()
            job_count = len(data.get("jobs", []))
            return {
                "source": SOURCE_NAME,
                "status": "ok",
                "http_code": r.status_code,
                "sample_board": token,
                "sample_jobs": job_count,
            }
    except Exception as exc:
        return {"source": SOURCE_NAME, "status": "error", "detail": str(exc)}


async def sync(
    board_tokens: list[str] | None = None,
    max_per_board: int = 50,
) -> list[dict]:
    """
    Fetch jobs from all configured Greenhouse board tokens.

    Args:
        board_tokens: Override the default board list.
        max_per_board: Maximum jobs to take per board (avoids huge boards).

    Returns:
        List of normalised job dicts ready for upsert.
    """
    tokens = board_tokens or _get_board_tokens()
    normalized: list[dict] = []

    async with httpx.AsyncClient(timeout=20) as client:
        for token in tokens:
            url = f"{BASE_URL}/{token}/jobs"
            try:
                r = await client.get(url, params={"content": "true"})
                if r.status_code == 404:
                    logger.warning("Greenhouse board not found: %s", token)
                    continue
                r.raise_for_status()
                data = r.json()
                jobs = data.get("jobs", [])[:max_per_board]

                for raw in jobs:
                    # Inject board_token so normalize() can use it
                    raw["_board_token"] = token
                    norm = normalize(raw)
                    if validate(norm):
                        normalized.append(norm)

                logger.info(
                    "Greenhouse board '%s': fetched %d, normalised %d",
                    token,
                    len(jobs),
                    len([n for n in normalized if n.get("query_used", "").startswith(token)]),
                )
            except httpx.HTTPStatusError as exc:
                logger.warning(
                    "Greenhouse board '%s' HTTP %s: %s",
                    token,
                    exc.response.status_code,
                    exc.response.text[:200],
                )
            except Exception as exc:
                logger.warning("Greenhouse board '%s' error: %s", token, exc)

    logger.info("Greenhouse sync complete — %d total jobs", len(normalized))
    return normalized


def normalize(raw_job: dict) -> dict:
    """
    Convert a raw Greenhouse job dict to the canonical CareerPath schema.

    Canonical fields:
      source, external_id, job_title, company, location,
      clean_description, url, remote, tags, contract_type,
      salary_min, salary_max, published_at, query_used
    """
    board_token: str = raw_job.get("_board_token", "unknown")
    job_id = raw_job.get("id", "")

    # Title
    job_title = (raw_job.get("title") or "").strip()

    # Company — Greenhouse stores it in metadata
    metadata = raw_job.get("metadata") or []
    company = raw_job.get("company_name") or board_token.replace("-", " ").title()

    # Location — may be a list of offices
    location_objs = raw_job.get("offices") or raw_job.get("location") or []
    if isinstance(location_objs, list):
        parts = [
            loc.get("name", "") if isinstance(loc, dict) else str(loc)
            for loc in location_objs
        ]
        location = ", ".join(p for p in parts if p) or "Remote"
    elif isinstance(location_objs, dict):
        location = location_objs.get("name", "Remote")
    else:
        location = str(location_objs) or "Remote"

    # Description
    raw_desc = raw_job.get("content") or raw_job.get("description") or ""
    clean_description = _strip_html(raw_desc)[:8000]  # cap at 8 KB

    # URL
    url = raw_job.get("absolute_url") or raw_job.get("url") or ""

    # Remote detection
    remote = False
    loc_lower = location.lower()
    title_lower = job_title.lower()
    if any(kw in loc_lower for kw in ("remote", "anywhere", "worldwide")):
        remote = True
    if "remote" in title_lower:
        remote = True

    # Tags — from departments
    departments = raw_job.get("departments") or []
    tags: list[str] = []
    for dept in departments:
        if isinstance(dept, dict):
            name = dept.get("name", "")
        else:
            name = str(dept)
        if name:
            tags.append(name)

    # Contract type — Greenhouse doesn't expose this directly; default "full-time"
    contract_type = "full-time"

    # Published date
    published_at: str | None = None
    updated_at_raw = raw_job.get("updated_at") or raw_job.get("created_at")
    if updated_at_raw:
        try:
            dt = datetime.fromisoformat(str(updated_at_raw).replace("Z", "+00:00"))
            published_at = dt.isoformat()
        except ValueError:
            published_at = None

    return {
        "source": SOURCE_NAME,
        "external_id": _fingerprint(board_token, job_id),
        "job_title": job_title,
        "company": company,
        "location": location,
        "clean_description": clean_description,
        "url": url,
        "remote": remote,
        "tags": tags,
        "contract_type": contract_type,
        "salary_min": None,   # Greenhouse rarely exposes salary
        "salary_max": None,
        "published_at": published_at,
        "query_used": board_token,  # board token acts as the "query" for admin UI
    }


def validate(normalized: dict) -> bool:
    """
    Return True if the normalized job has the minimum required fields.
    Rejects records that would be useless to show users.
    """
    required = ("job_title", "company", "clean_description", "url")
    for field in required:
        val = normalized.get(field, "")
        if not val or not str(val).strip():
            return False
    # Title must be at least 3 chars
    if len(normalized["job_title"]) < 3:
        return False
    # Description too short to be useful
    if len(normalized["clean_description"]) < 20:
        return False
    return True


async def run_full_sync(max_per_board: int = 50) -> dict:
    """
    Run a complete Greenhouse sync and return a summary dict.

    Returns:
        {
            "source": "greenhouse",
            "boards_attempted": int,
            "jobs_fetched": int,
            "jobs_valid": int,
        }
    """
    tokens = _get_board_tokens()
    jobs = await sync(board_tokens=tokens, max_per_board=max_per_board)
    valid = [j for j in jobs if validate(j)]
    return {
        "source": SOURCE_NAME,
        "boards_attempted": len(tokens),
        "jobs_fetched": len(jobs),
        "jobs_valid": len(valid),
    }
