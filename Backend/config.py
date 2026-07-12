from pathlib import Path

try:
    from pydantic_settings import BaseSettings, SettingsConfigDict  # type: ignore
except ImportError:
    from pydantic import BaseSettings

    class SettingsConfigDict(dict):
        pass

BASE_DIR = Path(__file__).resolve().parent

class Settings(BaseSettings):
    groq_api_key: str = ""
    gemini_api_key: str = ""
    adzuna_app_id: str = ""
    adzuna_app_key: str = ""
    supabase_url: str = ""
    supabase_key: str = ""
    supabase_service_role_key: str = ""
    frontend_origins: str = "http://localhost:3000"

    model_config = SettingsConfigDict(env_file=str(BASE_DIR / ".env"), env_file_encoding="utf-8", extra="ignore")

    @property
    def frontend_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.frontend_origins.split(",") if origin.strip()]

settings = Settings()

def validate_keys():
    """Ensure all required API keys are present."""
    missing = []
    if not settings.groq_api_key:
        missing.append("GROQ_API_KEY")
    if not settings.adzuna_app_id:
        missing.append("ADZUNA_APP_ID")
    if not settings.adzuna_app_key:
        missing.append("ADZUNA_APP_KEY")
    
    # We can make Supabase optional for now if it's just being introduced
    if not settings.supabase_url or not settings.supabase_key:
        print("Warning: SUPABASE_URL or SUPABASE_KEY missing. Database features may not work.")

    if missing:
        raise RuntimeError(f"Missing essential API keys in .env: {', '.join(missing)}")
