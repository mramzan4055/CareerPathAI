import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

// This client is browser-safe and can be used in client-side components.
// It relies on RLS policies configured in your Supabase database.
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
