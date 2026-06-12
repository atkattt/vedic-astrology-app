export const RELATIONSHIP_KINDS = [
  "mother",
  "father",
  "sibling",
  "partner",
  "friend",
] as const

export type RelationshipKind = (typeof RELATIONSHIP_KINDS)[number]

export const RELATIONSHIP_LABELS: Record<RelationshipKind, string> = {
  mother: "Mother",
  father: "Father",
  sibling: "Sibling",
  partner: "Partner",
  friend: "Friend",
}
