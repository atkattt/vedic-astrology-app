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

/** Normalize a raw fragments.section value; unknown/null → "chapter". */
export function sectionOf(raw: string | null | undefined): SectionKey {
  const s = (raw ?? "").trim().toLowerCase()
  return (SECTION_ORDER as readonly string[]).includes(s)
    ? (s as SectionKey)
    : "chapter"
}
