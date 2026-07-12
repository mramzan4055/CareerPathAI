import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('Warning: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.')
}

// WARNING: This client uses the service_role key. It bypasses RLS and should ONLY be used on the server side (API routes, NextAuth config).
// Never import this client in client-side/browser components.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseServiceKey || 'placeholder-key',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
)
