import type { Person, Relationship } from "@/lib/db/schema"

// A small starter constellation so guests land in a living sky instead of an
// empty one. Ids are negative to stay clearly separate from real DB rows.
const now = new Date()

export const DEMO_PEOPLE: Person[] = [
  {
    id: -1,
    userId: "guest",
    name: "Mara",
    birthDate: "1991-04-12",
    birthTime: "06:45",
    birthTimeUnknown: false,
    birthPlace: "Lisbon",
    posX: 32,
    posY: 30,
    createdAt: now,
  },
  {
    id: -2,
    userId: "guest",
    name: "Théo",
    birthDate: "1988-11-02",
    birthTime: null,
    birthTimeUnknown: true,
    birthPlace: "Marseille",
    posX: 68,
    posY: 38,
    createdAt: now,
  },
  {
    id: -3,
    userId: "guest",
    name: "Ines",
    birthDate: "2016-07-21",
    birthTime: "14:10",
    birthTimeUnknown: false,
    birthPlace: "Porto",
    posX: 50,
    posY: 64,
    createdAt: now,
  },
]

export const DEMO_RELATIONSHIPS: Relationship[] = [
  {
    id: -1,
    userId: "guest",
    fromPersonId: -1,
    toPersonId: -2,
    kind: "partner",
    createdAt: now,
  },
  {
    id: -2,
    userId: "guest",
    fromPersonId: -1,
    toPersonId: -3,
    kind: "mother",
    createdAt: now,
  },
]
