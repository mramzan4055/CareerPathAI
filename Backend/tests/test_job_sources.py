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
