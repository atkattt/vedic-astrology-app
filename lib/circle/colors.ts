// Per-person accent palette. Colors are assigned in order as people are added
// (by their position in the people list), so each person keeps a consistent
// color across their node, glow, bond lines, and detail panel.
export const PERSON_PALETTE = [
  "#d98a9a", // rose
  "#7fc4d4", // cyan
  "#a99ad9", // violet
  "#8fc9a3", // green
  "#d4a960", // amber
] as const

// The center "You" node is always gold.
export const YOU_COLOR = "#e6c067"

export function personColor(index: number): string {
  return PERSON_PALETTE[index % PERSON_PALETTE.length]
}

// Build a stable personId -> color map from the ordered people list.
export function buildColorMap<T extends { id: number }>(
  people: T[],
): Map<number, string> {
  const map = new Map<number, string>()
  people.forEach((p, i) => map.set(p.id, personColor(i)))
  return map
}
