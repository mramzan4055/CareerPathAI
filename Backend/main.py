from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings, validate_keys
from routers import cover_letters, cv, jobs, learning_plans, skills

# Validate essential configuration keys on startup
try:
    validate_keys()
except RuntimeError as e:
    print(f"Startup Warning: {e}")

app = FastAPI(
    title="KaamYabi AI",
    description="Professional API for CV parsing and Job fetching.",
    version="1.0.0"
)

# CORS Setup — restricted to the configured frontend origin(s) (FRONTEND_ORIGINS env var, comma-separated)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.frontend_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(cv.router)
app.include_router(jobs.router)
app.include_router(skills.router)
app.include_router(learning_plans.router)
app.include_router(cover_letters.router)

@app.get("/", tags=["Health"])
def health_check():
    """
    Check if the KaamYabi AI Backend is online.
    """
    return {"status": "online", "message": "KaamYabi AI Backend is running!"}