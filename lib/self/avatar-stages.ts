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

// Each stage adds exactly ONE small body part, so evolution reads like an
// ascii tamagotchi growing up — never a whole new face at once.

// Stage 1 — a dormant seed. Barely awake, eyes still shut.
export const STAGE_1 = `[..]`

// Stage 2 — it opens its eyes.
export const STAGE_2 = `(o o)`

// Stage 3 — tiny ears prick up.
export const STAGE_3 = ` ^ ^
(o o)`

// Stage 4 — a little mouth forms.
export const STAGE_4 = ` ^ ^
(o o)
 >_<`

// Stage 5 — a small body appears beneath the head.
export const STAGE_5 = ` ^ ^
(o o)
 >_<
 (v)`

// Stage 6 — a tail curls out.
export const STAGE_6 = ` ^ ^
(o o)
 >_<
 (v)~`

// Stage 7 — the ears grow taller.
export const STAGE_7 = `/\\ /\\
(o o)
 >_<
 (v)~`

// Stage 8 — a fuller body with a rounded bottom.
export const STAGE_8 = `/\\ /\\
(o o)
 >_<
|   |~
\\___/`

export const STAGE_ART: Record<number, string> = {
  1: STAGE_1,
  2: STAGE_2,
  3: STAGE_3,
  4: STAGE_4,
  5: STAGE_5,
  6: STAGE_6,
  7: STAGE_7,
  8: STAGE_8,
}

export const MAX_STAGE = 8

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
  const earTip = (): StageCell => ({ variants: ["^", "'", "ʌ"], group: "ear" })
  const tailCell = (): StageCell => ({ variants: ["~", "-", "≈"], group: "tail" })
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
    [_, earTip(), _, earTip()],
    [parL(), eyeOpen(), _, eyeOpen(), parR()],
  ],
  4: [
    [_, earTip(), _, earTip()],
    [parL(), eyeOpen(), _, eyeOpen(), parR()],
    [_, mouthL(), mouthM(), mouthR()],
  ],
  5: [
    [_, earTip(), _, earTip()],
    [parL(), eyeOpen(), _, eyeOpen(), parR()],
    [_, mouthL(), mouthM(), mouthR()],
    [_, bellyL(), bellyV(), bellyR()],
  ],
  6: [
    [_, earTip(), _, earTip()],
    [parL(), eyeOpen(), _, eyeOpen(), parR()],
    [_, mouthL(), mouthM(), mouthR()],
    [_, bellyL(), bellyV(), bellyR(), tailCell()],
  ],
  7: [
    [earSlash(), earBack(), _, earSlash(), earBack()],
    [parL(), eyeOpen(), _, eyeOpen(), parR()],
    [_, mouthL(), mouthM(), mouthR()],
    [_, bellyL(), bellyV(), bellyR(), tailCell()],
  ],
  8: [
    [earSlash(), earBack(), _, earSlash(), earBack()],
    [parL(), eyeOpen(), _, eyeOpen(), parR()],
    [_, mouthL(), mouthM(), mouthR()],
    [sideBar(), _, _, _, sideBar(), tailCell()],
    [cornerL(), floorCell(), floorCell(), floorCell(), cornerR()],
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
 * Eight discrete stages by score:
 *   0 → 1 | 1–2 → 2 | 3–5 → 3 | 6–8 → 4 | 9–12 → 5 | 13–16 → 6 | 17–21 → 7 | 22+ → 8
 */
export function scoreToStage(score: number): number {
  if (score <= 0) return 1
  if (score <= 2) return 2
  if (score <= 5) return 3
  if (score <= 8) return 4
  if (score <= 12) return 5
  if (score <= 16) return 6
  if (score <= 21) return 7
  return 8
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

export type DetailZone = "aura" | "body" | "edge"

/* ---- GROWTH SCHEDULE (diminishing) ----------------------------------------
 * Points still accumulate as before (read response = 1, answer = 3), but
 * VISIBLE changes (a new detail OR an upgrade) happen on a widening cadence.
 * Each row: while the current point is <= upToPoints, the next visible event
 * is everyPoints later. TUNE FREELY — growthEventCount reads this table.
 *   default: every point to 5, every 2nd to 15, every 3rd to 30, every 5th on.
 */
export const GROWTH_SCHEDULE: Array<{
  upToPoints: number
  everyPoints: number
}> = [
  { upToPoints: 5, everyPoints: 1 },
  { upToPoints: 15, everyPoints: 2 },
  { upToPoints: 30, everyPoints: 3 },
  { upToPoints: Number.POSITIVE_INFINITY, everyPoints: 5 },
]

/** How many visible growth events a raw point score has produced. */
export function growthEventCount(score: number): number {
  const s = Math.max(0, Math.floor(score))
  let events = 0
  let p = 1
  while (p <= s) {
    events++
    const bracket =
      GROWTH_SCHEDULE.find((b) => p <= b.upToPoints) ??
      GROWTH_SCHEDULE[GROWTH_SCHEDULE.length - 1]
    p += bracket.everyPoints
  }
  return events
}

/* ---- MATURITY LADDERS ------------------------------------------------------
 * Each zone's ladder orders its glyphs from faint/new → matured. An ADD starts
 * a detail at step 0; an UPGRADE moves an existing detail one step up. A
 * detail at the top of its ladder can't upgrade further. EDIT FREELY.
 */
export const MATURITY_LADDERS: Record<DetailZone, string[]> = {
  aura: ["·", "˙", "°", "*", "✦"],
  body: [":", ";", "~", "≈", "#"],
  edge: ["'", "`", "/", "^"],
}

/* ---- JOURNEY GROWTH ---------------------------------------------------------
 * Growth driven by the walk itself rather than an abstract score:
 *   - MAJOR event (a section's star answered): a BIG change — the skeleton
 *     advances a stage (stageForMajors) and the being gains that section's
 *     SIGIL as a small accessory, loosely echoing what the read was about.
 *   - MINOR event (every OTHER minor answer in a section): a quiet change —
 *     either a new texture detail appears or an existing one matures a step.
 */
export type GrowthEvent = {
  kind: "major" | "minor"
  /** section key of the read that caused it — flavors sigil accessories */
  flavor: string
}

/** Big changes: each star answered advances the skeleton one stage. */
export function stageForMajors(majorsAnswered: number): number {
  return Math.max(1, Math.min(MAX_STAGE, 1 + majorsAnswered))
}

/**
 * Per-section accessory sigils — tiny 2-step maturity ladders (faint → bright)
 * keyed by SectionKey. A major answered in a section pins its sigil onto the
 * being; later upgrades can brighten it ("a new accessory gets updated").
 * EDIT FREELY — unknown sections fall back to the aura ladder.
 */
export const SECTION_SIGILS: Record<string, string[]> = {
  "the surface": ["=", "≡"], // the mask, layered
  "the heart": ["♡", "♥"], // the inner tide
  mind: ["?", "¿"], // the weather of thought
  "the fire": ["!", "‼"], // the drive
  "the taste": ["+", "±"], // what you reach for
  growth: ["^", "△"], // where you widen
  "the weight": ["_", "≡"], // what you carry
  "the center": ["*", "✶"], // the core self
  cluster: [":", "∴"], // the knot of planets
  "the hunger": ["~", "≈"], // the pull of the nodes
  "the private": ["·", "•"], // the hidden room
}

/** Chance a growth event UPGRADES an existing detail (vs ADDING a new one). */
export const UPGRADE_CHANCE = 0.5

/* ---- FLICKER FAMILIES ------------------------------------------------------
 * Moment-to-moment aliveness, fully separate from growth: each glyph can
 * flicker between same-weight lookalikes only, so mutation never fakes (or
 * hides) maturity. Any glyph not listed simply doesn't flicker.
 */
export const FLICKER_FAMILIES: Record<string, string[]> = {
  "·": ["·", "."],
  "˙": ["˙", "'"],
  "°": ["°", "˚"],
  "*": ["*", "+"],
  "✦": ["✦", "✧"],
  ":": [":", ";"],
  ";": [";", ":"],
  "~": ["~", "-"],
  "≈": ["≈", "~"],
  "#": ["#", "%"],
  "'": ["'", "`"],
  "`": ["`", "'"],
  "/": ["/", "\\"],
  "^": ["^", "ˆ"],
}

/** How wide a ring of empty space to leave around the being for aura details. */
export const ACCRETION_PADDING = 2

/* ---- PLACEMENT RULES -------------------------------------------------------
 * Adds build the being from the INSIDE OUT: body texture fills first (to a
 * soft density cap), then edge details, then aura. Details keep a minimum
 * spacing so the form never crowds; a full zone spills into the next.
 */
export const ZONE_FILL_ORDER: DetailZone[] = ["body", "edge", "aura"]

/** Soft caps: max fraction of a zone's candidate cells that adds may fill. */
export const ZONE_DENSITY_CAP: Record<DetailZone, number> = {
  body: 0.4,
  edge: 0.5,
  aura: 1,
}

/** Minimum Chebyshev distance between any two placed details. */
export const MIN_DETAIL_SPACING = 2

/** Every Nth ADD is mirrored left/right so the being stays composed. */
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
  * FINAL-stage skeleton so a given detail index keeps the SAME position no
  * matter which stage is currently displayed (the being's envelope never shifts).
  */
  export function buildAccretionGrid(
  art: string = STAGE_8,
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
  /** current glyph = ladder[level] */
  char: string
  zone: DetailZone
  /** this detail's own maturity ladder (zone ladder, or a section sigil) */
  ladder: string[]
  /** maturity step along the ladder (0 = newborn) */
  level: number
  /** growth-EVENT index (0-based) that added it — stable identity */
  index: number
  /** growth-event index of the most recent upgrade, or null if never */
  upgradedAt: number | null
  /** true when this is a section-sigil accessory from a major (star) read */
  sigil?: boolean
}

/** Cells a detail may never occupy: horizontally beside eyes or the mouth. */
function buildFaceExclusion(grid: AccretionGrid): Set<string> {
  const excluded = new Set<string>()
  const faceChars = new Set(["o", ">", "<"])
  for (let r = 0; r < grid.rows; r++) {
    const line = grid.skeleton[r]
    for (let c = 0; c < grid.cols; c++) {
      if (!faceChars.has(line[c])) continue
      for (const dc of [-1, 1]) {
        const nc = c + dc
        if (nc >= 0 && nc < grid.cols && line[nc] === " ")
          excluded.add(`${r},${nc}`)
      }
    }
  }
  return excluded
}

/**
 * Deterministically build the being's growth state from an ordered list of
 * journey GROWTH EVENTS. Each event is seeded by hash(seedKey + ":" + index),
 * so the same seedKey + same events always reproduces the exact same being —
 * positions, glyphs AND upgrade states; prefixes stay stable as it grows.
 *
 *   MAJOR event → the section's SIGIL lands as a mirrored accessory pair on
 *   the being's edge/aura (a keepsake of that star's substance), PLUS one
 *   existing detail matures — a visible burst to match the skeleton stage-up.
 *
 *   MINOR event → ~50/50 (UPGRADE_CHANCE): a new zone-texture detail appears
 *   at its ladder's faint first step, or an existing detail (texture OR
 *   sigil) matures one step. Fully-matured picks fall back to ADD.
 *
 * Adds fill inside-out (ZONE_FILL_ORDER + density caps), keep
 * MIN_DETAIL_SPACING, never sit beside eyes/mouth, and every
 * SYMMETRY_EVERY-th texture add is mirrored for composure.
 */
export function buildJourneyGrowth(
  seedKey: string,
  events: GrowthEvent[],
  grid: AccretionGrid,
): PlacedDetail[] {
  const placed: PlacedDetail[] = []
  if (events.length === 0) return placed

  const occupied = new Set<string>(grid.skeletonCells)
  const faceExcluded = buildFaceExclusion(grid)
  const key = (r: number, c: number) => `${r},${c}`
  const zoneFill: Record<DetailZone, number> = { body: 0, edge: 0, aura: 0 }
  let addCount = 0

  const spacedOk = (r: number, c: number, spacing: number) => {
    for (const d of placed) {
      if (Math.max(Math.abs(d.row - r), Math.abs(d.col - c)) < spacing)
        return false
    }
    return true
  }

  const findSpot = (
    rand: () => number,
    spacing: number,
    zonesOrder: DetailZone[],
  ): [number, number, DetailZone] | null => {
    for (const z of zonesOrder) {
      const cells = grid.cellsByZone[z]
      if (!cells.length) continue
      const cap = Math.ceil(cells.length * ZONE_DENSITY_CAP[z])
      if (zoneFill[z] >= cap) continue // zone at soft capacity → next zone
      const start = Math.floor(rand() * cells.length)
      for (let k = 0; k < cells.length; k++) {
        const [r, c] = cells[(start + k) % cells.length]
        const kk = key(r, c)
        if (occupied.has(kk) || faceExcluded.has(kk)) continue
        if (!spacedOk(r, c, spacing)) continue
        return [r, c, z]
      }
    }
    return null
  }

  const place = (
    i: number,
    r: number,
    c: number,
    zone: DetailZone,
    ladder: string[],
    sigil: boolean,
  ) => {
    occupied.add(key(r, c))
    zoneFill[zone]++
    placed.push({
      row: r,
      col: c,
      char: ladder[0],
      zone,
      ladder,
      level: 0,
      index: i,
      upgradedAt: null,
      sigil: sigil || undefined,
    })
  }

  const upgradeOne = (i: number, rand: () => number): boolean => {
    // Distinct upgradable identities (mirrored pairs share an index and
    // mature together so the being stays composed).
    const upgradable = Array.from(
      new Set(
        placed
          .filter((d) => d.level < d.ladder.length - 1)
          .map((d) => d.index),
      ),
    )
    if (upgradable.length === 0) return false
    const pick = upgradable[Math.floor(rand() * upgradable.length)]
    for (const d of placed) {
      if (d.index !== pick) continue
      d.level++
      d.char = d.ladder[d.level]
      d.upgradedAt = i
    }
    return true
  }

  const addTexture = (i: number, rand: () => number) => {
    // Try with full spacing, then relax to 1 so late growth still lands.
    const spot =
      findSpot(rand, MIN_DETAIL_SPACING, ZONE_FILL_ORDER) ??
      findSpot(rand, 1, ZONE_FILL_ORDER)
    if (!spot) return
    const [r, c, zone] = spot
    place(i, r, c, zone, MATURITY_LADDERS[zone], false)
    addCount++

    // Every Nth texture ADD: mirror it across the vertical axis.
    if (addCount % SYMMETRY_EVERY === 0) {
      const mc = grid.cols - 1 - c
      const mk = key(r, mc)
      if (mc !== c && !occupied.has(mk) && !faceExcluded.has(mk)) {
        place(i, r, mc, zone, MATURITY_LADDERS[zone], false)
      }
    }
  }

  const addSigil = (i: number, flavor: string, rand: () => number) => {
    const ladder = SECTION_SIGILS[flavor] ?? MATURITY_LADDERS.aura
    // Sigils are worn OUTSIDE the form: prefer the edge, spill to aura.
    const spot =
      findSpot(rand, MIN_DETAIL_SPACING, ["edge", "aura"]) ??
      findSpot(rand, 1, ["edge", "aura"]) ??
      findSpot(rand, 1, ZONE_FILL_ORDER)
    if (!spot) return
    const [r, c, zone] = spot
    place(i, r, c, zone, ladder, true)
    // Always mirrored — an accessory sits on the being like a matched pair.
    const mc = grid.cols - 1 - c
    const mk = key(r, mc)
    if (mc !== c && !occupied.has(mk) && !faceExcluded.has(mk)) {
      place(i, r, mc, zone, ladder, true)
    }
  }

  events.forEach((ev, i) => {
    const rand = mulberry32(hashString(`${seedKey}:${i}:${ev.kind}`))
    if (ev.kind === "major") {
      // Big change: the section's sigil lands + something matures with it.
      addSigil(i, ev.flavor, rand)
      upgradeOne(i, rand)
      return
    }
    // Minor: quiet add-or-mature.
    if (rand() < UPGRADE_CHANCE && upgradeOne(i, rand)) return
    addTexture(i, rand)
  })

  return placed
}

/**
 * Score-driven wrapper (legacy path): `eventCount` anonymous minor events.
 * Kept so engagement-score consumers (e.g. /self) keep working unchanged.
 */
export function buildGrowth(
  seedKey: string,
  eventCount: number,
  grid: AccretionGrid,
): PlacedDetail[] {
  const events: GrowthEvent[] = Array.from(
    { length: Math.max(0, eventCount) },
    () => ({ kind: "minor" as const, flavor: "" }),
  )
  return buildJourneyGrowth(seedKey, events, grid)
}

/** Resting opacity for a detail by zone (aura is faintest). */
export const ZONE_OPACITY: Record<DetailZone, number> = {
  aura: 0.5,
  body: 0.72,
  edge: 0.66,
}

/**
 * The interchangeable glyphs a placed detail can flicker between: its own
 * character plus same-weight lookalikes from FLICKER_FAMILIES. Deliberately
 * NEVER other ladder steps — moment-to-moment aliveness stays fully separate
 * from permanent maturity (a flicker can't fake or hide growth).
 */
export function detailSiblings(char: string, _zone: DetailZone): string[] {
  const fam = FLICKER_FAMILIES[char]
  if (!fam || fam.length < 2) return [char]
  return Array.from(new Set([char, ...fam]))
}
