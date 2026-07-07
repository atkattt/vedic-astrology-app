/**
 * Resolved Supabase connection settings.
 *
 * These are PUBLIC values (the project URL and the anon/publishable key) that
 * are already shipped to the browser via the NEXT_PUBLIC_* env vars, so it is
 * safe to keep them here as fallbacks. This makes the app resilient to the
 * runtime environment losing the variables (e.g. after a revert or restart) —
 * env vars still take precedence when present.
 */
const FALLBACK_SUPABASE_URL = "https://euqkklpnvegrjecagzye.supabase.co"
const FALLBACK_SUPABASE_ANON_KEY =
  "sb_publishable_sb_publishable_okLhy4SZpnUot3Z0kt4Vjg_NUcBbanR"

export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_SUPABASE_URL

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY
