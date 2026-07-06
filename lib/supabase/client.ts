import { createBrowserClient } from "@supabase/ssr"

/**
 * Supabase client for use in Client Components. Persists the session in
 * cookies (via @supabase/ssr) so it stays in sync with the server client.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
