# KaamYabi AI - Backend Developer Handoff Guide

Welcome to the KaamYabi AI Backend! This repository contains the FastAPI service powering the CV Parsing Module and the Job Fetching Module.

This guide is intended for frontend developers to successfully set up, understand, and integrate with the backend APIs.

---

## 1. Local Setup Instructions

Follow these steps to run the backend API on your local machine for testing.

### Prerequisites
- Python 3.9+ installed
- Git

### Installation Steps

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd <your-repo-directory>
   ```

2. **Create a Virtual Environment:**
   This isolates the project dependencies from your global python setup.
   ```bash
   python -m venv venv
   ```

3. **Activate the Virtual Environment:**
   - **Windows:**
     ```powershell
     .\venv\Scripts\activate
     ```
   - **macOS/Linux:**
     ```bash
     source venv/bin/activate
     ```

4. **Install Dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

5. **Set up Environment Variables:**
   Copy `.env.example` to `.env` in the root directory (where `main.py` is located) and fill in real values. See the Environment Variables section below for details.

6. **Run the FastAPI Server:**
   ```bash
   uvicorn main:app --reload
   ```
   The backend will now be running at `http://127.0.0.1:8000`.

### Alternative: Docker

With a `.env` file already set up (step 5 above):
```bash
docker compose up --build
```
This runs the same server at `http://127.0.0.1:8000` inside a container, using `.env` via `env_file`.

---

## 2. Environment Variables Setup

You must create a `.env` file in the root folder (copy `.env.example` and fill in real values). Do **not** commit this file to version control.

```env
# Groq API for LLM Parsing
GROQ_API_KEY=gsk_your_groq_api_key_here

# Gemini API (fallback LLM, used when Groq fails)
GEMINI_API_KEY=your_gemini_api_key

# Adzuna API for Job Fetching
ADZUNA_APP_ID=your_adzuna_app_id
ADZUNA_APP_KEY=your_adzuna_app_key

# Supabase Database Credentials
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=your_supabase_anon_key
# Required for writes (CVs/jobs/saved_jobs) to bypass RLS. If unset, the
# backend falls back to SUPABASE_KEY and relies entirely on RLS policies.
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Comma-separated list of origins allowed to call this API (CORS)
FRONTEND_ORIGINS=http://localhost:3000
```
*(Note: Ask the backend lead for the actual keys during active development).*

---

## 3. Authentication

Every endpoint except `GET /` and `GET /jobs/find` requires a Supabase session token:

```
Authorization: Bearer <supabase_access_token>
```

The backend verifies the token against Supabase Auth (`supabase.auth.get_user`) and derives the
caller's `user_id` from it — it never trusts a client-supplied `user_id`. CV-scoped endpoints
(`/api/v1/parser/cv/{cv_id}`, `/jobs/match`, everything under `/api/v1/skills`) additionally check
that `cvs.user_id` matches the caller before returning or mutating data, returning `403` otherwise.

On the frontend, get the token from the active Supabase session (`supabase.auth.getSession()`)
— see `src/lib/api.ts`'s `getAuthHeaders()` in the Front-end repo for the reference implementation.

---

## 4. API Documentation (Swagger UI)

FastAPI automatically generates interactive documentation. Once your server is running, simply navigate to:

👉 **[http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)**

From this interface, you can see all endpoints, their required data types, and you can even click **"Try it out"** to execute API calls directly from your browser without needing Postman!

---

## 5. Endpoint Summary

All routes below require `Authorization: Bearer <token>` unless marked **Public**.

### CV Parser — `routers/cv.py`
| Method | Route | Notes |
|---|---|---|
| POST | `/api/v1/parser/resume` | Upload a PDF (`file` form field); parses it with Groq/Gemini and stores it as a new CV owned by the caller. |
| GET | `/api/v1/parser/cv/{cv_id}` | Returns parsed CV data. 403 if the CV isn't owned by the caller. |
| PUT | `/api/v1/parser/cv/{cv_id}` | Updates parsed CV data; clears `skill_gap_cache`. Ownership-checked. |

### Jobs — `routers/jobs.py`
| Method | Route | Notes |
|---|---|---|
| GET | `/jobs/find` | **Public.** Fetches jobs from Adzuna (DB-cached 24h), vectorizes new ones in the background. |
| POST | `/jobs/match` | Semantic match of a CV's embedding against stored jobs (pgvector cosine similarity). Ownership-checked on `cv_id`. |
| POST | `/jobs/save` | Saves a job for the caller. |
| GET | `/jobs/saved` | Lists the caller's saved jobs. |
| DELETE | `/jobs/unsave` | Removes a saved job (`?job_id=...`) for the caller. |

### Skills & Gap Analysis — `routers/skills.py`
| Method | Route | Notes |
|---|---|---|
| PUT | `/api/v1/skills/target-role` | Sets a CV's target job; clears `skill_gap_cache`. Ownership-checked. |
| GET | `/api/v1/skills/gap-analysis/{cv_id}` | Compares CV skills against the target job (LLM), cached in `cvs.skill_gap_cache`. Ownership-checked. |
| POST | `/api/v1/skills/gap-analysis/custom` | Same, but against a free-text job description instead of a stored job. Ownership-checked. |
| POST | `/api/v1/skills/recommend-courses` | Recommends courses for a list of missing skills (LLM). |

### Health
| Method | Route | Notes |
|---|---|---|
| GET | `/` | **Public.** Health check. |

---

## 6. Frontend Integration Advice

As a frontend developer, keep the following best practices in mind when connecting to these APIs:

### 1. CORS (Cross-Origin Resource Sharing)
- The backend only allows origins listed in the `FRONTEND_ORIGINS` env var (comma-separated). Make sure your frontend's dev/prod URL is included, or requests will be rejected by the browser.

### 2. Handling Async Loading States
- The endpoints `/api/v1/parser/resume` and `/jobs/find` both rely on external LLM inference (Groq). 
- **Important:** These requests might take anywhere from **2 to 6 seconds** to resolve. 
- You MUST implement strong UI loading indicators (spinners, skeleton loaders, or progress bars) while waiting for the promise to resolve so the user does not think the app froze.

### 3. File Uploads (Multipart Form Data)
- When uploading the resume, do not send it as JSON. Use the standard `FormData` browser API.
  ```javascript
  const formData = new FormData();
  formData.append("file", selectedPdfFile);
  
  await fetch("http://127.0.0.1:8000/api/v1/parser/resume", {
    method: "POST",
    body: formData // No Content-Type header needed; browser handles it
  });
  ```

### 4. Error Handling
- The backend utilizes standard HTTP status codes (`400`, `404`, `500`). Ensure your `try/catch` blocks catch non-200 responses and render an appropriate Toast or error message to the user (e.g., "Invalid PDF format" or "No jobs found").

### 5. Supabase
- The backend handles connecting to Supabase and logging/saving information securely. You don't need to implement Supabase directly in the frontend for *these specific workflows* unless you are querying the saved data directly later on.
