"use server"

import { createClient } from "@/lib/supabase/server"
import type { TruthScope } from "@/lib/spiral/reads"

// What-you-know entries persist in self_entries alongside read answers,
// distinguished by kind: 'truth-about-me' | 'truth-about-bond' (answers use
// kind='answer' with a fragment_id; truths are free-standing, fragment_id
// null). Guests never reach these actions — their entries stay client-side.
//
// "Sent to your self" is encoded as a '-sent' suffix on the kind
// ('truth-about-me-sent'), so it persists without a schema change. When the
// self has brought a sent entry up in conversation, it becomes '-sent-heard'
// — still sent, but no longer "new since the last conversation".

const TRUTH_KINDS = [
  "truth-about-me",
  "truth-about-bond",
  "truth-about-me-sent",
  "truth-about-bond-sent",
  "truth-about-me-sent-heard",
  "truth-about-bond-sent-heard",
] as const

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
  sentToSelf: boolean
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
    .in("kind", [...TRUTH_KINDS])
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
        scope: (r.kind.startsWith("truth-about-bond")
          ? "about-bond"
          : "about-me") as TruthScope,
        createdAt: r.created_at ? Date.parse(r.created_at) : Date.now(),
        sentToSelf: r.kind.includes("-sent"),
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

/** Mark an entry as handed to the self ('-sent' suffix on its kind). */
export async function markTruthSent(id: string): Promise<Result> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "not signed in" }

  // Read the row's scope so the new kind keeps it.
  const { data: row } = await supabase
    .from("self_entries")
    .select("kind")
    .eq("id", id)
    .eq("profile_id", user.id)
    .single()
  if (!row) return { ok: false, error: "entry not found" }

  const kind = (row as { kind: string }).kind
  if (kind.includes("-sent")) return { ok: true }

  const { error } = await supabase
    .from("self_entries")
    .update({ kind: `${kind}-sent` })
    .eq("id", id)
    .eq("profile_id", user.id)

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

/**
 * Everything the self chat needs from what-you-know, split by weight:
 * - sentNew: handed to the self and not yet brought up — the self opens with one
 * - sent: handed to the self (elevated grounding)
 * - kept: ordinary entries (still ground the chat)
 */
export async function listTruthsForGrounding(): Promise<{
  sentNew: TruthRow[]
  sent: TruthRow[]
  kept: TruthRow[]
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { sentNew: [], sent: [], kept: [] }

  const { data } = await supabase
    .from("self_entries")
    .select("id, kind, content, created_at")
    .eq("profile_id", user.id)
    .in("kind", [...TRUTH_KINDS])
    .order("created_at", { ascending: false })

  const sentNew: TruthRow[] = []
  const sent: TruthRow[] = []
  const kept: TruthRow[] = []
  for (const row of data ?? []) {
    const r = row as {
      id: string
      kind: string
      content: string | null
      created_at: string | null
    }
    if (!r.content) continue
    const entry: TruthRow = {
      id: r.id,
      text: r.content,
      scope: (r.kind.startsWith("truth-about-bond")
        ? "about-bond"
        : "about-me") as TruthScope,
      createdAt: r.created_at ? Date.parse(r.created_at) : Date.now(),
      sentToSelf: r.kind.includes("-sent"),
    }
    if (r.kind.endsWith("-sent-heard")) sent.push(entry)
    else if (r.kind.endsWith("-sent")) {
      sentNew.push(entry)
      sent.push(entry)
    } else kept.push(entry)
  }
  return { sentNew, sent, kept }
}

/**
 * After the self has opened a conversation with the newly sent entries, mark
 * them heard so the next session doesn't repeat them. Sent status remains.
 */
export async function markSentTruthsHeard(ids: string[]): Promise<Result> {
  if (ids.length === 0) return { ok: true }
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "not signed in" }

  const { data } = await supabase
    .from("self_entries")
    .select("id, kind")
    .eq("profile_id", user.id)
    .in("id", ids)

  for (const row of data ?? []) {
    const r = row as { id: string; kind: string }
    if (!r.kind.endsWith("-sent")) continue
    await supabase
      .from("self_entries")
      .update({ kind: `${r.kind}-heard` })
      .eq("id", r.id)
      .eq("profile_id", user.id)
  }
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
