import json

from fastapi import APIRouter, Depends, HTTPException
from groq import AsyncGroq

from auth import get_current_user_id
from config import settings
from database import get_supabase
from models import (
    CustomGapRequest,
    RecommendCoursesRequest,
    RecommendCoursesResponse,
    SkillGapResponse,
    UpdateTargetRoleRequest,
)


def _assert_cv_ownership(supabase, cv_id: str, current_user_id: str, select: str) -> dict:
    """Fetches the given CV row (selecting `select` plus user_id) and raises if it
    doesn't exist or isn't owned by current_user_id. Returns the row's data."""
    cv_response = supabase.table("cvs").select(f"{select}, user_id").eq("id", cv_id).maybe_single().execute()
    if not cv_response or not cv_response.data:
        raise HTTPException(status_code=404, detail="CV not found.")
    if cv_response.data.get("user_id") != current_user_id:
        raise HTTPException(status_code=403, detail="You do not have access to this CV.")
    return cv_response.data

router = APIRouter(prefix="/api/v1/skills", tags=["Skills & Gap Analysis"])

async def get_ai_client() -> AsyncGroq:
    """Returns an asynchronous Groq client."""
    if not settings.groq_api_key or not settings.groq_api_key.startswith("gsk_"):
        raise HTTPException(
            status_code=500,
            detail="Server configuration error: GROQ_API_KEY is missing or invalid.",
        )
    return AsyncGroq(api_key=settings.groq_api_key)

@router.put("/target-role")
async def update_target_role(request: UpdateTargetRoleRequest, current_user_id: str = Depends(get_current_user_id)):
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Database connection is not configured.")

    try:
        # Check ownership and whether the target role is already the same
        current = _assert_cv_ownership(supabase, request.cv_id, current_user_id, "target_job_id")
        if current.get("target_job_id") == request.target_job_id:
            return {"status": "success", "message": "Target role is already set."}

        # Update target_job_id and clear skill_gap_cache
        response = supabase.table("cvs").update({
            "target_job_id": request.target_job_id,
            "skill_gap_cache": None
        }).eq("id", request.cv_id).eq("user_id", current_user_id).execute()

        if not response.data:
            raise HTTPException(status_code=404, detail="CV not found.")

        return {"status": "success", "message": "Target role updated successfully and cache cleared."}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update target role: {str(e)}")

@router.get("/gap-analysis/{cv_id}", response_model=SkillGapResponse)
async def get_skill_gap_analysis(cv_id: str, current_user_id: str = Depends(get_current_user_id)):
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Database connection is not configured.")

    try:
        # 1. Fetch CV details (verifies ownership)
        cv_data = _assert_cv_ownership(supabase, cv_id, current_user_id, "parsed_data, target_job_id, skill_gap_cache")
        target_job_id = cv_data.get("target_job_id")
        
        if not target_job_id:
            raise HTTPException(status_code=400, detail="Target role is not set for this CV. Please set a target role first.")
            
        # 2. Check Cache
        if cv_data.get("skill_gap_cache"):
            return {
                "status": "success",
                "target_job_id": target_job_id,
                "missing_skills": cv_data["skill_gap_cache"]
            }
            
        # 3. Cache Miss - Fetch Job Description
        job_response = supabase.table("jobs").select("clean_description").eq("id", target_job_id).maybe_single().execute()
        
        if not job_response or not job_response.data:
            raise HTTPException(status_code=404, detail="Target job not found in the database.")
            
        job_description = job_response.data.get("clean_description")
        user_skills = cv_data.get("parsed_data", {}).get("skills", [])
        system_prompt = (
            "You are an expert career advisor. "
            "1. Identify the core skills required for the given target job description. "
            "2. Compare them against the user's current skills to find the gap. "
            "3. Return a JSON object with a single key 'missing_skills', which is a list of objects. "
            "Each object must have 'skill' (string), 'importance' (High, Medium, or Low), and 'reason' (string)."
        )
        
        user_prompt = f"User Skills:\n{user_skills}\n\nTarget Job Description:\n{job_description}"

        # 4. LLM Call (with Gemini fallback)
        ai_result_text = ""
        try:
            ai_client = await get_ai_client()
            llm_response = await ai_client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.2,
                response_format={"type": "json_object"}
            )
            ai_result_text = llm_response.choices[0].message.content.strip()
        except Exception as groq_error:
            import logging
            logging.getLogger(__name__).warning(f"Groq API call failed, falling back to Gemini: {str(groq_error)}")
            
            if not settings.gemini_api_key:
                raise HTTPException(
                    status_code=502,
                    detail=f"Groq failed ({str(groq_error)}) and Gemini API key is not configured."
                )
                
            from services.gemini import call_gemini_api
            gemini_prompt = f"System Prompt:\n{system_prompt}\n\nUser Input:\n{user_prompt}"
            try:
                ai_result_text = await call_gemini_api(prompt=gemini_prompt, json_mode=True)
            except Exception as gemini_error:
                raise HTTPException(
                    status_code=502,
                    detail=f"Both LLM providers failed. Groq error: {str(groq_error)}. Gemini error: {str(gemini_error)}"
                )
        
        # 5. Parse and Handle Robustness
        try:
            parsed_json = json.loads(ai_result_text)
            missing_skills = parsed_json.get("missing_skills", [])
        except json.JSONDecodeError:
            raise HTTPException(status_code=500, detail="Analysis failed, please try again")
            
        # 6. Save to Cache
        supabase.table("cvs").update({"skill_gap_cache": missing_skills}).eq("id", cv_id).execute()
        
        return {
            "status": "success",
            "target_job_id": target_job_id,
            "missing_skills": missing_skills
        }
        
    except HTTPException:
        raise
    except Exception as e:
        error_message = str(e)
        if "rate limit" in error_message.lower():
            raise HTTPException(status_code=429, detail="Groq API rate limit exceeded. Please retry shortly.")
        raise HTTPException(status_code=500, detail=f"Gap analysis failed: {error_message}")


@router.post("/gap-analysis/custom", response_model=SkillGapResponse)
async def get_custom_skill_gap_analysis(request: CustomGapRequest, current_user_id: str = Depends(get_current_user_id)):
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Database connection is not configured.")

    try:
        # 1. Fetch CV details (verifies ownership)
        cv_data = _assert_cv_ownership(supabase, request.cv_id, current_user_id, "parsed_data")
        user_skills = cv_data.get("parsed_data", {}).get("skills", [])
        
        system_prompt = (
            "You are an expert career advisor. "
            "1. Identify the core skills required for the given target job description. "
            "2. Compare them against the user's current skills to find the gap. "
            "3. Return a JSON object with a single key 'missing_skills', which is a list of objects. "
            "Each object must have 'skill' (string), 'importance' (High, Medium, or Low), and 'reason' (string)."
        )
        
        user_prompt = f"User Skills:\n{user_skills}\n\nTarget Job Description:\n{request.job_description}"

        # 4. LLM Call
        ai_result_text = ""
        try:
            ai_client = await get_ai_client()
            llm_response = await ai_client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.2,
                response_format={"type": "json_object"}
            )
            ai_result_text = llm_response.choices[0].message.content.strip()
        except Exception as groq_error:
            import logging
            logging.getLogger(__name__).warning(f"Groq API call failed: {str(groq_error)}")
            
            if not settings.gemini_api_key:
                raise HTTPException(
                    status_code=502,
                    detail=f"Groq failed ({str(groq_error)}) and Gemini API key is not configured."
                )
                
            from services.gemini import call_gemini_api
            gemini_prompt = f"System Prompt:\n{system_prompt}\n\nUser Input:\n{user_prompt}"
            try:
                ai_result_text = await call_gemini_api(prompt=gemini_prompt, json_mode=True)
            except Exception as gemini_error:
                raise HTTPException(
                    status_code=502,
                    detail=f"Both LLM providers failed. Groq error: {str(groq_error)}. Gemini error: {str(gemini_error)}"
                )
        
        # 5. Parse and Handle Robustness
        try:
            parsed_json = json.loads(ai_result_text)
            missing_skills = parsed_json.get("missing_skills", [])
        except json.JSONDecodeError:
            raise HTTPException(status_code=500, detail="Analysis failed, please try again")
            
        return {
            "status": "success",
            "target_job_id": "custom",
            "missing_skills": missing_skills
        }
        
    except HTTPException:
        raise
    except Exception as e:
        error_message = str(e)
        if "rate limit" in error_message.lower():
            raise HTTPException(status_code=429, detail="Groq API rate limit exceeded. Please retry shortly.")
        raise HTTPException(status_code=500, detail=f"Gap analysis failed: {error_message}")


@router.post("/recommend-courses", response_model=RecommendCoursesResponse)
async def recommend_courses(request: RecommendCoursesRequest, current_user_id: str = Depends(get_current_user_id)):
    if not request.missing_skills:
        return {"status": "success", "courses": []}
        
    system_prompt = (
        "You are an expert technical education advisor. "
        "Based on the provided list of missing skills, recommend 1 highly relevant online course for each missing skill. "
        "Recommend real, highly-rated courses from major providers like Coursera, Udemy, edX, or YouTube. "
        "Return a JSON object with a single key 'courses' which is a list of objects. "
        "Each object must have exactly these keys: 'title' (string), 'provider' (string), 'url' (string, a valid search URL for that provider like https://www.coursera.org/search?query=...), and 'difficulty' (string, must be Beginner, Intermediate, or Advanced)."
    )
    
    skills_text = "\n".join([f"- {s.skill} (Importance: {s.importance})" for s in request.missing_skills])
    user_prompt = f"Missing Skills:\n{skills_text}"
    
    try:
        ai_client = await get_ai_client()
        llm_response = await ai_client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.3,
            response_format={"type": "json_object"}
        )
        ai_result_text = llm_response.choices[0].message.content.strip()
        
        parsed_json = json.loads(ai_result_text)
        courses = parsed_json.get("courses", [])
        
        return {
            "status": "success",
            "courses": courses
        }
    except Exception as e:
        # Graceful fallback on error
        import logging
        logging.getLogger(__name__).error(f"Course recommendation failed: {str(e)}")
        return {"status": "error", "courses": []}
