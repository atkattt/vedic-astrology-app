import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase/config"

const supabaseUrl = SUPABASE_URL
const supabaseAnonKey = SUPABASE_ANON_KEY

let client: SupabaseClient | null = null

/**
 * Lazily create the Supabase client. Returns an error string (instead of
 * throwing at module-evaluation time) when the env vars are missing, so
 * pages can render a readable message rather than crashing on import.
 */
export function getSupabase():
  | { client: SupabaseClient; error: null }
  | { client: null; error: string } {
  if (!supabaseUrl || !supabaseAnonKey) {
    const missing = [
      !supabaseUrl && "NEXT_PUBLIC_SUPABASE_URL",
      !supabaseAnonKey && "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    ]
      .filter(Boolean)
      .join(", ")
    return { client: null, error: `missing env var(s): ${missing}` }
  }

  if (!client) client = createClient(supabaseUrl, supabaseAnonKey)
  return { client, error: null }
}
