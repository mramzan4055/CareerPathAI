import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// HuggingFace Transformers for Deno via Supabase ecosystem
const model = new Supabase.ai.Session('gte-small');

serve(async (req) => {
  // CORS Headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { text } = await req.json()

    if (!text) {
      return new Response(
        JSON.stringify({ error: "No text provided" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      )
    }

    // Generate Embedding using Supabase built-in Transformers (gte-small)
    const embeddingResponse = await model.run(text, { mean_pool: true, normalize: true });
    
    // Convert Float32Array to standard array
    const embedding = Array.from(embeddingResponse);

    return new Response(
      JSON.stringify({ embedding }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    )
  }
})
