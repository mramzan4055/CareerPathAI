from database import get_supabase
import logging
import json

logger = logging.getLogger(__name__)

async def process_and_save_data(type: str, data: dict | list) -> dict:
    """
    Invokes the Supabase Edge Function to generate embeddings and save the data to the database.
    type: 'cv' or 'batch_jobs'
    data: Dict for CV, List of Dicts for batch_jobs
    """
    supabase = get_supabase()
    if not supabase:
        raise RuntimeError("Supabase client is not initialized. Cannot generate embeddings or save data.")

    try:
        response = supabase.functions.invoke(
            "process-embeddings",
            invoke_options={"body": {"type": type, "data": data}}
        )
        
        if isinstance(response, bytes):
            result_data = json.loads(response.decode("utf-8"))
        elif hasattr(response, "json"):
            result_data = response.json()
        else:
            result_data = response

        if isinstance(result_data, dict) and "error" in result_data:
            logger.error(f"Edge Function Error: {result_data['error']}")
            raise ValueError(f"Edge Function failed: {result_data['error']}")
            
        return result_data
        
    except Exception as e:
        logger.error(f"Error calling Supabase Edge Function: {str(e)}")
        raise RuntimeError(f"Error in embedding/saving service: {str(e)}")
