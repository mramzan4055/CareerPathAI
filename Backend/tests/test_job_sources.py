"""
Tests for the zero-cost job source connectors.

These tests are designed to run without any API keys or live network access.
They patch httpx.AsyncClient to return realistic payloads.
"""
from __future__ import annotations

import pytest
from unittest.mock import AsyncMock, MagicMock, patch


# ── Arbeitnow ───────────────────────────────────────────────────────────────

ARBEITNOW_JOB = {
    "slug": "senior-python-engineer-at-acme-corp",
    "company_name": "Acme Corp",
    "title": "Senior Python Engineer",
    "location": "Berlin",
    "description": "<p>We are looking for a <strong>Senior Python</strong> developer.</p>",
    "remote": True,
    "url": "https://www.arbeitnow.com/jobs/senior-python-engineer",
    "tags": ["python", "django"],
    "job_types": ["full-time"],
    "created_at": "2026-08-01T00:00:00Z",
}


@pytest.mark.asyncio
async def test_arbeitnow_normalize():
    from services.arbeitnow import normalize, validate

    norm = normalize(ARBEITNOW_JOB)
    assert norm["job_title"] == "Senior Python Engineer"
    assert norm["company"] == "Acme Corp"
    assert "Remote" in norm["location"]
    assert "<p>" not in norm["clean_description"]  # HTML stripped
    assert norm["remote"] is True
    assert norm["source"] == "arbeitnow"
    assert validate(norm) is True


@pytest.mark.asyncio
async def test_arbeitnow_validate_rejects_empty():
    from services.arbeitnow import validate

    assert validate({"job_title": "", "company": "X", "clean_description": "desc"}) is False
    assert validate({"job_title": "T", "company": "", "clean_description": "desc"}) is False
    assert validate({"job_title": "T", "company": "X", "clean_description": ""}) is False


@pytest.mark.asyncio
async def test_arbeitnow_health_check_ok():
    from services.arbeitnow import health_check

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.raise_for_status = MagicMock()
    mock_client = AsyncMock()
    mock_client.get = AsyncMock(return_value=mock_response)
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)

    with patch("services.arbeitnow.httpx.AsyncClient", return_value=mock_client):
        result = await health_check()

    assert result["status"] == "ok"
    assert result["source"] == "arbeitnow"


@pytest.mark.asyncio
async def test_arbeitnow_health_check_error():
    from services.arbeitnow import health_check
    import httpx

    mock_client = AsyncMock()
    mock_client.get = AsyncMock(side_effect=httpx.ConnectError("timeout"))
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)

    with patch("services.arbeitnow.httpx.AsyncClient", return_value=mock_client):
        result = await health_check()

    assert result["status"] == "error"


@pytest.mark.asyncio
async def test_arbeitnow_sync_returns_normalized_jobs():
    from services.arbeitnow import run_full_sync

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.raise_for_status = MagicMock()
    mock_response.json = MagicMock(return_value={"data": [ARBEITNOW_JOB]})
    mock_client = AsyncMock()
    mock_client.get = AsyncMock(return_value=mock_response)
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)

    with patch("services.arbeitnow.httpx.AsyncClient", return_value=mock_client):
        result = await run_full_sync(pages=1)

    assert result["fetched"] == 1
    assert result["valid"] == 1
    assert result["jobs"][0]["job_title"] == "Senior Python Engineer"


# ── Jobicy ──────────────────────────────────────────────────────────────────

JOBICY_JOB = {
    "id": "job_12345",
    "jobTitle": "React Frontend Developer",
    "companyName": "Remote Co",
    "jobDescription": "<p>Build amazing <em>React</em> apps.</p>",
    "jobGeo": ["US", "EU"],
    "jobType": "full-time",
    "annualSalaryMin": 70000,
    "annualSalaryMax": 110000,
    "jobIndustry": ["engineering"],
    "url": "https://jobicy.com/jobs/react-developer",
    "pubDate": "2026-08-01 12:00:00",
    "jobSlug": "react-frontend-developer-at-remote-co",
}


@pytest.mark.asyncio
async def test_jobicy_normalize():
    from services.jobicy import normalize, validate

    norm = normalize(JOBICY_JOB)
    assert norm["job_title"] == "React Frontend Developer"
    assert norm["company"] == "Remote Co"
    assert norm["remote"] is True
    assert "<p>" not in norm["clean_description"]
    assert norm["salary_min"] == 70000
    assert norm["salary_max"] == 110000
    assert norm["source"] == "jobicy"
    assert validate(norm) is True


@pytest.mark.asyncio
async def test_jobicy_health_check_ok():
    from services.jobicy import health_check

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.raise_for_status = MagicMock()
    mock_client = AsyncMock()
    mock_client.get = AsyncMock(return_value=mock_response)
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)

    with patch("services.jobicy.httpx.AsyncClient", return_value=mock_client):
        result = await health_check()

    assert result["status"] == "ok"
    assert result["source"] == "jobicy"


@pytest.mark.asyncio
async def test_jobicy_sync_returns_valid_jobs():
    from services.jobicy import run_full_sync

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.raise_for_status = MagicMock()
    mock_response.json = MagicMock(return_value={"jobs": [JOBICY_JOB]})
    mock_client = AsyncMock()
    mock_client.get = AsyncMock(return_value=mock_response)
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)

    with patch("services.jobicy.httpx.AsyncClient", return_value=mock_client):
        result = await run_full_sync(count=50)

    assert result["fetched"] == 1
    assert result["valid"] == 1
    assert result["jobs"][0]["company"] == "Remote Co"


# ── Multi-source ──────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_get_jobs_multi_source_fallback_to_live():
    """When DB returns no cached results, live sources are consulted."""
    import sys
    import types

    # Stub out supabase and database so the test runs without the real package
    fake_supabase_mod = types.ModuleType("supabase")
    fake_supabase_mod.Client = object  # type: ignore
    fake_supabase_mod.create_client = lambda *a, **kw: None  # type: ignore
    sys.modules.setdefault("supabase", fake_supabase_mod)

    # Reload database to pick up the stub if needed
    if "database" in sys.modules:
        del sys.modules["database"]
    if "services.job_sources" in sys.modules:
        del sys.modules["services.job_sources"]

    from services.job_sources import get_jobs_multi_source

    # Mock DB — no cache
    mock_supabase = MagicMock()
    cache_chain = (
        mock_supabase.table.return_value
        .select.return_value
        .gte.return_value
        .limit.return_value
    )
    cache_chain.execute.return_value.data = []

    ar_result = {
        "source": "arbeitnow",
        "fetched": 1,
        "valid": 1,
        "invalid": 0,
        "jobs": [{
            "source": "arbeitnow",
            "external_id": "abc123",
            "job_title": "DevOps Engineer",
            "company": "CloudCo",
            "location": "Remote",
            "clean_description": "Manage cloud infra.",
            "url": "https://example.com/job",
            "remote": True,
            "tags": [],
            "contract_type": None,
            "salary_min": None,
            "salary_max": None,
            "query_used": "arbeitnow",
        }],
        "synced_at": "2026-08-01T00:00:00Z",
    }
    jc_result = {
        "source": "jobicy",
        "fetched": 0,
        "valid": 0,
        "invalid": 0,
        "jobs": [],
        "synced_at": "2026-08-01T00:00:00Z",
    }

    with (
        patch("services.job_sources.get_supabase", return_value=mock_supabase),
        patch("services.job_sources.arbeitnow_sync", AsyncMock(return_value=ar_result)),
        patch("services.job_sources.jobicy_sync", AsyncMock(return_value=jc_result)),
    ):
        result = await get_jobs_multi_source(query="devops", results=10)

    assert result["total"] >= 1
    assert any(j["job_title"] == "DevOps Engineer" for j in result["data"])


# ── Greenhouse ───────────────────────────────────────────────────────────────

GREENHOUSE_JOB = {
    "_board_token": "airbnb",
    "id": 4567890,
    "title": "Staff Software Engineer",
    "departments": [{"name": "Engineering"}],
    "offices": [{"name": "San Francisco, CA"}],
    "content": "<p>We are looking for a <strong>Staff Engineer</strong> to join our team.</p><ul><li>5+ years experience</li></ul>",
    "absolute_url": "https://boards.greenhouse.io/airbnb/jobs/4567890",
    "updated_at": "2026-08-01T00:00:00Z",
}

GREENHOUSE_REMOTE_JOB = {
    "_board_token": "vercel",
    "id": 999111,
    "title": "Remote Senior Frontend Engineer",
    "departments": [{"name": "Product"}],
    "offices": [{"name": "Remote"}],
    "content": "<p>Work from anywhere on our frontend platform.</p>",
    "absolute_url": "https://boards.greenhouse.io/vercel/jobs/999111",
    "updated_at": "2026-07-15T00:00:00Z",
}


def test_greenhouse_normalize():
    from services.greenhouse import normalize, validate

    norm = normalize(GREENHOUSE_JOB)
    assert norm["job_title"] == "Staff Software Engineer"
    assert norm["company"] == "Airbnb"
    assert norm["location"] == "San Francisco, CA"
    assert "<p>" not in norm["clean_description"]       # HTML stripped
    assert "Staff Engineer" in norm["clean_description"]
    assert norm["source"] == "greenhouse"
    assert norm["remote"] is False
    assert validate(norm) is True


def test_greenhouse_normalize_remote():
    from services.greenhouse import normalize

    norm = normalize(GREENHOUSE_REMOTE_JOB)
    assert norm["remote"] is True
    assert norm["company"] == "Vercel"


def test_greenhouse_validate_rejects_empty():
    from services.greenhouse import validate

    assert validate({"job_title": "", "company": "X", "clean_description": "desc", "url": "http://x"}) is False
    assert validate({"job_title": "T", "company": "X", "clean_description": "x", "url": "http://x"}) is False  # desc too short


@pytest.mark.asyncio
async def test_greenhouse_health_check_ok():
    from services.greenhouse import health_check

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"jobs": [{"id": 1}, {"id": 2}]}
    mock_response.raise_for_status = MagicMock()

    with patch("httpx.AsyncClient") as mock_client_cls:
        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.get = AsyncMock(return_value=mock_response)
        mock_client_cls.return_value = mock_client

        result = await health_check()

    assert result["status"] == "ok"
    assert result["source"] == "greenhouse"


@pytest.mark.asyncio
async def test_greenhouse_sync_returns_valid_jobs():
    from services.greenhouse import sync

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"jobs": [GREENHOUSE_JOB]}
    mock_response.raise_for_status = MagicMock()

    with patch("httpx.AsyncClient") as mock_client_cls:
        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.get = AsyncMock(return_value=mock_response)
        mock_client_cls.return_value = mock_client

        jobs = await sync(board_tokens=["airbnb"], max_per_board=5)

    assert len(jobs) == 1
    assert jobs[0]["source"] == "greenhouse"


# ── Lever ────────────────────────────────────────────────────────────────────

LEVER_JOB = {
    "_company_slug": "shopify",
    "id": "abc123-def456",
    "text": "Senior Backend Engineer",
    "categories": {
        "team": "Infrastructure",
        "location": "Remote",
        "commitment": "Full-time",
    },
    "description": "<p>We are building <strong>the future</strong> of commerce.</p>",
    "additional": "<p>You will work on distributed systems.</p>",
    "lists": [
        {"text": "Requirements", "content": "<li>5+ years Go experience</li><li>Kubernetes</li>"}
    ],
    "urls": {"show": "https://jobs.lever.co/shopify/abc123", "apply": "https://jobs.lever.co/shopify/abc123/apply"},
    "createdAt": 1700000000000,
    "salaryDescription": "$150k - $200k",
}

LEVER_PARTTIME_JOB = {
    "_company_slug": "netflix",
    "id": "xyz789",
    "text": "Part-time Data Analyst",
    "categories": {
        "team": "Analytics",
        "location": "Los Angeles, CA",
        "commitment": "Part-time",
    },
    "description": "<p>Analyze streaming data.</p>",
    "additional": "",
    "lists": [],
    "urls": {"show": "https://jobs.lever.co/netflix/xyz789"},
    "createdAt": 1700000000000,
}


def test_lever_normalize():
    from services.lever import normalize, validate

    norm = normalize(LEVER_JOB)
    assert norm["job_title"] == "Senior Backend Engineer"
    assert norm["company"] == "Shopify"
    assert norm["remote"] is True
    assert "<p>" not in norm["clean_description"]
    assert "future" in norm["clean_description"]     # HTML stripped but text preserved
    assert norm["contract_type"] == "full-time"
    assert norm["salary_min"] == 150000.0
    assert norm["salary_max"] == 200000.0
    assert norm["source"] == "lever"
    assert validate(norm) is True


def test_lever_normalize_parttime():
    from services.lever import normalize

    norm = normalize(LEVER_PARTTIME_JOB)
    assert norm["contract_type"] == "part-time"
    assert norm["remote"] is False
    assert norm["company"] == "Netflix"


def test_lever_validate_rejects_short_description():
    from services.lever import validate

    assert validate({
        "job_title": "Engineer",
        "company": "Corp",
        "clean_description": "Short",   # < 20 chars
        "url": "http://x",
    }) is False


@pytest.mark.asyncio
async def test_lever_health_check_ok():
    from services.lever import health_check

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = [LEVER_JOB, LEVER_PARTTIME_JOB]
    mock_response.raise_for_status = MagicMock()

    with patch("httpx.AsyncClient") as mock_client_cls:
        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.get = AsyncMock(return_value=mock_response)
        mock_client_cls.return_value = mock_client

        result = await health_check()

    assert result["status"] == "ok"
    assert result["source"] == "lever"
    assert result["sample_jobs"] == 2


@pytest.mark.asyncio
async def test_lever_sync_returns_valid_jobs():
    from services.lever import sync

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = [LEVER_JOB]
    mock_response.raise_for_status = MagicMock()

    with patch("httpx.AsyncClient") as mock_client_cls:
        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.get = AsyncMock(return_value=mock_response)
        mock_client_cls.return_value = mock_client

        jobs = await sync(company_slugs=["shopify"], max_per_company=5)

    assert len(jobs) == 1
    assert jobs[0]["source"] == "lever"
    assert jobs[0]["salary_min"] == 150000.0
