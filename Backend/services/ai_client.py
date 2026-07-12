from fastapi import HTTPException
from groq import AsyncGroq

from config import settings


async def get_ai_client() -> AsyncGroq:
    """Returns an asynchronous Groq client."""
    if not settings.groq_api_key or not settings.groq_api_key.startswith("gsk_"):
        raise HTTPException(
            status_code=500,
            detail="Server configuration error: GROQ_API_KEY is missing or invalid.",
        )
    return AsyncGroq(api_key=settings.groq_api_key)
