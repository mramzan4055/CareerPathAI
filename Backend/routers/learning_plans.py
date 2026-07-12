from fastapi import APIRouter, Depends, HTTPException

from auth import get_current_user_id
from database import get_supabase
from models import LearningPlanListResponse, SaveLearningPlanRequest, SaveLearningPlanResponse

router = APIRouter(prefix="/api/v1/learning-plans", tags=["Learning Plans"])


@router.post("", response_model=SaveLearningPlanResponse)
async def save_learning_plan(request: SaveLearningPlanRequest, current_user_id: str = Depends(get_current_user_id)):
    """
    Persists a skill-gap study roadmap so the user can revisit it later.
    """
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Database connection is not configured.")

    try:
        response = supabase.table("learning_plans").insert({
            "user_id": current_user_id,
            "cv_id": request.cv_id,
            "target_job_id": request.target_job_id,
            "title": request.title,
            "plan_data": request.plan_data,
        }).execute()

        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to save learning plan.")

        return {"status": "success", "id": response.data[0]["id"]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save learning plan: {str(e)}")


@router.get("", response_model=LearningPlanListResponse)
async def list_learning_plans(current_user_id: str = Depends(get_current_user_id)):
    """
    Lists all learning plans saved by the authenticated user.
    """
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Database connection is not configured.")

    try:
        response = supabase.table("learning_plans").select(
            "id, title, plan_data, created_at"
        ).eq("user_id", current_user_id).order("created_at", desc=True).execute()

        data = response.data if response.data else []
        return {"status": "success", "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch learning plans: {str(e)}")


@router.delete("/{plan_id}")
async def delete_learning_plan(plan_id: str, current_user_id: str = Depends(get_current_user_id)):
    """
    Deletes a saved learning plan. Only the owning user may delete it.
    """
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Database connection is not configured.")

    try:
        existing = supabase.table("learning_plans").select("user_id").eq("id", plan_id).maybe_single().execute()
        if not existing or not existing.data:
            raise HTTPException(status_code=404, detail="Learning plan not found.")

        if existing.data.get("user_id") != current_user_id:
            raise HTTPException(status_code=403, detail="You do not have access to this learning plan.")

        supabase.table("learning_plans").delete().eq("id", plan_id).execute()
        return {"status": "success", "message": "Learning plan deleted"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete learning plan: {str(e)}")
