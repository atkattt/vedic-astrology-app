// Shared character-mutation primitives for the ASCII self-being.
//
// The SelfCreature (components/self/self-creature.tsx) and the landing-page
// AmbientCreature (components/self/ambient-creature.tsx) both mutate glyphs with
// the same feel: characters resolve one by one in a staggered ripple, each
// briefly flickering through scramble glyphs before it settles. These helpers
// are the shared core so that feel is defined in one place, not duplicated.

/** Per-character stagger of a ripple morph, in ms (each cell lands ~this later). */
export const RIPPLE_STAGGER_MS = 150

/** Faint glyphs a cell flickers through before it settles on its target. */
export const SCRAMBLE_GLYPHS = [
  ".", ":", "*", "+", "=", "×", "·", "'", "˚", "/", "\\", "|", "-", "~", "o",
]

/** Pick a scramble glyph, avoiding `avoid` so a flicker always visibly changes. */
export function randomScramble(avoid?: string): string {
  let g = SCRAMBLE_GLYPHS[Math.floor(Math.random() * SCRAMBLE_GLYPHS.length)]
  if (g === avoid)
    g = SCRAMBLE_GLYPHS[(SCRAMBLE_GLYPHS.indexOf(g) + 1) % SCRAMBLE_GLYPHS.length]
  return g
}

/** Pick a fresh index in [0,count), guaranteed different from `cur`. */
export function rollIndex(count: number, cur: number): number {
  if (count <= 1) return 0
  let n = Math.floor(Math.random() * count)
  if (n === cur) n = (n + 1) % count
  return n
}
