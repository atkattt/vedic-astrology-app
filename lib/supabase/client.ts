import { createBrowserClient } from "@supabase/ssr"
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config"

/**
 * Supabase client for use in Client Components. Persists the session in
 * cookies (via @supabase/ssr) so it stays in sync with the server client.
 */
export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
}
