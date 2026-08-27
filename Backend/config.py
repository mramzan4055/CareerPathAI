"""
CareerPath AI — Application Configuration

All external API keys are optional.  The application degrades gracefully:
  • No Adzuna keys  → only Arbeitnow + Jobicy (both zero-cost, no key needed)
  • No Groq key     → falls back to Gemini for LLM operations
  • No Gemini key   → LLM features unavailable; job discovery still works
  • No Supabase     → in-memory/stateless mode (no persistence)
"""

from pathlib import Path

try:
    from pydantic_settings import BaseSettings, SettingsConfigDict  # type: ignore
except ImportError:
    from pydantic import BaseSettings  # type: ignore

    class SettingsConfigDict(dict):  # type: ignore
        pass

BASE_DIR = Path(__file__).resolve().parent


class Settings(BaseSettings):
    # ── LLM providers (both optional — app works without them for job search) ──
    groq_api_key: str = ""
    gemini_api_key: str = ""

    # ── Job sources ────────────────────────────────────────────────────────────
    # Arbeitnow and Jobicy are zero-cost public APIs — no keys needed.
    # Adzuna is optional; leave blank to skip it.
    adzuna_app_id: str = ""
    adzuna_app_key: str = ""

    # ── Database ───────────────────────────────────────────────────────────────
    supabase_url: str = ""
    supabase_key: str = ""
    supabase_service_role_key: str = ""

    # ── CORS ───────────────────────────────────────────────────────────────────
    frontend_origins: str = "http://localhost:3000"

    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def frontend_origins_list(self) -> list[str]:
        return [o.strip() for o in self.frontend_origins.split(",") if o.strip()]

    # ── Convenience checks ─────────────────────────────────────────────────────
    @property
    def has_llm(self) -> bool:
        return bool(self.groq_api_key or self.gemini_api_key)

    @property
    def has_adzuna(self) -> bool:
        return bool(self.adzuna_app_id and self.adzuna_app_key)

    @property
    def has_supabase(self) -> bool:
        return bool(self.supabase_url and (self.supabase_key or self.supabase_service_role_key))


settings = Settings()


def validate_keys() -> list[str]:
    """
    Check configuration and return a list of warning strings.
    Does NOT raise — missing keys produce warnings, not failures,
    because zero-cost sources (Arbeitnow, Jobicy) work without any credentials.
    """
    warnings: list[str] = []

    if not settings.has_llm:
        warnings.append(
            "No LLM key configured (GROQ_API_KEY or GEMINI_API_KEY). "
            "CV parsing, skill-gap analysis, and cover letter generation will be unavailable. "
            "Job discovery still works via Arbeitnow + Jobicy."
        )
    elif not settings.groq_api_key:
        warnings.append("GROQ_API_KEY not set — using Gemini as primary LLM.")

    if not settings.has_adzuna:
        warnings.append(
            "Adzuna API keys not configured (ADZUNA_APP_ID / ADZUNA_APP_KEY). "
            "Adzuna will be skipped; Arbeitnow and Jobicy will still be used."
        )

    if not settings.has_supabase:
        warnings.append(
            "Supabase not configured (SUPABASE_URL / SUPABASE_KEY). "
            "Database persistence is disabled; matching and saved jobs will not work."
        )

    for w in warnings:
        print(f"[CareerPath AI] WARNING: {w}")

    return warnings
