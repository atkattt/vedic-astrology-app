export const RELATIONSHIP_KINDS = [
  'mother',
  'father',
  'sibling',
  'partner',
  'friend',
] as const

export type RelationshipKind = (typeof RELATIONSHIP_KINDS)[number]

export const RELATIONSHIP_LABELS: Record<RelationshipKind, string> = {
  mother: 'Mother',
  father: 'Father',
  sibling: 'Sibling',
  partner: 'Partner',
  friend: 'Friend',
}

export function formatBirth(person: {
  birthDate?: string | null
  birthTime?: string | null
  birthTimeUnknown: boolean
  birthPlace?: string | null
}): string {
  const parts: string[] = []
  if (person.birthDate) {
    const d = new Date(person.birthDate + 'T00:00:00')
    parts.push(
      d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    )
  }
  if (person.birthTimeUnknown) {
    parts.push('time unknown')
  } else if (person.birthTime) {
    parts.push(person.birthTime)
  }
  if (person.birthPlace) parts.push(person.birthPlace)
  return parts.length ? parts.join(' · ') : 'No birth details yet'
}

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}
