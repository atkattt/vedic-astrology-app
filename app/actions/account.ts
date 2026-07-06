"use server"

import { createClient } from "@/lib/supabase/server"

/**
 * Permanently deletes the signed-in user's own data rows (chart, reads,
 * conversations, profile). Every delete is scoped to the session user id and
 * relies on row-level security, so a user can only ever remove their own rows.
 *
 * TODO: This does NOT delete the underlying Supabase auth user — that requires
 * the service-role key (admin.deleteUser) which isn't available to the client
 * session. Once a service-role key is added, call
 * `supabase.auth.admin.deleteUser(userId)` from a trusted server context to
 * fully remove the account.
 */
export async function deleteAccount(): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: "not signed in" }

  const userId = user.id

  // Delete dependent data first, then the profile row. Each is scoped to the
  // user's own id so RLS permits it.
  const deletions = [
    supabase.from("charts").delete().eq("profile_id", userId),
    supabase.from("self_entries").delete().eq("profile_id", userId),
    supabase.from("conversations").delete().eq("profile_id", userId),
  ]

  const results = await Promise.all(deletions)
  const failed = results.find((r) => r.error)
  if (failed?.error) {
    return { error: failed.error.message }
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .delete()
    .eq("id", userId)
  if (profileError) {
    return { error: profileError.message }
  }

  // Sign out on the server so the session cookie is cleared.
  await supabase.auth.signOut()

  return { error: null }
}
