import logging

import httpx

from config import settings

logger = logging.getLogger(__name__)

async def call_gemini_api(prompt: str, json_mode: bool = False) -> str:
    """
    Invokes the Google Gemini API (gemini-1.5-flash) using httpx.
    If json_mode is True, responseMimeType is set to application/json.
    """
    if not settings.gemini_api_key:
        raise ValueError("GEMINI_API_KEY is not configured in settings.")

    # We use gemini-1.5-flash as the default reliable model name
    url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"
    
    headers = {
        "Content-Type": "application/json",
        "X-goog-api-key": settings.gemini_api_key
    }
    
    payload = {
        "contents": [
            {
                "parts": [
                    {"text": prompt}
                ]
            }
        ]
    }
    
    if json_mode:
        payload["generationConfig"] = {
            "responseMimeType": "application/json"
        }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            response_data = response.json()
            
            # Extract text content from the Gemini response structure
            text_result = response_data["candidates"][0]["content"]["parts"][0]["text"].strip()
            return text_result
            
    except httpx.HTTPStatusError as e:
        error_detail = e.response.text
        logger.error(f"Gemini API returned status code {e.response.status_code}: {error_detail}")
        raise RuntimeError(f"Gemini API error: {error_detail}")
    except Exception as e:
        logger.error(f"Error calling Gemini API: {str(e)}")
        raise RuntimeError(f"Gemini API request failed: {str(e)}")
