"use server"

import { createClient } from "@/lib/supabase/server"
import { db } from "@/lib/db"
import { userProgress } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

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
  // user's own id so RLS permits it. read_responses is the journey state
  // (answered reads) — without deleting it, a returning user's spiral would
  // rebuild mid-journey instead of starting fresh at the first star.
  const deletions = [
    supabase.from("charts").delete().eq("profile_id", userId),
    supabase.from("self_entries").delete().eq("profile_id", userId),
    supabase.from("conversations").delete().eq("profile_id", userId),
    supabase.from("read_responses").delete().eq("profile_id", userId),
  ]

  const results = await Promise.all(deletions)
  // Journey tables may not exist yet in older environments — ignore
  // "relation does not exist" (42P01) but surface real failures.
  const failed = results.find(
    (r) => r.error && r.error.code !== "42P01",
  )
  if (failed?.error) {
    return { error: failed.error.message }
  }

  // The revealed-frontier row lives in the Drizzle-managed database
  // (user_progress, keyed by userId), not Supabase — delete it there so the
  // fog reveal also starts over. Tolerate a missing table.
  try {
    await db.delete(userProgress).where(eq(userProgress.userId, userId))
  } catch {
    // table may not exist yet — journey reset still succeeds
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
