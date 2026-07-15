// The six chart SECTIONS, in their fixed narrative order. Each section is one
// constellation in the universe: a MAJOR read (weight >= 7, star) on the
// spiral arm with its MINOR reads (weight < 7, glyphs) clustered around it.
// This file is the single source of truth for section order + accent colors.

export const SECTION_ORDER = [
  "ascendant",
  "moon",
  "sun",
  "knot",
  "nodes",
  "chapter",
] as const

export type SectionKey = (typeof SECTION_ORDER)[number]

// One accent per section, used by ALL of its reads once answered (and by the
// CURRENT ring on its major). Cool cosmic hues, no purple/violet.
export const SECTION_COLORS: Record<SectionKey, string> = {
  ascendant: "#e8b84a", // gold — the mask you were handed
  moon: "#a8c8e8", // moonlit blue — the inner tide
  sun: "#e8825f", // ember coral — the engine
  knot: "#5fd0a8", // sea green — the tangle
  nodes: "#6ac9d8", // pale cyan — the axis
  chapter: "#e87a7a", // rose — the current chapter
}

/** Normalize a raw fragments.section value; unknown/null → null (caller
    falls back to deriving from the trigger condition). */
export function sectionOf(raw: string | null | undefined): SectionKey | null {
  const s = (raw ?? "").trim().toLowerCase()
  return (SECTION_ORDER as readonly string[]).includes(s)
    ? (s as SectionKey)
    : null
}

// ---------------------------------------------------------------------------
// Fallback derivation — used when fragments.section is null (the column may
// not exist yet, or a row wasn't backfilled). Reads the trigger condition's
// planets and maps them to a section by priority, so authored fragments
// spread across the journey instead of all collapsing into "chapter":
//   moon → moon | sun → sun | saturn → knot | rahu/ketu → nodes |
//   jupiter → chapter | anything else (mercury/venus/mars/asc) → ascendant
// ---------------------------------------------------------------------------
function planetsIn(condition: unknown): string[] {
  if (!condition || typeof condition !== "object") return []
  const c = condition as Record<string, unknown>
  const out: string[] = []
  if (typeof c.planet === "string") out.push(c.planet.toLowerCase())
  if (Array.isArray(c.planets)) {
    for (const p of c.planets) if (typeof p === "string") out.push(p.toLowerCase())
  }
  return out
}

export function deriveSection(condition: unknown): SectionKey {
  const planets = planetsIn(condition)
  if (planets.includes("moon")) return "moon"
  if (planets.includes("sun")) return "sun"
  if (planets.includes("saturn")) return "knot"
  if (planets.includes("rahu") || planets.includes("ketu")) return "nodes"
  if (planets.includes("jupiter")) return "chapter"
  return "ascendant"
}

/** The section for a fragment: explicit column value wins, else derived. */
export function sectionFor(
  section: string | null | undefined,
  condition: unknown,
): SectionKey {
  return sectionOf(section) ?? deriveSection(condition)
}
