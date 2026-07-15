import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * OAuth (PKCE) callback for Supabase — e.g. "continue with google".
 * Exchanges the auth code for a session cookie, then lands the user on the
 * same post-auth destination as email sign-in (/circle, which runs the
 * birth-chart bootstrap).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/circle"

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(new URL(next, request.url))
    }
  }

  // Exchange failed or code missing — back to sign-in with a note.
  return NextResponse.redirect(new URL("/sign-in?error=oauth", request.url))
}
