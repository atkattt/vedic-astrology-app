"use server"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { people, relationships } from "@/lib/db/schema"
import { and, asc, eq, inArray, or } from "drizzle-orm"
import { headers } from "next/headers"
import { revalidatePath } from "next/cache"

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error("Unauthorized")
  return session.user.id
}

export async function getPeople() {
  const userId = await getUserId()
  return db
    .select()
    .from(people)
    .where(eq(people.userId, userId))
    .orderBy(asc(people.createdAt))
}

export async function getRelationships() {
  const userId = await getUserId()
  return db
    .select()
    .from(relationships)
    .where(eq(relationships.userId, userId))
    .orderBy(asc(relationships.createdAt))
}

type AddPersonInput = {
  name: string
  birthDate?: string | null
  birthTime?: string | null
  birthTimeUnknown: boolean
  birthPlace?: string | null
}

export async function addPerson(input: AddPersonInput) {
  const userId = await getUserId()

  // Scatter the new star somewhere within the circle (10%-90% range).
  const posX = Math.floor(15 + Math.random() * 70)
  const posY = Math.floor(15 + Math.random() * 70)

  const [created] = await db
    .insert(people)
    .values({
      userId,
      name: input.name.trim(),
      birthDate: input.birthDate?.trim() || null,
      birthTime: input.birthTimeUnknown ? null : input.birthTime?.trim() || null,
      birthTimeUnknown: input.birthTimeUnknown,
      birthPlace: input.birthPlace?.trim() || null,
      posX,
      posY,
    })
    .returning()

  revalidatePath("/circle")
  return created
}

export async function updatePerson(id: number, input: AddPersonInput) {
  const userId = await getUserId()
  await db
    .update(people)
    .set({
      name: input.name.trim(),
      birthDate: input.birthDate?.trim() || null,
      birthTime: input.birthTimeUnknown ? null : input.birthTime?.trim() || null,
      birthTimeUnknown: input.birthTimeUnknown,
      birthPlace: input.birthPlace?.trim() || null,
    })
    .where(and(eq(people.id, id), eq(people.userId, userId)))

  revalidatePath("/circle")
}

export async function deletePerson(id: number) {
  const userId = await getUserId()

  // Remove any bonds touching this person first.
  await db
    .delete(relationships)
    .where(
      and(
        eq(relationships.userId, userId),
        or(
          eq(relationships.fromPersonId, id),
          eq(relationships.toPersonId, id),
        ),
      ),
    )

  await db
    .delete(people)
    .where(and(eq(people.id, id), eq(people.userId, userId)))

  revalidatePath("/circle")
}

export async function addRelationship(
  fromPersonId: number,
  toPersonId: number,
  kind: string,
) {
  const userId = await getUserId()
  if (fromPersonId === toPersonId) throw new Error("Cannot connect a person to themselves")

  // Verify both people belong to this user.
  const owned = await db
    .select({ id: people.id })
    .from(people)
    .where(
      and(
        eq(people.userId, userId),
        inArray(people.id, [fromPersonId, toPersonId]),
      ),
    )
  if (owned.length !== 2) throw new Error("Invalid people")

  const [created] = await db
    .insert(relationships)
    .values({ userId, fromPersonId, toPersonId, kind })
    .returning()

  revalidatePath("/circle")
  return created
}

export async function deleteRelationship(id: number) {
  const userId = await getUserId()
  await db
    .delete(relationships)
    .where(and(eq(relationships.id, id), eq(relationships.userId, userId)))

  revalidatePath("/circle")
}
