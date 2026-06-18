// ---------------------------------------------------------------------------
// Spiral Inward — client-side model for the read + agree/disagree loop.
// All placeholder copy for now; the real chart engine + blended-voice layer
// get wired in later. Nothing here calls a backend.
// ---------------------------------------------------------------------------

export type ReadCategory = "about-you" | "bond"

export type Read = {
  id: string
  text: string
  category: ReadCategory
  // For bond/person reads, the human this read is about.
  subjectName?: string
}

export const REASON_TAGS = [
  "not me",
  "used to be",
  "too harsh",
  "not sure",
  "skip",
] as const

export type ReasonTag = (typeof REASON_TAGS)[number]

export type DisagreedRead = Read & {
  reason: ReasonTag
  filedAt: number
}

export type TruthScope = "about-me" | "about-bond"

export type Truth = {
  id: string
  text: string
  scope: TruthScope
  createdAt: number
  reflection: string
  // When a stated truth rubs against an existing read, we keep both — the
  // user is always the authority on themselves. This is never "corrected".
  tension?: string
}

// --- Seed reads about the user (the "About you" spiral) ---------------------

export const SEED_SELF_READS: Read[] = [
  { id: "self-1", category: "about-you", text: "You build safety from what you can hold." },
  { id: "self-2", category: "about-you", text: "You give more than you ask for, and quietly call it fairness." },
  { id: "self-3", category: "about-you", text: "Rest feels like something you have to earn before you're allowed it." },
  { id: "self-4", category: "about-you", text: "You read a room before you let yourself enter it." },
  { id: "self-5", category: "about-you", text: "You keep the door open long after you've decided to leave." },
  { id: "self-6", category: "about-you", text: "You mistake intensity for closeness more often than you'd admit." },
  { id: "self-7", category: "about-you", text: "You would rather be useful to someone than fully known by them." },
  { id: "self-8", category: "about-you", text: "Your patience is real, but it has an edge you rarely show." },
]

// --- Generators for person + bond reads -------------------------------------

const PERSON_READ_TEMPLATES = [
  "{name} is someone you orbit more closely than you let on.",
  "You measure a little of your own weather against {name}.",
  "There's a version of you that only {name} has met.",
]

const BOND_READ_TEMPLATES = [
  "{name} taught you what steadiness was supposed to sound like.",
  "You soften around {name} in a way you rarely allow yourself.",
  "There's an old, unnamed debt running between you and {name}.",
  "You and {name} keep rehearsing a conversation neither of you starts.",
]

function pick<T>(arr: T[], seed: string): T {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return arr[h % arr.length]
}

export function makePersonRead(personId: number, name: string): Read {
  return {
    id: `person-${personId}`,
    category: "bond",
    subjectName: name,
    text: pick(PERSON_READ_TEMPLATES, `p${personId}${name}`).replaceAll("{name}", name),
  }
}

export function makeBondRead(relationshipId: number, otherName: string): Read {
  return {
    id: `bond-${relationshipId}`,
    category: "bond",
    subjectName: otherName,
    text: pick(BOND_READ_TEMPLATES, `b${relationshipId}${otherName}`).replaceAll("{name}", otherName),
  }
}

// --- Reflection on a self-submitted truth (placeholder blended voice) -------

const REFLECTIONS = [
  "What you've named sits alongside a quieter pull toward needing things to be certain before you'll trust them. Both can be true at once.",
  "Said plainly, this is a kind of devotion. The scaffold underneath suggests it costs you more than you let it show.",
  "This reads as something you arrived at, not something handed to you. The pattern beneath it agrees — slowly, and on your terms.",
  "There's steadiness in how you put this. Underneath runs a thread that wants to be moved as much as it wants to be safe.",
]

const TENSIONS = [
  "This rubs against an earlier read — that you keep the door open after deciding to leave. We're not resolving the two. You're the authority here; both stay.",
  "This sits in tension with the idea that you'd rather be useful than known. We're keeping both, uncorrected. Your word is the one that holds.",
  "An older read said rest feels earned, not given. What you've just claimed pushes back on that. We let the friction stand.",
]

export function reflectOnTruth(text: string, scope: TruthScope): {
  reflection: string
  tension?: string
} {
  let h = 0
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0
  const reflection = REFLECTIONS[h % REFLECTIONS.length]
  // About half the time, surface a kept tension.
  const tension = h % 2 === 0 ? TENSIONS[h % TENSIONS.length] : undefined
  return { reflection, tension }
}
