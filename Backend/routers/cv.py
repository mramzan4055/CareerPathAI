import json
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from pypdf import PdfReader
from groq import AsyncGroq
from config import settings
from models import CVResponse, CVData
from database import get_supabase
from auth import get_current_user_id

router = APIRouter(prefix="/api/v1/parser", tags=["CV Parser"])

# Initialize Async Groq client
if not settings.groq_api_key or not settings.groq_api_key.startswith("gsk_"):
    # Wait until runtime to raise exception so the app can start without it for other routes,
    # or handle it nicely in the endpoint.
    pass

async def get_ai_client() -> AsyncGroq:
    """Returns an asynchronous Groq client."""
    if not settings.groq_api_key or not settings.groq_api_key.startswith("gsk_"):
        raise HTTPException(
            status_code=500,
            detail="Server configuration error: GROQ_API_KEY is missing or invalid.",
        )
    return AsyncGroq(api_key=settings.groq_api_key)

@router.post("/resume", response_model=CVResponse)
async def parse_resume(
    file: UploadFile = File(...),
    current_user_id: str = Depends(get_current_user_id),
):
    """
    Parses a PDF resume and returns structured JSON data.
    """
    if not file.filename or not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed.")
    
    try:
        # 1. Extract text from PDF
        pdf_reader = PdfReader(file.file)
        raw_text = ""
        for page in pdf_reader.pages:
            text = page.extract_text()
            if text:
                raw_text += text + "\n"
        
        if not raw_text.strip():
            raise HTTPException(status_code=400, detail="Could not extract text from PDF.")

        # 2. Strict Prompt so Llama / Gemini extracts all ATS CV sections
        system_prompt = (
            "You are an expert AI Resume Parser. Analyze the provided resume text and extract information "
            "strictly into the following JSON format. "
            "Do not include any conversational text, markdown, or code blocks. Return ONLY the raw JSON.\n\n"
            "Required JSON Structure:\n"
            "{\n"
            "  \"name\": \"Full Name\",\n"
            "  \"location\": \"City, Country or empty\",\n"
            "  \"phone\": \"Phone Number or empty\",\n"
            "  \"email\": \"Professional Email or empty\",\n"
            "  \"linkedin\": \"LinkedIn Link or empty\",\n"
            "  \"github\": \"GitHub/Portfolio Link or empty\",\n"
            "  \"summary\": \"3 to 4 sentence professional summary/elevator pitch\",\n"
            "  \"skills\": [\"Combined list of all core technical skills for compatibility (e.g. Python, SQL, React)\"],\n"
            "  \"skills_breakdown\": {\n"
            "       \"languages\": [\"Languages list, e.g. Python, SQL\"],\n"
            "       \"frameworks\": [\"Frameworks/libraries, e.g. React, Django\"],\n"
            "       \"databases\": [\"Databases/Tools, e.g. Docker, Git, PostgreSQL\"],\n"
            "       \"ml_domain\": [\"Machine learning/domain, e.g. Scikit-learn, NLP, REST APIs\"]\n"
            "  },\n"
            "  \"projects\": [\n"
            "       {\n"
            "           \"title\": \"Project Name\",\n"
            "           \"tech_stack\": [\"Tech Stack Used\"],\n"
            "           \"points\": [\"Action bullet points describing project accomplishments\"]\n"
            "       }\n"
            "  ],\n"
            "  \"experience\": [\"Brief single sentence summary lines for compatibility\"],\n"
            "  \"experience_details\": [\n"
            "       {\n"
            "           \"title\": \"Job Title\",\n"
            "           \"company\": \"Company Name\",\n"
            "           \"location\": \"Location\",\n"
            "           \"dates\": \"Dates (e.g., 2022 - 2024)\",\n"
            "           \"points\": [\"Action verb bullet points summarizing achievements\"]\n"
            "       }\n"
            "  ],\n"
            "  \"education\": [\n"
            "       {\n"
            "           \"degree\": \"Degree Name\",\n"
            "           \"institution\": \"Institution Name\",\n"
            "           \"location\": \"Location\",\n"
            "           \"dates\": \"Graduation Dates\",\n"
            "           \"highlights\": \"Academic Highlights\"\n"
            "       }\n"
            "  ],\n"
            "  \"certifications\": [\n"
            "       {\n"
            "           \"title\": \"Certification Title\",\n"
            "           \"issuer\": \"Issuing Organization\",\n"
            "           \"date\": \"Month Year\"\n"
            "       }\n"
            "  ]\n"
            "}"
        )

        # 3. Call LLM (with Gemini fallback)
        ai_result = ""
        try:
            ai_client = await get_ai_client()
            response = await ai_client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Resume Text:\n{raw_text}"}
                ],
                temperature=0.2
            )
            ai_result = response.choices[0].message.content.strip()
        except Exception as groq_error:
            import logging
            logging.getLogger(__name__).warning(f"Groq API call failed, falling back to Gemini: {str(groq_error)}")
            
            if not settings.gemini_api_key:
                raise HTTPException(
                    status_code=502,
                    detail=f"Groq failed ({str(groq_error)}) and Gemini API key is not configured."
                )
                
            from services.gemini import call_gemini_api
            gemini_prompt = f"System Rules:\n{system_prompt}\n\nResume Text to Parse:\n{raw_text}"
            try:
                ai_result = await call_gemini_api(prompt=gemini_prompt, json_mode=True)
            except Exception as gemini_error:
                raise HTTPException(
                    status_code=502,
                    detail=f"Both LLM providers failed. Groq error: {str(groq_error)}. Gemini error: {str(gemini_error)}"
                )

        # 4. Clean and parse AI response
        
        # Remove markdown backticks if present
        if ai_result.startswith("```json"):
            ai_result = ai_result.replace("```json", "").replace("```", "").strip()
        elif ai_result.startswith("```"):
            ai_result = ai_result.replace("```", "").strip()
            
        parsed_json = json.loads(ai_result)
        
        # 5. Send to Supabase Edge Function for Embedding and DB Insertion
        from services.embeddings import process_and_save_data
        edge_response = await process_and_save_data(
            type="cv",
            data={
                "user_id": current_user_id,
                "name": parsed_json.get("name", "Unknown User"),
                "parsed_data": parsed_json
            }
        )
        
        # Return the CV ID generated by the Edge Function
        cv_id = edge_response.get("id")

        return {
            "status": "success", 
            "extracted_data": parsed_json,
            "cv_id": cv_id
        }

    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail=f"AI returned invalid JSON structure. Raw Output: {ai_result}")
    except HTTPException:
        raise
    except Exception as e:
        error_message = str(e)
        lowered_message = error_message.lower()

        if "invalid api key" in lowered_message or "invalid_api_key" in lowered_message:
            raise HTTPException(status_code=401, detail="Invalid GROQ_API_KEY. Please set a valid key.")

        if "rate limit" in lowered_message:
            raise HTTPException(status_code=429, detail="Groq API rate limit exceeded. Please retry shortly.")

        raise HTTPException(status_code=502, detail=f"Groq request failed: {error_message}")


@router.get("/cv/{cv_id}", response_model=CVData)
async def get_cv(cv_id: str, current_user_id: str = Depends(get_current_user_id)):
    """
    Retrieves the parsed CV data by its database ID. Only the owning user may access it.
    """
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Database connection is not configured.")

    try:
        cv_response = supabase.table("cvs").select("parsed_data, user_id").eq("id", cv_id).maybe_single().execute()
        if not cv_response or not cv_response.data:
            raise HTTPException(status_code=404, detail="CV not found.")

        if cv_response.data.get("user_id") != current_user_id:
            raise HTTPException(status_code=403, detail="You do not have access to this CV.")

        return cv_response.data["parsed_data"]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch CV: {str(e)}")


@router.put("/cv/{cv_id}", response_model=CVResponse)
async def update_cv(cv_id: str, request_data: CVData, current_user_id: str = Depends(get_current_user_id)):
    """
    Updates the parsed CV data by its database ID and clears the skill gap cache.
    Only the owning user may update it.
    """
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Database connection is not configured.")

    try:
        existing = supabase.table("cvs").select("user_id").eq("id", cv_id).maybe_single().execute()
        if not existing or not existing.data:
            raise HTTPException(status_code=404, detail="CV not found.")

        if existing.data.get("user_id") != current_user_id:
            raise HTTPException(status_code=403, detail="You do not have access to this CV.")

        response = supabase.table("cvs").update({
            "parsed_data": request_data.dict(),
            "name": request_data.name,
            "skill_gap_cache": None  # Clear cache since CV details have been edited
        }).eq("id", cv_id).eq("user_id", current_user_id).execute()

        if not response.data:
            raise HTTPException(status_code=404, detail="CV not found.")

        return {
            "status": "success",
            "extracted_data": response.data[0]["parsed_data"],
            "cv_id": cv_id
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update CV: {str(e)}")


