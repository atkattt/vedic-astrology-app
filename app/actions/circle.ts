'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { people, relationships } from '@/lib/db/schema'
import { and, asc, eq, or } from 'drizzle-orm'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user.id
}

export type Person = typeof people.$inferSelect
export type Relationship = typeof relationships.$inferSelect

export type RelationshipKind =
  | 'mother'
  | 'father'
  | 'sibling'
  | 'partner'
  | 'friend'

export async function getPeople(): Promise<Person[]> {
  const userId = await getUserId()
  return db
    .select()
    .from(people)
    .where(eq(people.userId, userId))
    .orderBy(asc(people.createdAt))
}

export async function getRelationships(): Promise<Relationship[]> {
  const userId = await getUserId()
  return db
    .select()
    .from(relationships)
    .where(eq(relationships.userId, userId))
    .orderBy(asc(relationships.createdAt))
}

export async function addPerson(input: {
  name: string
  birthDate?: string | null
  birthTime?: string | null
  birthTimeUnknown?: boolean
  birthPlace?: string | null
}) {
  const userId = await getUserId()
  const name = input.name.trim()
  if (!name) throw new Error('A name is required')

  // Scatter new stars across the canvas with a gentle deterministic spread.
  const existing = await db
    .select({ id: people.id })
    .from(people)
    .where(eq(people.userId, userId))
  const index = existing.length
  const angle = index * 137.5 * (Math.PI / 180) // golden angle
  const radius = 18 + (index % 5) * 6
  const posX = Math.round(Math.min(86, Math.max(14, 50 + Math.cos(angle) * radius)))
  const posY = Math.round(Math.min(86, Math.max(14, 50 + Math.sin(angle) * radius)))

  await db.insert(people).values({
    userId,
    name,
    birthDate: input.birthDate || null,
    birthTime: input.birthTimeUnknown ? null : input.birthTime || null,
    birthTimeUnknown: Boolean(input.birthTimeUnknown),
    birthPlace: input.birthPlace || null,
    posX,
    posY,
  })
  revalidatePath('/circle')
}

export async function updatePersonPosition(id: number, posX: number, posY: number) {
  const userId = await getUserId()
  await db
    .update(people)
    .set({ posX: Math.round(posX), posY: Math.round(posY) })
    .where(and(eq(people.id, id), eq(people.userId, userId)))
}

export async function deletePerson(id: number) {
  const userId = await getUserId()
  await db.delete(people).where(and(eq(people.id, id), eq(people.userId, userId)))
  // Remove any bonds touching this person.
  await db
    .delete(relationships)
    .where(
      and(
        eq(relationships.userId, userId),
        or(eq(relationships.fromPersonId, id), eq(relationships.toPersonId, id)),
      ),
    )
  revalidatePath('/circle')
}

export async function addRelationship(input: {
  fromPersonId: number
  toPersonId: number
  kind: RelationshipKind
}) {
  const userId = await getUserId()
  if (input.fromPersonId === input.toPersonId) {
    throw new Error('A bond needs two different people')
  }
  await db.insert(relationships).values({
    userId,
    fromPersonId: input.fromPersonId,
    toPersonId: input.toPersonId,
    kind: input.kind,
  })
  revalidatePath('/circle')
}

export async function deleteRelationship(id: number) {
  const userId = await getUserId()
  await db
    .delete(relationships)
    .where(and(eq(relationships.id, id), eq(relationships.userId, userId)))
  revalidatePath('/circle')
}
