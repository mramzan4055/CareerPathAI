from supabase import create_client, Client
from config import settings
import logging

logger = logging.getLogger(__name__)

# --- Supabase Setup Guide ---
# 1. Go to https://supabase.com/ and sign up/login.
# 2. Create a new project. Wait for the database to be provisioned.
# 3. Go to Project Settings -> API.
# 4. Copy the "Project URL" and paste it as `SUPABASE_URL` in your .env file.
# 5. Copy the "anon" `public` key and paste it as `SUPABASE_KEY` in your .env file.
# 6. Go to "Table editor" or "SQL editor" in Supabase to create your tables
#    (e.g., `parsed_cvs` or `saved_jobs`).
# ----------------------------

supabase_client: Client | None = None

if settings.supabase_url:
    key_to_use = settings.supabase_service_role_key or settings.supabase_key
    if key_to_use:
        try:
            supabase_client = create_client(settings.supabase_url, key_to_use)
            logger.info("Supabase client initialized successfully.")
        except Exception as e:
            logger.error(f"Failed to initialize Supabase client: {e}")
            supabase_client = None

def get_supabase() -> Client | None:
    """Returns the Supabase client instance."""
    return supabase_client
