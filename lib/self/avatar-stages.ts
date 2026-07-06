/**
 * The evolving self creature — its five discrete forms.
 *
 * Each stage is a PLAIN multi-line ASCII string so you can redraw any of them
 * by hand without touching component logic. Keep them roughly centered; the
 * renderer centers every line horizontally anyway, so leading spaces are only
 * for your own readability while editing.
 *
 * The renderer treats the lowercase letter "o" as an EYE: during a blink it
 * swaps every "o" for "-". If you redraw a stage, use "o" for the eyes and the
 * blink will keep working. Everything else is drawn verbatim.
 */

// Stage 1 — a dormant seed. Barely awake, eyes still shut.
export const STAGE_1 = `[..]`

// Stage 2 — it opens its eyes.
export const STAGE_2 = `(o o)`

// Stage 3 — ears prick up, a face forms.
export const STAGE_3 = `/\\ /\\
(o o)
[>_<]`

// Stage 4 — a small body appears beneath the head.
export const STAGE_4 = `/\\ /\\
(o o)
[>_<]
 (v)`

// Stage 5 — taller ears, a fuller body with a rounded bottom.
export const STAGE_5 = `//\\ //\\
 (o o)
 [>_<]
 |   |
 \\___/`

export const STAGE_ART: Record<number, string> = {
  1: STAGE_1,
  2: STAGE_2,
  3: STAGE_3,
  4: STAGE_4,
  5: STAGE_5,
}

export const MAX_STAGE = 5

export type EngagementCounts = {
  /** number of rows in read_responses (agree OR disagree each count once) */
  responses: number
  /** number of self_entries rows with kind='answer' */
  answers: number
}

/**
 * Growth score from real engagement:
 *   each read_responses row = 1 point, each self_entries answer = 3 points.
 */
export function engagementScore({ responses, answers }: EngagementCounts): number {
  return responses * 1 + answers * 3
}

/**
 * Five discrete stages by score:
 *   0 → 1 | 1–3 → 2 | 4–7 → 3 | 8–12 → 4 | 13+ → 5
 */
export function scoreToStage(score: number): number {
  if (score <= 0) return 1
  if (score <= 3) return 2
  if (score <= 7) return 3
  if (score <= 12) return 4
  return 5
}

/** Render a blink frame of any art by swapping eyes ("o" → "-"). */
export function toBlinkArt(art: string): string {
  return art.replace(/o/g, "-")
}
