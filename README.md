# CareerPathAI

An intelligent career guidance platform: upload a resume, get AI-parsed structured data,
search and semantically match jobs against it, and track skill gaps against a target role.

This is a monorepo with two independently deployable projects:

- **[`Backend/`](Backend/)** — FastAPI service ("KaamYabi AI") for CV parsing, job
  fetching/matching, and skill-gap analysis. Uses Groq/Gemini for LLM inference and
  Supabase (Postgres + pgvector) for storage. See [Backend/README.md](Backend/README.md).
- **[`Front-end/`](Front-end/)** — Next.js 14 app providing the UI, authenticated via
  Supabase Auth. See [Front-end/README.md](Front-end/README.md).

## Local development

Each project is set up and run independently — see its own README for setup steps
(env vars, install, run commands). In short:

```bash
# Backend
cd Backend
python -m venv venv && venv\Scripts\activate  # Windows
pip install -r requirements-dev.txt
cp .env.example .env  # fill in real values
uvicorn main:app --reload

# Front-end (separate terminal)
cd Front-end
npm install
cp .env.example .env.local  # fill in real values
npm run dev
```

The frontend talks to the backend over HTTP (`NEXT_PUBLIC_BACKEND_URL`, defaults to
`http://127.0.0.1:8000`), so run both simultaneously for the full app to work.

## CI

GitHub Actions runs each project's checks independently, scoped by path:
- `.github/workflows/backend-ci.yml` — pytest, triggered on changes under `Backend/`
- `.github/workflows/frontend-ci.yml` — lint, type-check, build, triggered on changes under `Front-end/`
