import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.31.0'

// Initialize the model
const model = new Supabase.ai.Session('gte-small');

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { type, data } = await req.json()

    if (!type || !data) {
      return new Response(
        JSON.stringify({ error: "Missing 'type' or 'data' in request body" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      )
    }

    // Initialize Supabase Client with Auth context of the user invoking it
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    if (type === 'cv') {
      // data is a single CV object
      const textToEmbed = JSON.stringify(data.parsed_data);
      const embeddingResponse = await model.run(textToEmbed, { mean_pool: true, normalize: true });
      const embedding = Array.from(embeddingResponse);

      const { data: insertedCv, error } = await supabaseClient
        .from('cvs')
        .insert({
          user_id: data.user_id ?? null,
          name: data.name,
          parsed_data: data.parsed_data,
          embedding: embedding
        })
        .select('id')
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify({ status: "success", id: insertedCv.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    } 
    
    else if (type === 'batch_jobs') {
      // data is an array of jobs
      const jobsToUpsert = [];

      // Process embeddings in parallel or sequence. We'll do sequence to avoid memory overload in edge func.
      for (const job of data) {
        const textToEmbed = `${job.job_title} at ${job.company}. ${job.clean_description}`;
        const embeddingResponse = await model.run(textToEmbed, { mean_pool: true, normalize: true });
        
        jobsToUpsert.push({
          adzuna_id: String(job.adzuna_id || 'manual-' + Math.random()),
          query_used: job.query_used,
          job_title: job.job_title,
          company: job.company,
          location: job.location,
          clean_description: job.clean_description,
          embedding: Array.from(embeddingResponse)
        });
      }

      // Upsert the entire batch
      const { data: insertedJobs, error } = await supabaseClient
        .from('jobs')
        .upsert(jobsToUpsert, { onConflict: 'adzuna_id' })
        .select('id');

      if (error) throw error;

      return new Response(
        JSON.stringify({ status: "success", count: insertedJobs.length, ids: insertedJobs.map(j => j.id) }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    } 
    
    else {
      return new Response(
        JSON.stringify({ error: "Invalid type. Use 'cv' or 'batch_jobs'" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      )
    }

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    )
  }
})
