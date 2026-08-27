# CareerPath AI — v2.1 Zero-Cost Edition

An intelligent, **zero-cost** career guidance platform.  Upload a CV, get AI-parsed structured data,
discover real jobs from free public APIs, run semantic matching, analyse skill gaps, and track every
application — all without paying for a single external subscription.

---

## What's new in v2.1

| Area | Change |
|------|--------|
| **Job sources** | Replaced mandatory Adzuna dependency with **Arbeitnow** and **Jobicy** (both free, no API key). Adzuna is now optional. |
| **Job router** | `/jobs/find` now hits multiple sources in priority order: DB cache → Arbeitnow → Jobicy → Adzuna. |
| **Admin sync** | `POST /jobs/admin/sync` triggers a full background refresh of all enabled sources. |
| **Manual import** | `POST /jobs/admin/import` accepts a `.csv` or `.json` file of job listings. |
| **Application Assistant** | Replaces "Auto Apply" with a consent-first, audited apply flow (`/api/v1/applications/`). |
| **Source health** | `GET /jobs/sources` returns live health status of each connector. |
| **Config** | All API keys are now optional — the app starts and serves job search with zero credentials. |
| **Frontend** | New **Applications** page (Kanban + List), **Job Sources Admin** page, updated Jobs page with source badges + match formula tooltip. |
| **Tests** | 9 new unit tests for Arbeitnow, Jobicy, and the multi-source aggregator. |

---

## Architecture

```
CareerPath AI (monorepo)
├── Backend/         FastAPI service — Python 3.9+
│   ├── routers/
│   │   ├── cv.py              CV parsing (Groq/Gemini LLM + Supabase Edge Function)
│   │   ├── jobs.py            Multi-source job discovery & semantic matching
│   │   ├── skills.py          Skill-gap analysis & course recommendations
│   │   ├── learning_plans.py  Saved learning roadmaps
│   │   ├── cover_letters.py   AI cover letter generation
│   │   └── applications.py   ★ NEW — controlled apply + audit trail
│   ├── services/
│   │   ├── arbeitnow.py       ★ NEW — free public API (no key)
│   │   ├── jobicy.py          ★ NEW — free remote-job API (no key)
│   │   ├── job_sources.py     ★ NEW — multi-source aggregator
│   │   ├── adzuna.py          Original Adzuna connector (now optional)
│   │   ├── ai_client.py       Groq + Gemini LLM wrapper
│   │   ├── embeddings.py      Supabase Edge Function bridge
│   │   └── gemini.py          Gemini REST fallback
│   └── tests/
│       ├── test_job_sources.py  ★ NEW — 9 unit tests
│       ├── test_auth.py
│       └── test_config.py
└── Front-end/       Next.js 14 app — TypeScript
    ├── src/app/dashboard/
    │   ├── page.tsx           Overview / dashboard
    │   ├── cv/                CV upload
    │   ├── jobs/              Job search & AI matching
    │   ├── saved/             Saved jobs tracker
    │   ├── applications/      ★ NEW — Application tracker (Kanban)
    │   ├── skills/            Skill gap analysis
    │   ├── cover-letters/     Cover letter generator
    │   ├── resume/            Resume builder
    │   ├── profile/           Profile editor
    │   └── admin/             ★ NEW — Job source admin & sync
    └── src/components/views/
        ├── JobsView.tsx       Updated — source badges, match formula, apply button
        ├── ApplicationsView.tsx  ★ NEW — Kanban + list tracker
        └── AdminView.tsx         ★ NEW — source health + import UI
```

---

## Zero-Cost Job Sources

| Source | Key required | Type | Default |
|--------|-------------|------|---------|
| **Arbeitnow** | ❌ None | Public REST API | ✅ Enabled |
| **Jobicy** | ❌ None | Public REST API | ✅ Enabled |
| Adzuna | ✅ Optional | Commercial API | Skipped if no key |

LinkedIn automated scraping is explicitly **not** implemented per the specification — only approved APIs and manual imports.

---

## Local Development

### Backend

```bash
cd Backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # all keys are optional in v2.1
uvicorn main:app --reload
# → http://127.0.0.1:8000/docs
```

**Minimum `.env` to get job search working (zero keys):**
```env
# Leave everything blank — Arbeitnow + Jobicy work without credentials.
# Add keys below to unlock LLM features (CV parsing, skill gap, cover letters):
GROQ_API_KEY=
GEMINI_API_KEY=
SUPABASE_URL=
SUPABASE_KEY=
```

### Frontend

```bash
cd Front-end
npm install
cp .env.example .env.local
# set NEXT_PUBLIC_BACKEND_URL=http://127.0.0.1:8000 (already the default)
npm run dev
# → http://localhost:3000
```

### Tests

```bash
cd Backend
pip install pytest pytest-asyncio
pytest tests/test_job_sources.py tests/test_config.py -v
```

---

## API Reference (new in v2.1)

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/jobs/find` | Public | Multi-source job search — Arbeitnow + Jobicy + optional Adzuna |
| GET | `/jobs/sources` | Bearer | List all sources + live health status |
| POST | `/jobs/admin/sync` | Bearer | Trigger background sync of all sources |
| POST | `/jobs/admin/import` | Bearer | Import jobs from CSV or JSON file |
| POST | `/api/v1/applications/apply` | Bearer | Record a consent-first apply intent |
| GET | `/api/v1/applications/` | Bearer | List user's applications |
| PATCH | `/api/v1/applications/{id}/status` | Bearer | Update application status |
| GET | `/api/v1/applications/stats` | Bearer | Aggregate application statistics |
| GET | `/api/v1/applications/audit-log` | Bearer | User's audit trail |

Full Swagger UI: `http://127.0.0.1:8000/docs`

---

## CI

GitHub Actions runs checks independently per project path:

- `.github/workflows/backend-ci.yml` — pytest, triggered on `Backend/**`
- `.github/workflows/frontend-ci.yml` — lint, type-check, build, triggered on `Front-end/**`
