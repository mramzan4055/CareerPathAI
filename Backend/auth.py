import logging

from fastapi import Header, HTTPException

from database import get_supabase

logger = logging.getLogger(__name__)


async def get_current_user_id(authorization: str | None = Header(default=None)) -> str:
    """Verifies the Supabase JWT sent in the Authorization header and returns the user id.

    Verification is delegated to Supabase's Auth server (supabase.auth.get_user), so no
    JWT secret or JWKS handling is needed locally.
    """
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header.")

    token = authorization.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header.")

    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Database connection is not configured.")

    try:
        user_response = supabase.auth.get_user(token)
    except Exception as e:
        logger.warning(f"Token verification failed: {e}")
        raise HTTPException(status_code=401, detail="Invalid or expired token.")

    user = getattr(user_response, "user", None)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")

    return user.id
