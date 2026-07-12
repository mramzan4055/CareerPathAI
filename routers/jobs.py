from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
import httpx
from config import settings
from models import JobResponse, MatchRequest, MatchResponse, SaveJobRequest, SavedJobResponse, SavedJobListResponse
from database import get_supabase
from services.adzuna import get_or_fetch_jobs
from auth import get_current_user_id

router = APIRouter(prefix="/jobs", tags=["Jobs"])

@router.get("/find")
async def find_jobs(
    background_tasks: BackgroundTasks,
    query: str = Query("software engineer", description="Job search keyword"), 
    location: str = Query("us", description="Location country code"), 
    results: int = Query(5, description="Number of results to fetch")
):
    """
    On-Demand Job Fetching.
    Checks Database first. If empty, fetches from Adzuna and returns immediately,
    while processing and vectorizing jobs in the background.
    """
    if not settings.adzuna_app_id or not settings.adzuna_app_key:
        raise HTTPException(status_code=500, detail="Adzuna API keys are not configured properly.")

    try:
        response_data = await get_or_fetch_jobs(query, location, results, background_tasks)
        
        return {
            "status": "success",
            "source": response_data["source"],
            "total_jobs": len(response_data["data"]),
            "data": response_data["data"]
        }

    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=f"Adzuna API Error: {e.response.text}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Job Fetch Error: {repr(e)}")

@router.post("/match", response_model=MatchResponse)
async def match_jobs_to_cv(request: MatchRequest, current_user_id: str = Depends(get_current_user_id)):
    """
    Semantic Job Matching Endpoint.
    Retrieves the CV's vector embedding from the database and runs cosine similarity
    against the vector jobs table, returning ranked matches.
    """
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Database connection is not configured.")

    try:
        # Step 1: Retrieve the CV embedding (and verify ownership)
        cv_response = supabase.table("cvs").select("embedding, user_id").eq("id", request.cv_id).maybe_single().execute()

        if not cv_response or not cv_response.data or not cv_response.data.get("embedding"):
            raise HTTPException(status_code=404, detail="CV not found in database. Please upload a new CV to generate a valid ID.")

        if cv_response.data.get("user_id") != current_user_id:
            raise HTTPException(status_code=403, detail="You do not have access to this CV.")

        cv_embedding = cv_response.data["embedding"]

        # Step 2: Call the Postgres RPC function to perform semantic match
        rpc_response = supabase.rpc(
            "match_jobs", 
            {
                "query_embedding": cv_embedding,
                "match_threshold": 0.4, # Adjust based on testing
                "match_count": request.limit
            }
        ).execute()

        matches = rpc_response.data if rpc_response.data else []
        for match in matches:
            match["match_percentage"] = round(match.get("similarity", 0) * 100, 2)

        return {
            "status": "success",
            "matches": matches
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Matching Error: {str(e)}")

@router.post("/save", response_model=SavedJobResponse)
async def save_job(request: SaveJobRequest, current_user_id: str = Depends(get_current_user_id)):
    """
    Saves a job listing for the authenticated user.
    """
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Database connection is not configured.")

    try:
        response = supabase.table("saved_jobs").insert({
            "user_id": current_user_id,
            "job_id": request.job_id
        }).execute()

        return {"status": "success", "message": "Job saved successfully"}
    except Exception as e:
        # Handle unique constraint violation gracefully
        if "duplicate key value" in str(e) or "23505" in str(e) or "already exists" in str(e):
            return {"status": "success", "message": "Job is already saved"}
        raise HTTPException(status_code=500, detail=f"Failed to save job: {str(e)}")

@router.get("/saved", response_model=SavedJobListResponse)
async def get_saved_jobs(current_user_id: str = Depends(get_current_user_id)):
    """
    Retrieves all saved jobs for the authenticated user.
    Uses Supabase JOIN syntax to fetch job details along with the saved_jobs record.
    """
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Database connection is not configured.")

    try:
        response = supabase.table("saved_jobs").select(
            "id, created_at, jobs(*)"
        ).eq("user_id", current_user_id).order("created_at", desc=True).execute()

        data = response.data if response.data else []
        return {"status": "success", "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch saved jobs: {str(e)}")

@router.delete("/unsave")
async def unsave_job(job_id: str = Query(..., description="The ID of the job to unsave"), current_user_id: str = Depends(get_current_user_id)):
    """
    Removes a job from the authenticated user's saved list.
    """
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Database connection is not configured.")

    try:
        response = supabase.table("saved_jobs").delete().eq("user_id", current_user_id).eq("job_id", job_id).execute()
        return {"status": "success", "message": "Job unsaved successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to unsave job: {str(e)}")

