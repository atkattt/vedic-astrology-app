"use server"

import { createClient } from "@/lib/supabase/server"
import type { TruthScope } from "@/lib/spiral/reads"

// What-you-know entries persist in self_entries alongside read answers,
// distinguished by kind: 'truth-about-me' | 'truth-about-bond' (answers use
// kind='answer' with a fragment_id; truths are free-standing, fragment_id
// null). Guests never reach these actions — their entries stay client-side.

type Result<T = undefined> =
  | (T extends undefined ? { ok: true } : { ok: true; data: T })
  | { ok: false; error: string }

function kindFor(scope: TruthScope) {
  return `truth-${scope}` as const
}

export type TruthRow = {
  id: string
  text: string
  scope: TruthScope
  createdAt: number
}

/** Load the current user's saved entries, newest first. */
export async function listTruths(): Promise<TruthRow[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from("self_entries")
    .select("id, kind, content, created_at")
    .eq("profile_id", user.id)
    .in("kind", ["truth-about-me", "truth-about-bond"])
    .order("created_at", { ascending: false })

  return (data ?? []).flatMap((row) => {
    const r = row as {
      id: string
      kind: string
      content: string | null
      created_at: string | null
    }
    if (!r.content) return []
    return [
      {
        id: r.id,
        text: r.content,
        scope: (r.kind === "truth-about-bond"
          ? "about-bond"
          : "about-me") as TruthScope,
        createdAt: r.created_at ? Date.parse(r.created_at) : Date.now(),
      },
    ]
  })
}

/** Save a new entry; returns the DB row id so edits/deletes can target it. */
export async function addTruthEntry(
  text: string,
  scope: TruthScope,
): Promise<Result<{ id: string }>> {
  const trimmed = text.trim()
  if (!trimmed) return { ok: false, error: "empty entry" }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "not signed in" }

  const { data, error } = await supabase
    .from("self_entries")
    .insert({
      profile_id: user.id,
      fragment_id: null,
      kind: kindFor(scope),
      content: trimmed,
    })
    .select("id")
    .single()

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: { id: (data as { id: string }).id } }
}

/** Update an entry's text in place on its own row. */
export async function updateTruthEntry(
  id: string,
  text: string,
): Promise<Result> {
  const trimmed = text.trim()
  if (!trimmed) return { ok: false, error: "empty entry" }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "not signed in" }

  const { error } = await supabase
    .from("self_entries")
    .update({ content: trimmed })
    .eq("id", id)
    .eq("profile_id", user.id)

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

/** Hard delete an entry. */
export async function deleteTruthEntry(id: string): Promise<Result> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "not signed in" }

  const { error } = await supabase
    .from("self_entries")
    .delete()
    .eq("id", id)
    .eq("profile_id", user.id)

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}
