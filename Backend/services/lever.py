"""
Lever ATS public posting API connector — no API key required.

Lever's public posting API endpoint:
  https://api.lever.co/v0/postings/{company}?mode=json&limit=250

This connector queries a curated list of known Lever company slugs. The list
can be extended via the LEVER_COMPANY_SLUGS environment variable
(comma-separated).

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

SOURCE_NAME = "lever"
BASE_URL = "https://api.lever.co/v0/postings"

# Default curated slugs — all are companies using Lever with public postings
_DEFAULT_SLUGS: list[str] = [
    "netflix",
    "spotify",
    "twitter",
    "shopify",
    "twilio",
    "cloudflare",
    "plaid",
    "intercom",
    "segment",
    "brex",
    "rippling",
    "confluent",
    "asana",
    "box",
    "zendesk",
]


def _get_slugs() -> list[str]:
    """Return company slugs: env override OR curated defaults."""
    env = os.environ.get("LEVER_COMPANY_SLUGS", "").strip()
    if env:
        return [s.strip() for s in env.split(",") if s.strip()]
    return _DEFAULT_SLUGS


def _fingerprint(company_slug: str, posting_id: str) -> str:
    """Stable SHA-256 dedup key — lever|slug|posting_id."""
    raw = f"lever|{company_slug}|{posting_id}"
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


def _parse_salary(text: str | None) -> tuple[float | None, float | None]:
    """
    Attempt to extract salary range from free-text compensation string.
    Returns (min, max) floats or (None, None) if not parseable.
    """
    if not text:
        return None, None
    # Match patterns like "$80k–$120k", "$80,000 - $120,000", "80000 to 120000"
    numbers = re.findall(r"[\$]?([\d,]+)k?", text.replace(",", ""))
    parsed = []
    for n in numbers:
        try:
            val = float(n)
            if val < 1000:   # treat as thousands (e.g. "80k" → 80000)
                val *= 1000
            parsed.append(val)
        except ValueError:
            pass
    if len(parsed) >= 2:
        return min(parsed), max(parsed)
    if len(parsed) == 1:
        return parsed[0], None
    return None, None


async def health_check() -> dict:
    """
    Ping the Lever postings API using the first configured company slug.
    Returns a status dict compatible with the multi-source aggregator.
    """
    slug = _get_slugs()[0]
    url = f"{BASE_URL}/{slug}"
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            r = await client.get(url, params={"mode": "json", "limit": "5"})
            r.raise_for_status()
            data = r.json()
            job_count = len(data) if isinstance(data, list) else 0
            return {
                "source": SOURCE_NAME,
                "status": "ok",
                "http_code": r.status_code,
                "sample_company": slug,
                "sample_jobs": job_count,
            }
    except Exception as exc:
        return {"source": SOURCE_NAME, "status": "error", "detail": str(exc)}


async def sync(
    company_slugs: list[str] | None = None,
    max_per_company: int = 50,
) -> list[dict]:
    """
    Fetch job postings from all configured Lever company slugs.

    Args:
        company_slugs: Override the default slug list.
        max_per_company: Maximum jobs to take per company.

    Returns:
        List of normalised job dicts ready for upsert.
    """
    slugs = company_slugs or _get_slugs()
    normalized: list[dict] = []

    async with httpx.AsyncClient(timeout=20) as client:
        for slug in slugs:
            url = f"{BASE_URL}/{slug}"
            try:
                r = await client.get(
                    url,
                    params={"mode": "json", "limit": str(max_per_company)},
                )
                if r.status_code == 404:
                    logger.warning("Lever company not found: %s", slug)
                    continue
                r.raise_for_status()

                data = r.json()
                postings = data if isinstance(data, list) else []
                count_before = len(normalized)

                for raw in postings[:max_per_company]:
                    raw["_company_slug"] = slug
                    norm = normalize(raw)
                    if validate(norm):
                        normalized.append(norm)

                logger.info(
                    "Lever '%s': fetched %d, normalised %d",
                    slug,
                    len(postings),
                    len(normalized) - count_before,
                )
            except httpx.HTTPStatusError as exc:
                logger.warning(
                    "Lever '%s' HTTP %s: %s",
                    slug,
                    exc.response.status_code,
                    exc.response.text[:200],
                )
            except Exception as exc:
                logger.warning("Lever '%s' error: %s", slug, exc)

    logger.info("Lever sync complete — %d total jobs", len(normalized))
    return normalized


def normalize(raw_job: dict) -> dict:
    """
    Convert a raw Lever posting dict to the canonical CareerPath schema.

    Lever's JSON structure (v0):
      {
        "id": "uuid",
        "text": "Job Title",
        "categories": { "team": "...", "location": "...", "commitment": "..." },
        "description": "<p>HTML description</p>",
        "additional": "<p>...</p>",
        "lists": [{ "text": "Requirements", "content": "<li>..." }],
        "urls": { "show": "https://jobs.lever.co/...", "apply": "..." },
        "createdAt": 1700000000000,  # Unix ms
        "salaryDescription": "$80k–$120k"
      }
    """
    company_slug: str = raw_job.get("_company_slug", "unknown")
    posting_id: str = raw_job.get("id", "")

    # Title
    job_title = (raw_job.get("text") or "").strip()

    # Company name — derive from slug
    company = company_slug.replace("-", " ").title()

    # Categories block
    categories = raw_job.get("categories") or {}
    location = (categories.get("location") or "Remote").strip()
    commitment = (categories.get("commitment") or "full-time").lower()
    team = (categories.get("team") or "").strip()

    # Description — combine main description + lists
    raw_desc = raw_job.get("description") or ""
    additional = raw_job.get("additional") or ""
    lists_html = " ".join(
        item.get("content", "") for item in (raw_job.get("lists") or [])
    )
    full_html = f"{raw_desc} {additional} {lists_html}"
    clean_description = _strip_html(full_html)[:8000]

    # URL
    urls = raw_job.get("urls") or {}
    url = urls.get("show") or urls.get("apply") or ""

    # Remote detection
    remote = False
    loc_lower = location.lower()
    title_lower = job_title.lower()
    commit_lower = commitment.lower()
    if any(kw in loc_lower for kw in ("remote", "anywhere", "worldwide")):
        remote = True
    if "remote" in title_lower or "remote" in commit_lower:
        remote = True

    # Tags — team / commitment
    tags: list[str] = [t for t in [team, commitment] if t]

    # Contract type
    contract_map = {
        "full-time": "full-time",
        "part-time": "part-time",
        "contract": "contract",
        "internship": "internship",
        "temporary": "contract",
    }
    contract_type = next(
        (v for k, v in contract_map.items() if k in commit_lower),
        "full-time",
    )

    # Salary
    salary_min, salary_max = _parse_salary(raw_job.get("salaryDescription"))

    # Published date (Lever uses Unix milliseconds)
    published_at: str | None = None
    created_ms = raw_job.get("createdAt")
    if created_ms:
        try:
            dt = datetime.fromtimestamp(int(created_ms) / 1000, tz=timezone.utc)
            published_at = dt.isoformat()
        except (ValueError, TypeError, OSError):
            published_at = None

    return {
        "source": SOURCE_NAME,
        "external_id": _fingerprint(company_slug, posting_id),
        "job_title": job_title,
        "company": company,
        "location": location,
        "clean_description": clean_description,
        "url": url,
        "remote": remote,
        "tags": tags,
        "contract_type": contract_type,
        "salary_min": salary_min,
        "salary_max": salary_max,
        "published_at": published_at,
        "query_used": company_slug,  # slug acts as "query" for admin UI
    }


def validate(normalized: dict) -> bool:
    """
    Return True if the normalized job has the minimum required fields.
    """
    required = ("job_title", "company", "clean_description", "url")
    for field in required:
        val = normalized.get(field, "")
        if not val or not str(val).strip():
            return False
    if len(normalized["job_title"]) < 3:
        return False
    if len(normalized["clean_description"]) < 20:
        return False
    return True


async def run_full_sync(max_per_company: int = 50) -> dict:
    """
    Run a complete Lever sync and return a summary dict.

    Returns:
        {
            "source": "lever",
            "companies_attempted": int,
            "jobs_fetched": int,
            "jobs_valid": int,
        }
    """
    slugs = _get_slugs()
    jobs = await sync(company_slugs=slugs, max_per_company=max_per_company)
    valid = [j for j in jobs if validate(j)]
    return {
        "source": SOURCE_NAME,
        "companies_attempted": len(slugs),
        "jobs_fetched": len(jobs),
        "jobs_valid": len(valid),
    }
