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

/* ==========================================================================
 * LIVING TEXT — character-level mutation model.
 *
 * Beyond the plain ASCII strings above, each stage is ALSO described as a grid
 * of CELLS. A cell is a single monospace position with a set of interchangeable
 * glyph VARIANTS, e.g. an eye can be any of  . · ˙ ° *  and a bracket family can
 * be  [ ] ↔ { } ↔ ( ). Over time the renderer swaps individual cells to random
 * sibling variants, so the being looks like it is made of living text.
 *
 * `variants[0]` of every cell reproduces the exact glyph in the STAGE_* string
 * above, so the cell grid and the plain art stay in perfect sync — the plain
 * strings remain the source of truth for geometry / accretion, while the cell
 * grid only decides WHICH variant of each glyph is shown at a given tick.
 *
 * Cells that share a non-empty `group` mutate in lockstep (both brackets swap
 * to the same family; both eyes always match; the whole mouth re-forms as one).
 * ======================================================================== */

export type StageCell = {
  /** interchangeable glyphs; index 0 is the canonical/base look */
  variants: string[]
  /** cells with the same group share a variant index (mutate together) */
  group?: string
  /** eyes: honour the blink loop by showing "-" while blinking */
  blink?: boolean
}

/** A stage as rows of cells; `null` is an empty (space) position. */
export type StageGrid = (StageCell | null)[][]

// ---- cell factories (kept tiny so stages read like little pictures) --------
const _ = null
const brkL = (): StageCell => ({ variants: ["[", "{", "("], group: "brk" })
const brkR = (): StageCell => ({ variants: ["]", "}", ")"], group: "brk" })
const parL = (): StageCell => ({ variants: ["(", "{", "["], group: "brk" })
const parR = (): StageCell => ({ variants: [")", "}", "]"], group: "brk" })
const eyeDot = (): StageCell => ({
  variants: [".", "·", "˙", "°", "*"],
  group: "eye",
  blink: true,
})
const eyeOpen = (): StageCell => ({
  variants: ["o", "O", "•", "˚", "*"],
  group: "eye",
  blink: true,
})
const earSlash = (): StageCell => ({ variants: ["/", "^", "|"], group: "ear" })
const earBack = (): StageCell => ({ variants: ["\\", "^", "|"], group: "ear" })
// mouth variants aligned by index → >_< , >.< , =_= , ·_· , -_-
const mouthL = (): StageCell => ({
  variants: [">", ">", "=", "·", "-"],
  group: "mouth",
})
const mouthM = (): StageCell => ({
  variants: ["_", ".", "_", "_", "_"],
  group: "mouth",
})
const mouthR = (): StageCell => ({
  variants: ["<", "<", "=", "·", "-"],
  group: "mouth",
})
const bellyL = (): StageCell => ({ variants: ["(", "{", "<"], group: "belly" })
const bellyR = (): StageCell => ({ variants: [")", "}", ">"], group: "belly" })
const bellyV = (): StageCell => ({
  variants: ["v", "∨", "w", "~"],
  group: "belly",
})
const sideBar = (): StageCell => ({
  variants: ["|", "!", "│", "¦"],
  group: "side",
})
const floorCell = (): StageCell => ({ variants: ["_", "~", "="], group: "floor" })
const cornerL = (): StageCell => ({ variants: ["\\", "(", "{"], group: "corner" })
const cornerR = (): StageCell => ({ variants: ["/", ")", "}"], group: "corner" })

/**
 * The five stages as cell grids. Each row is an array of cells (or null for a
 * blank). `variants[0]` per cell reproduces the matching STAGE_* string exactly.
 */
export const STAGE_GRIDS: Record<number, StageGrid> = {
  1: [[brkL(), eyeDot(), eyeDot(), brkR()]],
  2: [[parL(), eyeOpen(), _, eyeOpen(), parR()]],
  3: [
    [earSlash(), earBack(), _, earSlash(), earBack()],
    [parL(), eyeOpen(), _, eyeOpen(), parR()],
    [brkL(), mouthL(), mouthM(), mouthR(), brkR()],
  ],
  4: [
    [earSlash(), earBack(), _, earSlash(), earBack()],
    [parL(), eyeOpen(), _, eyeOpen(), parR()],
    [brkL(), mouthL(), mouthM(), mouthR(), brkR()],
    [_, bellyL(), bellyV(), bellyR()],
  ],
  5: [
    [earSlash(), earSlash(), earBack(), _, earSlash(), earSlash(), earBack()],
    [_, parL(), eyeOpen(), _, eyeOpen(), parR()],
    [_, brkL(), mouthL(), mouthM(), mouthR(), brkR()],
    [_, sideBar(), _, _, _, sideBar()],
    [_, cornerL(), floorCell(), floorCell(), floorCell(), cornerR()],
  ],
}

/** Render a stage grid to its base ASCII (variant 0), for debugging / parity. */
export function stageGridToArt(grid: StageGrid): string {
  return grid
    .map((row) => row.map((cell) => (cell ? cell.variants[0] : " ")).join(""))
    .join("\n")
}

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

/* ==========================================================================
 * ACCRETION — infinite growth on top of the 5 stages.
 *
 * Beyond the stage skeleton, every growth point adds ONE small persistent
 * detail to the being. Details are chosen + positioned deterministically from
 * seed = hash(userId + point index), so the same user always regrows the exact
 * same being, while different users diverge. After stage 5 (score 13+), growth
 * continues forever through accretion alone — density, aura, and texture keep
 * building with no cap.
 *
 * Everything below is data + pure functions so the palettes and zones stay easy
 * to edit; the renderer component only draws what these return.
 * ======================================================================== */

/**
 * Character palettes by zone. EDIT THESE freely — add/remove glyphs and the
 * being's vocabulary changes. Each detail picks one glyph from its zone.
 *   - aura:  scattered just OUTSIDE the body (faint sparks)
 *   - body:  texture INSIDE the form
 *   - edge:  whiskers / spines hugging the form's outline
 */
export const DETAIL_PALETTE: Record<DetailZone, string[]> = {
  aura: ["·", "˙", "°", "*", "✦", "⁘"],
  body: [":", ";", "~", "=", "≈", "#"],
  edge: ["/", "\\", "'", "`", "^"],
}

export type DetailZone = "aura" | "body" | "edge"

/** How wide a ring of empty space to leave around the being for aura details. */
export const ACCRETION_PADDING = 2

/**
 * Relative likelihood each new detail lands in a given zone. Tweak to taste:
 * more "body" = denser core, more "aura" = a wider halo.
 */
export const ZONE_WEIGHTS: Record<DetailZone, number> = {
  body: 0.42,
  aura: 0.4,
  edge: 0.18,
}

/** Every Nth detail is mirrored left/right so the being stays composed. */
export const SYMMETRY_EVERY = 5

// ---- deterministic hashing + PRNG -----------------------------------------

/** FNV-1a string hash → uint32. Stable across runs and machines. */
export function hashString(s: string): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** mulberry32: tiny deterministic PRNG seeded by a uint32. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ---- the accretion grid (built once from the STAGE-5 skeleton) -------------

export type CellZone = DetailZone | "skeleton"

export type AccretionGrid = {
  cols: number
  rows: number
  /** the centered, padded skeleton lines (spaces + glyphs) */
  skeleton: string[]
  /** candidate empty cells per zone, in stable row-major order */
  cellsByZone: Record<DetailZone, Array<[number, number]>>
  /** quick lookup: "r,c" of every non-space skeleton cell (never overwritten) */
  skeletonCells: Set<string>
}

function centerLines(art: string): string[] {
  const lines = art.split("\n")
  const width = Math.max(...lines.map((l) => l.length))
  return lines.map((l) => {
    const pad = width - l.length
    const left = Math.floor(pad / 2)
    return " ".repeat(left) + l + " ".repeat(pad - left)
  })
}

/**
 * Build the coordinate model details live on. Always derived from the mature
 * STAGE-5 skeleton so a given detail index keeps the SAME position no matter
 * which stage is currently displayed (the being's envelope never shifts).
 */
export function buildAccretionGrid(
  art: string = STAGE_5,
  padding: number = ACCRETION_PADDING,
): AccretionGrid {
  const centered = centerLines(art)
  const innerW = centered[0]?.length ?? 0
  const cols = innerW + padding * 2
  const rows = centered.length + padding * 2

  // Pad into a full grid of characters.
  const grid: string[] = []
  for (let r = 0; r < rows; r++) {
    const src = centered[r - padding]
    if (src == null) {
      grid.push(" ".repeat(cols))
    } else {
      grid.push(" ".repeat(padding) + src + " ".repeat(padding))
    }
  }

  // Bounding box of the skeleton + a set of its solid cells.
  const skeletonCells = new Set<string>()
  let minR = rows,
    maxR = 0,
    minC = cols,
    maxC = 0
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] !== " ") {
        skeletonCells.add(`${r},${c}`)
        if (r < minR) minR = r
        if (r > maxR) maxR = r
        if (c < minC) minC = c
        if (c > maxC) maxC = c
      }
    }
  }

  const isSkeleton = (r: number, c: number) =>
    r >= 0 && r < rows && c >= 0 && c < cols && grid[r][c] !== " "
  const touchesSkeleton = (r: number, c: number) => {
    for (let dr = -1; dr <= 1; dr++)
      for (let dc = -1; dc <= 1; dc++)
        if (!(dr === 0 && dc === 0) && isSkeleton(r + dr, c + dc)) return true
    return false
  }

  const cellsByZone: Record<DetailZone, Array<[number, number]>> = {
    aura: [],
    body: [],
    edge: [],
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] !== " ") continue // skeleton — never a detail slot
      const insideBox = r >= minR && r <= maxR && c >= minC && c <= maxC
      if (insideBox) {
        cellsByZone.body.push([r, c]) // texture within the form
      } else if (touchesSkeleton(r, c)) {
        cellsByZone.edge.push([r, c]) // whiskers/spines hugging the outline
      } else {
        cellsByZone.aura.push([r, c]) // faint sparks in the halo
      }
    }
  }

  return { cols, rows, skeleton: grid, cellsByZone, skeletonCells }
}

// ---- placing details deterministically -------------------------------------

export type PlacedDetail = {
  row: number
  col: number
  char: string
  zone: DetailZone
  /** growth-point index (0-based) that produced it */
  index: number
}

function pickZone(roll: number): DetailZone {
  const total = ZONE_WEIGHTS.body + ZONE_WEIGHTS.aura + ZONE_WEIGHTS.edge
  let acc = (roll * total)
  if ((acc -= ZONE_WEIGHTS.body) < 0) return "body"
  if ((acc -= ZONE_WEIGHTS.aura) < 0) return "aura"
  return "edge"
}

/**
 * Deterministically place `count` details for a user. Details are generated in
 * index order (0..count-1) from seed = hash(seedKey + ":" + index), so the
 * being always regrows identically. Occupied cells are skipped by stable
 * forward-probing. Every SYMMETRY_EVERY-th detail is mirrored left/right.
 */
export function buildDetails(
  seedKey: string,
  count: number,
  grid: AccretionGrid,
): PlacedDetail[] {
  const placed: PlacedDetail[] = []
  if (count <= 0) return placed

  const occupied = new Set<string>(grid.skeletonCells)
  const key = (r: number, c: number) => `${r},${c}`

  const takeInZone = (
    zone: DetailZone,
    rand: () => number,
  ): [number, number] | null => {
    const order: DetailZone[] = [zone, "body", "aura", "edge"]
    for (const z of order) {
      const cells = grid.cellsByZone[z]
      if (!cells.length) continue
      const start = Math.floor(rand() * cells.length)
      for (let k = 0; k < cells.length; k++) {
        const [r, c] = cells[(start + k) % cells.length]
        if (!occupied.has(key(r, c))) return [r, c]
      }
    }
    return null
  }

  for (let i = 0; i < count; i++) {
    const rand = mulberry32(hashString(`${seedKey}:${i}`))
    const zone = pickZone(rand())
    const spot = takeInZone(zone, rand)
    if (!spot) continue
    const [r, c] = spot
    const palette = DETAIL_PALETTE[zone]
    const char = palette[Math.floor(rand() * palette.length)]
    occupied.add(key(r, c))
    placed.push({ row: r, col: c, char, zone, index: i })

    // Every Nth detail: mirror it across the vertical axis for composure.
    if ((i + 1) % SYMMETRY_EVERY === 0) {
      const mc = grid.cols - 1 - c
      if (mc !== c && !occupied.has(key(r, mc))) {
        occupied.add(key(r, mc))
        placed.push({ row: r, col: mc, char, zone, index: i })
      }
    }
  }

  return placed
}

/** Resting opacity for a detail by zone (aura is faintest). */
export const ZONE_OPACITY: Record<DetailZone, number> = {
  aura: 0.5,
  body: 0.72,
  edge: 0.66,
}

/**
 * The 2–3 interchangeable glyphs a placed detail can mutate between — its own
 * character plus the next couple of siblings from its zone palette. Kept
 * deterministic (palette order) so a detail always mutates within the same
 * small family rather than jumping anywhere in the zone.
 */
export function detailSiblings(char: string, zone: DetailZone): string[] {
  const pal = DETAIL_PALETTE[zone]
  const i = pal.indexOf(char)
  if (i < 0) return [char]
  return Array.from(
    new Set([char, pal[(i + 1) % pal.length], pal[(i + 2) % pal.length]]),
  )
}
