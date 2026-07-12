import logging

from fastapi import APIRouter, Depends, HTTPException

from auth import get_current_user_id
from config import settings
from database import get_supabase
from models import (
    CoverLetterListResponse,
    GenerateCoverLetterRequest,
    GenerateCoverLetterResponse,
)
from services.ai_client import get_ai_client

router = APIRouter(prefix="/api/v1/cover-letters", tags=["Cover Letters"])


@router.post("/generate", response_model=GenerateCoverLetterResponse)
async def generate_cover_letter(request: GenerateCoverLetterRequest, current_user_id: str = Depends(get_current_user_id)):
    """
    Generates a personalized cover letter from a CV and a job (stored job_id or
    ad-hoc job_description), and saves it for the user.
    """
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Database connection is not configured.")

    try:
        cv_response = supabase.table("cvs").select("parsed_data, user_id").eq("id", request.cv_id).maybe_single().execute()
        if not cv_response or not cv_response.data:
            raise HTTPException(status_code=404, detail="CV not found.")
        if cv_response.data.get("user_id") != current_user_id:
            raise HTTPException(status_code=403, detail="You do not have access to this CV.")

        parsed_data = cv_response.data["parsed_data"]

        job_title = "the target role"
        company_name = "the company"
        job_description = request.job_description

        if request.job_id:
            job_response = supabase.table("jobs").select("job_title, company, clean_description").eq("id", request.job_id).maybe_single().execute()
            if not job_response or not job_response.data:
                raise HTTPException(status_code=404, detail="Target job not found.")
            job_title = job_response.data.get("job_title", job_title)
            company_name = job_response.data.get("company", company_name)
            job_description = job_response.data.get("clean_description", job_description)

        if not job_description:
            raise HTTPException(status_code=400, detail="Either job_id or job_description must be provided.")

        system_prompt = (
            "You are an expert career coach and professional cover letter writer. Write a compelling, "
            f"personalized cover letter in a {request.tone or 'professional'} tone, based on the candidate's "
            "resume data and the job description provided. Reference specific skills, projects, and experience "
            "from the resume that map directly to the job's requirements. Do not invent facts not present in "
            "the resume. Do not use placeholder brackets like [Company Name] -- use the actual company and job "
            "title given. Return ONLY the raw cover letter text (plain prose, no markdown, no JSON, no code "
            "blocks, no subject line). 3 to 4 paragraphs."
        )
        user_prompt = (
            f"Job Title: {job_title}\nCompany: {company_name}\n\n"
            f"Job Description:\n{job_description}\n\n"
            f"Candidate Resume Data (JSON):\n{parsed_data}"
        )

        content = ""
        try:
            ai_client = await get_ai_client()
            llm_response = await ai_client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.5,
            )
            content = llm_response.choices[0].message.content.strip()
        except Exception as groq_error:
            logging.getLogger(__name__).warning(f"Groq API call failed, falling back to Gemini: {str(groq_error)}")

            if not settings.gemini_api_key:
                raise HTTPException(
                    status_code=502,
                    detail=f"Groq failed ({str(groq_error)}) and Gemini API key is not configured."
                )

            from services.gemini import call_gemini_api
            gemini_prompt = f"System Rules:\n{system_prompt}\n\nUser Input:\n{user_prompt}"
            try:
                content = await call_gemini_api(prompt=gemini_prompt, json_mode=False)
            except Exception as gemini_error:
                raise HTTPException(
                    status_code=502,
                    detail=f"Both LLM providers failed. Groq error: {str(groq_error)}. Gemini error: {str(gemini_error)}"
                )

        title = f"Cover Letter - {job_title} at {company_name}"
        insert_response = supabase.table("cover_letters").insert({
            "user_id": current_user_id,
            "cv_id": request.cv_id,
            "job_id": request.job_id,
            "title": title,
            "content": content,
        }).execute()

        if not insert_response.data:
            raise HTTPException(status_code=500, detail="Failed to save generated cover letter.")

        return {
            "status": "success",
            "id": insert_response.data[0]["id"],
            "content": content,
        }

    except HTTPException:
        raise
    except Exception as e:
        error_message = str(e)
        if "rate limit" in error_message.lower():
            raise HTTPException(status_code=429, detail="Groq API rate limit exceeded. Please retry shortly.")
        raise HTTPException(status_code=500, detail=f"Cover letter generation failed: {error_message}")


@router.get("", response_model=CoverLetterListResponse)
async def list_cover_letters(current_user_id: str = Depends(get_current_user_id)):
    """
    Lists all cover letters saved by the authenticated user.
    """
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Database connection is not configured.")

    try:
        response = supabase.table("cover_letters").select(
            "id, title, content, created_at"
        ).eq("user_id", current_user_id).order("created_at", desc=True).execute()

        data = response.data if response.data else []
        return {"status": "success", "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch cover letters: {str(e)}")


@router.delete("/{letter_id}")
async def delete_cover_letter(letter_id: str, current_user_id: str = Depends(get_current_user_id)):
    """
    Deletes a saved cover letter. Only the owning user may delete it.
    """
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Database connection is not configured.")

    try:
        existing = supabase.table("cover_letters").select("user_id").eq("id", letter_id).maybe_single().execute()
        if not existing or not existing.data:
            raise HTTPException(status_code=404, detail="Cover letter not found.")

        if existing.data.get("user_id") != current_user_id:
            raise HTTPException(status_code=403, detail="You do not have access to this cover letter.")

        supabase.table("cover_letters").delete().eq("id", letter_id).execute()
        return {"status": "success", "message": "Cover letter deleted"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete cover letter: {str(e)}")
