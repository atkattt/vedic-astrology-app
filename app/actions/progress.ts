"use server"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { userProgress } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { headers } from "next/headers"

// The starting frontier — covers the user's own inner read-ring so their chart
// is reachable from the start (mirrors BASE_REVEAL_RADIUS on the client).
const BASE_REVEAL_RADIUS = 240

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error("Unauthorized")
  return session.user.id
}

/** Read the saved reveal frontier for the current user (defaults to base). */
export async function getRevealRadius(): Promise<number> {
  const userId = await getUserId()
  const [row] = await db
    .select()
    .from(userProgress)
    .where(eq(userProgress.userId, userId))
    .limit(1)
  return row?.revealRadius ?? BASE_REVEAL_RADIUS
}

/**
 * Persist the user's reveal frontier. The frontier only ever expands, so we
 * keep the larger of the stored and incoming values to guard against races.
 */
export async function saveRevealRadius(revealRadius: number): Promise<void> {
  const userId = await getUserId()
  const next = Math.max(BASE_REVEAL_RADIUS, Math.round(revealRadius))
  await db
    .insert(userProgress)
    .values({ userId, revealRadius: next, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: userProgress.userId,
      set: { revealRadius: next, updatedAt: new Date() },
    })
}
