import httpx
import json
import logging
from fastapi import BackgroundTasks
from config import settings
from groq import AsyncGroq
from database import get_supabase
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

async def process_and_save_jobs_background(raw_jobs: list, query: str):
    """
    Background task to clean jobs with Groq and send to Edge Function for embedding & saving.
    """
    if not raw_jobs:
        return
        
    try:
        # Step 1: Clean via Groq
        ai_client = AsyncGroq(api_key=settings.groq_api_key)
        prompt = f"""
        You are an AI data extractor. Clean the descriptions and return ONLY a JSON array.
        Keys must be exactly: 'job_title', 'company', 'location', 'clean_description', 'adzuna_id', 'salary_min', 'salary_max', 'contract_time', 'contract_type', 'url'.
        Keep the metadata values exactly as provided in the Raw Data, just clean the description to be concise and ATS-focused.
        Raw Data: {json.dumps(raw_jobs)}
        """

        groq_res = await ai_client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": "You strictly output valid JSON arrays."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.2
        )

        result_text = groq_res.choices[0].message.content.strip()
        if result_text.startswith("```json"):
            result_text = result_text.replace("```json", "").replace("```", "").strip()
        elif result_text.startswith("```"):
            result_text = result_text.replace("```", "").strip()

        cleaned_jobs = json.loads(result_text)
        
        # Inject the query used into each job so it can be saved properly
        for job in cleaned_jobs:
            job["query_used"] = query.lower()

        # Step 2: Send entire batch to Edge Function for embedding and bulk upsert
        supabase = get_supabase()
        if supabase:
            response = supabase.functions.invoke(
                "process-embeddings",
                invoke_options={
                    "body": {
                        "type": "batch_jobs",
                        "data": cleaned_jobs
                    }
                }
            )
            
            if isinstance(response, bytes):
                data = json.loads(response.decode("utf-8"))
            elif hasattr(response, "json"):
                data = response.json()
            else:
                data = response
                
            if isinstance(data, dict) and "error" in data:
                logger.error(f"Edge Function Batch Insert Error: {data['error']}")
            else:
                logger.info(f"Successfully vectorized and inserted {data.get('count', len(cleaned_jobs))} jobs in background.")

    except Exception as e:
        logger.error(f"Background task failed to process jobs: {e}")

async def get_or_fetch_jobs(query: str, location: str, results: int, bg_tasks: BackgroundTasks) -> dict:
    """
    Intelligent on-demand job fetcher returning instant results.
    """
    supabase = get_supabase()
    
    # Step 1: Check cache in DB (jobs from last 24 hours)
    if supabase:
        yesterday = (datetime.utcnow() - timedelta(days=1)).isoformat()
        try:
            db_response = supabase.table("jobs")\
                .select("id, adzuna_id, job_title, company, location, clean_description, salary_min, salary_max, contract_time, contract_type, url")\
                .eq("query_used", query.lower())\
                .gte("created_at", yesterday)\
                .limit(results)\
                .execute()
                
            if db_response.data and len(db_response.data) >= (results // 2): # If we have at least half the requested jobs, just return them
                return {
                    "source": "database",
                    "data": db_response.data
                }
        except Exception as e:
            logger.error(f"Database cache read error: {e}")

    # Step 2: Fetch from Adzuna if cache miss or insufficient jobs
    adzuna_url = f"https://api.adzuna.com/v1/api/jobs/{location}/search/1"
    params = {
        "app_id": settings.adzuna_app_id,
        "app_key": settings.adzuna_app_key,
        "results_per_page": results,
        "what": query,
        "content-type": "application/json"
    }

    async with httpx.AsyncClient() as client:
        adzuna_res = await client.get(adzuna_url, params=params)
        adzuna_res.raise_for_status()
        raw_jobs = adzuna_res.json().get("results", [])

    if not raw_jobs:
        return {"source": "adzuna", "data": []}

    # Prepare trimmed raw jobs for background task
    trimmed_jobs = [
        {
            "adzuna_id": str(job.get("id")),
            "title": job.get("title", ""),
            "description": job.get("description", ""),
            "company": job.get("company", {}).get("display_name", ""),
            "location": job.get("location", {}).get("display_name", ""),
            "salary_min": job.get("salary_min"),
            "salary_max": job.get("salary_max"),
            "contract_time": job.get("contract_time"),
            "contract_type": job.get("contract_type"),
            "url": job.get("redirect_url")
        } for job in raw_jobs
    ]

    # Queue the heavy processing in the background!
    bg_tasks.add_task(process_and_save_jobs_background, trimmed_jobs, query)

    # Immediately format raw jobs to match the required UI response schema and return instantly
    instant_response = [
        {
            "job_title": job["title"],
            "company": job["company"],
            "location": job["location"],
            "clean_description": job["description"],
            "salary_min": job["salary_min"],
            "salary_max": job["salary_max"],
            "contract_time": job["contract_time"],
            "contract_type": job["contract_type"],
            "url": job["url"]
        } for job in trimmed_jobs
    ]

    return {
        "source": "adzuna (background processing started)",
        "data": instant_response
    }
