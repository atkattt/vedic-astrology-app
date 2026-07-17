"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { Mood } from "@/components/circle/SelfAvatar"
import SelfCreature, { type SelfCreatureHandle } from "@/components/self/self-creature"
import type { Person, Relationship } from "@/lib/db/schema"
import { useSpiral } from "@/components/spiral/spiral-provider"
import { makePersonRead, type Read } from "@/lib/spiral/reads"
import { scoreToStage } from "@/lib/self/avatar-stages"
import { UniverseReadPanel, type PanelData } from "@/components/circle/universe-read-panel"
import { saveRevealRadius } from "@/app/actions/progress"
import { saveReadResponse } from "@/app/actions/self-reads"
import { matchFragments, type Chart, type Fragment } from "@/lib/matcher"
import { CHART_KEY } from "@/lib/birth-data"
import {
  describeTrigger,
  symbolFor,
  type UniverseFragment,
} from "@/lib/spiral/universe-reads"
import { moodForRead, NEUTRAL_MOOD, type ReadMood } from "@/lib/self/read-moods"
import { choreograph } from "@/lib/self/moves"
import {
  SECTION_ORDER,
  SECTION_COLORS,
  sectionFor,
  type SectionKey,
} from "@/lib/spiral/sections"

// Neutral self color — a glowing white, NOT gold. Reactions tint away from it.
const NEUTRAL_COLOR = "#e8e4da"
const AGREE_COLOR = "#8fc9a3"
const DISAGREE_COLOR = "#d98a9a"

// Mix two hex colors (#rrggbb): t=0 → a, t=1 → b. Used for the attunement
// pulses — brightening a read's accent on agree and fading its afterglow.
function mixHex(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => Number.parseInt(a.slice(i, i + 2), 16))
  const pb = [1, 3, 5].map((i) => Number.parseInt(b.slice(i, i + 2), 16))
  return `#${pa
    .map((v, i) =>
      Math.round(v + (pb[i] - v) * t)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`
}
// A tap must stay under this many pixels of movement to count as a click
// (otherwise dragging across the universe would open panels by accident).
const TAP_SLOP = 6

/**
 * SpiralUniverse — Layer 1 of the explorable universe.
 *
 * Turns the spiral area into a draggable, zoomable "universe." The SelfCreature
 * stays PINNED at the center of the stage and never moves; the universe layer
 * (starfield + spiral arm + object markers) pans and zooms behind/around it.
 *
 * Two layers, by design:
 *   1. #universe — absolutely positioned, transform-origin 0 0, gets a CSS
 *      transform translate(tx,ty) scale(s). Everything that should pan/zoom
 *      lives inside it, positioned in WORLD coordinates (0,0 = universe center).
 *   2. The avatar — a SEPARATE layer on top, pinned to stage center. It is NOT
 *      inside #universe, so the zoom/pan transform never touches it.
 *
 * Layer 1 uses placeholder markers only. Real read-objects and people, plus
 * click-to-open reads, arrive in Layers 2 and 3.
 */

const MIN_SCALE = 0.4
// Capped at 2x: beyond that, CSS-scaled glyph text pixelates badly.
const MAX_SCALE = 2

// ---- Layer 4: progressive reveal ----------------------------------------
// The universe starts mostly in void. Each answered read pushes a circular
// "revealed frontier" outward from center; objects/stars now inside it
// materialize (fade up, desaturate→color, scale into place). Objects beyond
// the frontier stay dimly visible but locked (not clickable, no label).
// Starting frontier: covers the innermost reads from the first moment; with
// many fragments the outer beads (and all PEOPLE, radius >= ~278) start
// beyond it and reveal progressively as reads are answered.
const BASE_REVEAL_RADIUS = 240
// How far each answer pushes the frontier outward. Deliberately small (~1/3
// of the old 120) so it takes several reads to noticeably grow the fog — but
// the judge also guarantees the NEXT unanswered read is always pulled just
// inside the frontier (capped at 2 steps), so progress never stalls while
// whole regions stay unrevealed.
const REVEAL_STEP = 40

// Spiral geometry in world units, centered on (0,0).
const TURNS = 3
const MAX_R = 480
// No nebula glyph is drawn within this radius — carves a clean hole where the
// avatar disc lives. Sized for the SMALLEST disc (stage 1 ≈ 120px diameter) so
// the hole never peeks around the constant-size disc at any stage:
// clear-radius × MAX_SCALE ≤ min disc screen radius (60px). Bigger discs simply
// cover more glyphs with their opaque background — intended.
const AVATAR_CLEAR_RADIUS = 28

// ---- Stage-driven disc sizing --------------------------------------------
// The creature's disc grows with its evolution: stage 1 ≈ 120px diameter,
// +20px per stage to ≈ 200px at stage 5, then +2px per accretion detail,
// capped at 240px. The creature glyph scales with the disc (constant ratio,
// keeping the skeleton at roughly 45-55% of the disc).
function discSizeFor(stage: number, detailCount: number): number {
  return Math.min(240, 120 + (stage - 1) * 20 + detailCount * 2)
}
const FADE_BAND = 76
// The nebula is sampled along the spiral curve; at each sample we scatter a
// small cloud of glyphs across the arm's width, so the sky reads as dense
// drifting fog rather than a thin bead-trail.
// Radius of the clean disc carved out of the nebula around each read/person
// marker, so its star badge sits in the spiral without a fog glyph behind it.
const MARKER_CLEAR_RADIUS = 26
const NEBULA_SAMPLES = 240
const GLYPH_T_START = 0.04
const GLYPH_T_END = 1.72

// Monospace fog glyphs, weighted toward faint punctuation so bright marks
// ( ✦ * @ ) only occasionally spark inside the cloud.
const NEBULA_CHARS = [
  "·", "·", "·", "·", ":", ":", ";", "'", "˚", "˙",
  "+", "=", "/", "*", "×", "@", ".", "·", ":", "'",
]
// Cool moonlit-fog tones (pale blue-white → dim slate) chosen per glyph.
const NEBULA_TONES = ["#cdd8e4", "#b3c2d2", "#9cadc0", "#8496ab", "#6f8299"]

function spiralPoint(t: number) {
  const theta = t * TURNS * Math.PI * 2 - Math.PI / 2
  const r = MAX_R * t
  return { x: r * Math.cos(theta), y: r * Math.sin(theta) }
}

// Deterministic PRNG (mulberry32) so the scattered nebula is identical on the
// server and client — random-looking, but stable across hydration.
function mulberry32(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Round a numeric px value to 2 decimals for inline styles. The browser's
 * CSSOM rounds sub-pixel values when it parses server HTML, so full-precision
 * floats hydrate as a mismatch (server "-66.7769px" vs client -66.776908...).
 * Rounding to 0.01px is imperceptible and serializes identically on both sides.
 */
function px2(n: number): number {
  return Math.round(n * 100) / 100
}

type Glyph = {
  key: number
  x: number
  y: number
  r: number
  /** spiral parameter of this glyph's sample — gates the drawn extent */
  t: number
  char: string
  size: number
  /** lit opacity target once inside the frontier */
  max: number
  /** cool tone color for this glyph when lit */
  tone: string
  /** shimmer animation duration (s) + negative start delay for stagger */
  shimmerDur: number
  delay: number
}

// READ objects — the user's MATCHED FRAGMENTS (same pipeline as /self) —
// beaded along the spiral arm as ONE LINEAR PATH in walking order: section 1's
// major star, then its minis one after another ALONG the arm, then section 2's
// star, its minis, and so on (section order: ascendant → moon → sun → knot →
// nodes → chapter; see lib/spiral/sections.ts). No clusters — the sequence IS
// the path, and the ringed cursor walks it one read at a time.
const READ_T_START = 0.3
const MAJOR_WEIGHT = 7
// Arc length (world units) between consecutive reads in the sequence — even
// spacing, comfortably clear of the widest badge (31px).
const READ_ARC_GAP = 46
// Extra arc breathing room between one section's last read and the next
// section's star, so sections read as distinct runs along the path.
const SECTION_ARC_GAP = 86
// The drawn spiral's tail: how much extra arc of sparse fog trails past the
// last placed read before fading out (implying more beyond).
const SPIRAL_TAIL_ARC = 150

/** Advance t along the spiral by `arc` world units (small Euler steps). */
function advanceT(t: number, arc: number): number {
  let remaining = arc
  let cur = t
  while (remaining > 0) {
    const dsdt = MAX_R * Math.sqrt(1 + (2 * Math.PI * TURNS * cur) ** 2)
    const step = Math.min(remaining, 12)
    cur += step / dsdt
    remaining -= step
  }
  return cur
}

// PEOPLE live ON the spiral arm too, further out than the reads. The first
// person added sits innermost; each subsequent one is placed further along.
const PERSON_MIN_T = 0.58
const PERSON_MAX_T = 1.12

function personT(i: number, n: number) {
  if (n <= 1) return 0.72
  return PERSON_MIN_T + (PERSON_MAX_T - PERSON_MIN_T) * (i / (n - 1))
}

// Fallback palette for people (used only when colorById has no entry), kept
// distinct from the read colors above.
const PERSON_COLORS = ["#8ab6e8", "#e8b84a", "#5fd0a8", "#e87a7a", "#6ac9d8", "#e8a35f"]

type PlacedRead = {
  label: string
  x: number
  y: number
  r: number
  /** the SECTION's accent color (shared by every read in the constellation) */
  color: string
  panel: PanelData
  read: Read
  /** how the creature behaves on the panel stage — from tone + life_domain */
  mood: ReadMood
  /** star on the arm (major) vs clustered glyph (minor) */
  kind: "major" | "minor"
  /** the minor's sigil glyph (majors render the star char) */
  glyph: string
  sectionKey: SectionKey
  sectionIdx: number
}

type SectionRun = {
  key: SectionKey
  idx: number
  color: string
  /** this section's reads in walking order (major first, then minis) */
  reads: PlacedRead[]
  /** spiral parameter of this section's last read */
  endT: number
  /** radius of this section's outermost read */
  endR: number
}
type PlacedPerson = {
  person: Person
  x: number
  y: number
  r: number
  color: string
  panel: PanelData
  read: Read
}
type PlacedBond = { id: number; x1: number; y1: number; x2: number; y2: number }

export function SpiralUniverse({
  people,
  relationships,
  colorById,
  engagementScore = 0,
  userId,
  onSelectSelf,
  guest,
  initialRevealRadius = BASE_REVEAL_RADIUS,
  onHomeChange,
  matchedReads,
  initialResponses,
  guestFragments,
}: {
  people: Person[]
  relationships: Relationship[]
  colorById: Map<number, string>
  /** resting expression, retained for API compatibility (unused by creature) */
  mood?: Mood
  /** drives the evolving self creature's stage + accretion detail count */
  engagementScore?: number
  /** stable per-user seed so the creature regrows the exact same being */
  userId?: string
  onSelectSelf?: () => void
  guest: boolean
  initialRevealRadius?: number
  /** notifies the parent when the camera leaves / returns to the home view */
  onHomeChange?: (home: boolean) => void
  /** authed: matched fragments from the /self pipeline (weight desc) */
  matchedReads?: UniverseFragment[]
  /** authed: saved agree/disagree per fragment id from read_responses */
  initialResponses?: Record<string, "agree" | "disagree">
  /** guest: ALL fragments; matched client-side against the stashed chart */
  guestFragments?: UniverseFragment[]
}) {
  const stageRef = useRef<HTMLDivElement | null>(null)
  const universeRef = useRef<HTMLDivElement | null>(null)
  // The avatar wrapper gets an inverse counter-scale (1/cam.scale) applied in
  // the same render pass as the camera transform, so the creature's disc stays
  // a constant screen size at every zoom without jitter during pinch.
  const avatarRef = useRef<HTMLDivElement | null>(null)
  const camRef = useRef({ x: 0, y: 0, scale: 1 })
  // True when the camera sits at the home composition (scale 1, origin
  // centered). Drives the return-home "you" button's visibility and lets the
  // parent fade its chrome (exit / menu / hints) while exploring.
  const [isHome, setIsHome] = useState(true)
  const onHomeChangeRef = useRef(onHomeChange)
  onHomeChangeRef.current = onHomeChange
  useEffect(() => {
    onHomeChangeRef.current?.(isHome)
  }, [isHome])
  // Timer that strips the transient CSS transition off the universe transform
  // after an animated camera move (home / panel lift) finishes.
  const camAnimTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Pointer / gesture bookkeeping.
  const draggingRef = useRef(false)
  const lastRef = useRef({ x: 0, y: 0 })
  const ptsRef = useRef<Map<number, { x: number; y: number }>>(new Map())
  const pinchRef = useRef(0)
  // Click-vs-drag: where the gesture started, and whether it ever exceeded the
  // tap slop. Object clicks are ignored once movement crosses the threshold.
  const downPtRef = useRef({ x: 0, y: 0 })
  const movedRef = useRef(false)
  // The element pressed at pointerdown. We resolve taps here (not via onClick)
  // because the stage takes pointer capture, which retargets the click event
  // away from the object that was actually pressed.
  const downTargetRef = useRef<HTMLElement | null>(null)

  const { agree, disagree, agreed, disagreed } = useSpiral()
  // Ids of every read the user has responded to (agreed OR disagreed):
  // seeded from the SAVED read_responses rows (same table /self reads), plus
  // anything answered this session. COMPLETED reads shed their ring and live
  // bare in their accent color.
  const respondedIds = useMemo(() => {
    const s = new Set<string>(Object.keys(initialResponses ?? {}))
    for (const r of agreed) s.add(r.id)
    for (const r of disagreed) s.add(r.id)
    return s
  }, [agreed, disagreed, initialResponses])

  // Guest matching: guests have no charts row — their chart was computed by
  // the onboarding ritual and stashed in local/sessionStorage. Run the SAME
  // deterministic matcher against it, client-side, once mounted.
  const [guestMatched, setGuestMatched] = useState<UniverseFragment[]>([])
  useEffect(() => {
    if (!guest || !guestFragments?.length) return
    try {
      const raw =
        localStorage.getItem(CHART_KEY) ?? sessionStorage.getItem(CHART_KEY)
      if (!raw) return
      const chart = JSON.parse(raw) as Chart
      const matched = matchFragments(
        chart,
        guestFragments as unknown as Fragment[],
      ) as unknown as UniverseFragment[]
      setGuestMatched(matched)
    } catch {
      // no stashed chart / bad JSON — the guest universe simply has no reads
    }
  }, [guest, guestFragments])

  // The fragments that become read objects, highest weight first (both the
  // server loader and matchFragments sort by weight desc).
  const fragments = guest ? guestMatched : (matchedReads ?? [])

  // ---- Layer 4: the revealed frontier --------------------------------------
  // How far the universe has been uncovered, in world units from center.
  // Seeded from the user's saved progress so returning users keep their world.
  const [revealRadius, setRevealRadius] = useState(initialRevealRadius)
  // Mirror into a ref so the (stable) pointer handler can gate taps on locked
  // objects without re-subscribing.
  const revealRadiusRef = useRef(revealRadius)
  revealRadiusRef.current = revealRadius

  // Track the previous frontier so we can flare-in only the objects that just
  // crossed into the revealed zone this step. The ref lags one render behind:
  // during the render right after an expansion it still holds the old radius,
  // which is exactly the window we use to detect "newly revealed".
  const prevRevealRef = useRef(revealRadius)
  useEffect(() => {
    prevRevealRef.current = revealRadius
  }, [revealRadius])
  const justRevealed = (r: number) =>
    r > prevRevealRef.current && r <= revealRadius

  // The open read/person panel + the avatar's transient reaction. `fragment`
  // marks panels backed by a fragment row, whose yes/no must ALSO persist to
  // read_responses (the same table /self writes).
  const [panel, setPanel] = useState<{
    data: PanelData
    read: Read
    fragment?: boolean
    mood?: ReadMood
  } | null>(null)
  // Mood ease-in: when a panel opens, the creature keeps NEUTRAL behavior for
  // a beat, then eases into the read's mood (~600ms ramp via CSS transitions +
  // animation swap) instead of an instant personality swap.
  const [moodActive, setMoodActive] = useState(false)
  const [reactMood, setReactMood] = useState<Mood | null>(null)
  const [reactColor, setReactColor] = useState<string | null>(null)
  const reactTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // The evolving self creature at the center. Its stage comes from real
  // engagement; its brief reactions mirror the universe's read reactions.
  const creatureRef = useRef<SelfCreatureHandle>(null)
  // The second creature instance standing on the open panel's top edge — the
  // one actually visible while a read is open, so reactions fire on it too.
  const stageCreatureRef = useRef<SelfCreatureHandle>(null)

  // Disc size follows the creature's evolution (see discSizeFor). detailCount
  // mirrors SelfCreature's own accretion rule: one detail per growth point.
  const creatureStage = scoreToStage(engagementScore)
  const creatureDetails = Math.max(0, Math.floor(engagementScore))
  const discSize = discSizeFor(creatureStage, creatureDetails)
  // Constant ratio (the previous 248/188 proportion) keeps the skeleton at
  // roughly half the disc at every stage.
  const creatureSize = Math.round(discSize * (248 / 188))
  useEffect(() => {
    if (!reactMood) return
    const kind =
      reactMood === "agree" ? "agree" : reactMood === "submit" ? "submit" : "disagree"
    creatureRef.current?.react(kind)
    stageCreatureRef.current?.react(kind)
  }, [reactMood])

  const closePanel = useCallback(() => {
    if (reactTimer.current) clearTimeout(reactTimer.current)
    setPanel(null)
    setReactMood(null)
    setReactColor(null)
  }, [])

  // THE SEQUENCE — fragments grouped by section (fixed order), each section's
  // heaviest weight>=7 read its major star, then its minis, ALL beaded one
  // after another along the arm in walking order. Every read still carries
  // the panel content (authored title + body EXACTLY as written, trigger in
  // plain words, sigil) and a Read whose id IS the fragment id, so
  // agree/disagree persists to read_responses and /self shows the same state.
  const sections = useMemo<SectionRun[]>(() => {
    const groups = new Map<SectionKey, UniverseFragment[]>()
    for (const f of fragments) {
      // Explicit fragments.section wins; when null (column missing or not
      // backfilled) the section is DERIVED from the trigger type + planets,
      // so authored fragments spread across the journey instead of
      // collapsing into one section.
      const key = sectionFor(f.section, f.trigger_type, f.condition)
      const g = groups.get(key)
      if (g) g.push(f)
      else groups.set(key, [f])
    }
    const present = SECTION_ORDER.filter((s) => groups.has(s))

    let t = READ_T_START
    return present.map((key, idx) => {
      // Weight sorts; the heaviest weight>=7 read is THE major (heaviest
      // overall stands in when none reaches the threshold), the rest follow
      // as minis in weight order.
      const frags = [...groups.get(key)!].sort(
        (a, b) => (b.weight ?? 0) - (a.weight ?? 0),
      )
      const majorIdx = frags.findIndex((f) => (f.weight ?? 0) >= MAJOR_WEIGHT)
      const majorFrag = frags[majorIdx === -1 ? 0 : majorIdx]
      const ordered = [majorFrag, ...frags.filter((f) => f !== majorFrag)]
      const color = SECTION_COLORS[key]

      if (idx > 0) t = advanceT(t, SECTION_ARC_GAP)
      const reads = ordered.map((f, j) => {
        if (j > 0) t = advanceT(t, READ_ARC_GAP)
        const pt = spiralPoint(t)
        return {
          label: f.title,
          x: pt.x,
          y: pt.y,
          r: Math.hypot(pt.x, pt.y),
          color,
          panel: {
            src: describeTrigger(f),
            title: f.title,
            body: f.body,
            accent: color,
            symbol: symbolFor(f),
          },
          read: { id: f.id, category: "about-you" as const, text: f.body },
          mood: moodForRead(f.tone, f.life_domain),
          kind: j === 0 ? ("major" as const) : ("minor" as const),
          glyph: symbolFor(f),
          sectionKey: key,
          sectionIdx: idx,
        }
      })
      return {
        key,
        idx,
        color,
        reads,
        endT: t,
        endR: reads[reads.length - 1].r,
      }
    })
  }, [fragments])

  // Sections whose reads are ALL answered — the single source of truth for
  // progression AND the full-saturation glow (see the marker renderer).
  const fullyAnswered = useMemo(
    () => sections.map((s) => s.reads.every((r) => respondedIds.has(r.read.id))),
    [sections, respondedIds],
  )

  // Progressive appearance: section 1 is present from first arrival; the NEXT
  // section's star appears ONLY when the current section is FULLY answered —
  // its major and ALL of its minis. Partial completion never advances.
  // Derived purely from responses, so a returning user's sky rebuilds
  // correctly — including self-healing states where a section was fully
  // answered but the next star never got unlocked in an earlier session.
  const unlockedCount = useMemo(() => {
    let n = Math.min(1, sections.length)
    while (n < sections.length && fullyAnswered[n - 1]) n++
    return n
  }, [sections, fullyAnswered])

  // SPIRAL EXTENSION — the drawn spiral initially only reaches far enough to
  // hold the first 3 sections (+ a sparse fading tail implying more). When
  // section 3 FULLY completes the spiral GROWS: fog glyphs draw in
  // progressively outward (the ~2s luminous crawl below) to hold sections 4-6.
  const initialTEnd = useMemo(() => {
    const holdIdx = Math.min(2, sections.length - 1)
    const endT = sections[holdIdx]?.endT ?? READ_T_START
    return Math.min(GLYPH_T_END, advanceT(endT, SPIRAL_TAIL_ARC))
  }, [sections])
  const spiralExtended =
    sections.length <= 3 || (sections.length > 3 && unlockedCount > 3)
  const visibleTEnd = spiralExtended ? GLYPH_T_END : initialTEnd

  // Live growth: when spiralExtended flips during the session (not on a
  // rebuilt returning-user sky), stagger the new glyphs' fade-in outward
  // over ~2s so the arm visibly crawls into the dark.
  const [crawling, setCrawling] = useState(false)
  const prevExtendedRef = useRef<boolean | null>(null)
  useEffect(() => {
    const prev = prevExtendedRef.current
    prevExtendedRef.current = spiralExtended
    if (prev === false && spiralExtended) {
      setCrawling(true)
      const t = setTimeout(() => setCrawling(false), 3400)
      return () => clearTimeout(t)
    }
  }, [spiralExtended])

  // Fog visibility vs the drawn extent: 1 well inside, thinning to 0 across
  // the last ~0.12 of t before the edge (the sparse fade-out tail).
  const extFade = (t: number) => {
    const fadeStart = visibleTEnd - 0.12
    if (t <= fadeStart) return 1
    if (t >= visibleTEnd) return 0
    return 1 - (t - fadeStart) / 0.12
  }
  // During the growth crawl, new fog (t past the old edge) fades in staggered
  // outward across ~2s — the luminous crawl.
  const crawlDelay = (t: number) =>
    crawling && t > initialTEnd
      ? ((t - initialTEnd) / Math.max(0.01, GLYPH_T_END - initialTEnd)) * 2
      : 0

  // Every read of every PLACED section — what actually renders. Unanswered
  // minis behind the cursor stay tappable forever.
  const reads = useMemo<PlacedRead[]>(() => {
    const out: PlacedRead[] = []
    for (let i = 0; i < unlockedCount; i++) out.push(...sections[i].reads)
    return out
  }, [sections, unlockedCount])

  // The frontier always expands to CONTAIN every placed section (its
  // outermost read + margin). When a new section is placed, this stretch is
  // what makes its star bloom in (the justRevealed flare fires for everything
  // the frontier just crossed). The expansion is TWEENED over ~2s so the fog
  // reveal follows the same pacing as the spiral-growth crawl. Persisted, so
  // a returning user's sky rebuilds already-expanded.
  const neededRevealR = useMemo(() => {
    let r = BASE_REVEAL_RADIUS
    for (let i = 0; i < unlockedCount; i++) {
      r = Math.max(r, sections[i].endR + 28)
    }
    return r
  }, [sections, unlockedCount])
  // STALE-FRONTIER CLAMP (once, on load): a returning user's persisted radius
  // may date from an older sky layout where much larger radii were legitimate.
  // If it exceeds what the CURRENT layout warrants (placed sections + the
  // small per-answer growth headroom), snap it down and persist the corrected
  // value — otherwise the whole fog renders pre-lit and the gradual reveal is
  // lost.
  const clampedRef = useRef(false)
  useEffect(() => {
    if (clampedRef.current || sections.length === 0) return
    clampedRef.current = true
    const cap = neededRevealR + REVEAL_STEP * 2
    if (revealRadiusRef.current > cap) {
      setRevealRadius(cap)
      if (!guest) void saveRevealRadius(cap).catch(() => {})
    }
  }, [sections, neededRevealR, guest])

  useEffect(() => {
    const from = revealRadiusRef.current
    if (neededRevealR <= from) return
    if (!guest) void saveRevealRadius(neededRevealR).catch(() => {})
    // Small jumps land immediately; big ones (a new section) ease outward in
    // steps over ~2s, matching the crawl.
    if (neededRevealR - from < 80) {
      setRevealRadius(neededRevealR)
      return
    }
    const STEPS = 8
    let step = 0
    const iv = setInterval(() => {
      step++
      const p = step / STEPS
      const eased = 1 - (1 - p) * (1 - p)
      setRevealRadius(from + (neededRevealR - from) * eased)
      if (step >= STEPS) clearInterval(iv)
    }, 250)
    return () => clearInterval(iv)
  }, [neededRevealR, guest])

  const openRead = useCallback((r: PlacedRead) => {
    if (reactTimer.current) clearTimeout(reactTimer.current)
    setPanel({ data: r.panel, read: r.read, fragment: true, mood: r.mood })
    setReactMood("curious") // lean in
    // Attunement: the creature (glyphs + glow) adopts the read's accent while
    // the panel is open — SelfCreature eases the color over ~500ms.
    setReactColor(r.panel.accent ?? null)
  }, [])

  const openPerson = useCallback((p: PlacedPerson) => {
    if (reactTimer.current) clearTimeout(reactTimer.current)
    setPanel({ data: p.panel, read: p.read })
    setReactMood("curious")
    setReactColor(p.color) // tint to that person's color while open
  }, [])

  // yes/no from the panel → SAME persistence as the bottom ReadHub, plus a
  // brief avatar emote/tint that auto-decays before the panel closes.
  const judge = useCallback(
    (agreeIt: boolean) => {
      const current = panel
      if (!current) return
      if (agreeIt) agree(current.read)
      else disagree(current.read, "skip")
      // Fragment reads persist to read_responses — the SAME table /self
      // writes — so both surfaces always show the same saved responses.
      // Guests keep session-only state (their chart never left the browser).
      if (!guest && current.fragment) {
        void saveReadResponse(current.read.id, agreeIt ? "agree" : "disagree").catch(
          () => {},
        )
      }
      setReactMood(agreeIt ? "agree" : "disagree")
      const accent = current.data.accent ?? (agreeIt ? AGREE_COLOR : DISAGREE_COLOR)
      if (agreeIt) {
        // Absorbed: a saturated pulse — the accent pushed brighter — rides the
        // happy bounce while the panel lingers.
        setReactColor(mixHex(accent, "#ffffff", 0.3))
      } else {
        // Let it go: drain back to neutral (~400-500ms color ease) with the
        // curious tilt.
        setReactColor(null)
      }
      // Both YES and NO are self-knowledge — both push the frontier outward and
      // materialize more of the universe. The step is small (slow fog growth),
      // but revealing stays slightly ahead of the read progression: if the
      // next unanswered read would still be locked, the frontier stretches
      // just past it (capped at 2 steps so whole regions never flood open).
      // Persisted for authed users; guests stay in memory.
      setRevealRadius((prev) => {
        let next = prev + REVEAL_STEP
        const nextReadR = reads
          .filter((rd) => rd.read.id !== current.read.id && !respondedIds.has(rd.read.id))
          .map((rd) => rd.r)
          .filter((r) => r > next)
          .sort((a, b) => a - b)[0]
        if (nextReadR !== undefined) {
          next = Math.min(Math.max(next, nextReadR + 12), prev + REVEAL_STEP * 2)
        }
        if (!guest) void saveRevealRadius(next).catch(() => {})
        return next
      })
      if (reactTimer.current) clearTimeout(reactTimer.current)
      reactTimer.current = setTimeout(() => {
        if (agreeIt) {
          // Close the panel but carry a faint tint of the absorbed read for
          // ~2s before settling back to neutral white.
          setPanel(null)
          setReactMood(null)
          setReactColor(mixHex(NEUTRAL_COLOR, accent, 0.35))
          reactTimer.current = setTimeout(() => setReactColor(null), 2000)
        } else {
          closePanel()
        }
      }, 820)
    },
    [panel, agree, disagree, closePanel, guest, reads, respondedIds],
  )

  useEffect(() => {
    return () => {
      if (reactTimer.current) clearTimeout(reactTimer.current)
      if (camAnimTimer.current) clearTimeout(camAnimTimer.current)
    }
  }, [])

  // Read-open scene: while a panel is open the sky above it goes near-black
  // (a dim overlay fades the nebula/stars to ~10% over 300ms) and the creature
  // LEAVES its disc to take the stage — rendered ~1.5x, standing on the
  // panel's top edge, tinted the read's accent. Everything returns on close.
  const panelOpen = !!panel

  // Ease into the read's mood ~600ms after the panel opens (the stage slides
  // up in that window), and drop back to neutral the moment it closes — so the
  // yes/no reaction plays, then the creature returns to itself.
  useEffect(() => {
    if (!panelOpen) {
      setMoodActive(false)
      return
    }
    const t = setTimeout(() => setMoodActive(true), 600)
    return () => clearTimeout(t)
  }, [panelOpen])

  // The mood the on-stage creature is CURRENTLY expressing.
  const activeMood = moodActive && panel?.mood ? panel.mood : NEUTRAL_MOOD

  // The choreographer: once the mood is active, continuously compose 2-4
  // atomic moves weighted by the read's tone (see lib/self/moves.ts), play
  // them with jittered durations + small pauses, repeat with a new sequence.
  // Cancelled the moment the panel closes or the mood changes.
  const stageMoveRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!panelOpen || !moodActive) return
    const el = stageMoveRef.current
    if (!el) return
    return choreograph(
      el,
      {
        blink: (h) => stageCreatureRef.current?.blink(h),
        mutate: (s) => stageCreatureRef.current?.mutate(s),
      },
      activeMood.tone,
    )
  }, [panelOpen, moodActive, activeMood.tone])

  // World-space centers of every read/person marker, on the spiral arm. The
  // nebula carves a small clear disc around each so a marker's star sits IN the
  // spiral cleanly, never stacked on top of a fog glyph.
  const markerCenters = useMemo<{ x: number; y: number }[]>(() => {
    const pts = reads.map((r) => ({ x: r.x, y: r.y }))
    const n = people.length
    for (let i = 0; i < n; i++) pts.push(spiralPoint(personT(i, n)))
    return pts
  }, [reads, people.length])

  // The nebula: a dense field of ASCII glyphs scattered along AND across the
  // spiral arm, forming cloudy limbs with organic clumping (density noise)
  // rather than an even trail. Deterministic (seeded RNG + spiralPoint), so
  // SSR and the client render the exact same cloud.
  const glyphs = useMemo<Glyph[]>(() => {
    const rand = mulberry32(0x5eed)
    const out: Glyph[] = []
    let key = 0
    const along = (MAX_R * (GLYPH_T_END - GLYPH_T_START)) / NEBULA_SAMPLES
    // Two interleaved arms (half a turn apart) so the fog wraps around the moon
    // as a cloud rather than a single thin thread.
    const ARMS = [0, Math.PI]
    for (const armPhase of ARMS) {
      for (let s = 0; s <= NEBULA_SAMPLES; s++) {
        const t = GLYPH_T_START + (GLYPH_T_END - GLYPH_T_START) * (s / NEBULA_SAMPLES)
        const theta = t * TURNS * Math.PI * 2 - Math.PI / 2 + armPhase
        const rr = MAX_R * t
        const cx = rr * Math.cos(theta)
        const cy = rr * Math.sin(theta)
        // unit tangent + perpendicular to the curve at this point
        const tx = Math.cos(theta)
        const ty = Math.sin(theta)
        const px = -ty
        const py = tx
        // density noise → clumpy, cloudy arms instead of a uniform ribbon
        const dens = 0.35 + 0.65 * Math.abs(Math.sin(t * 5.1 + armPhase + 1.3) * Math.sin(t * 2.3 + 0.7))
        // wide arms that overlap into a continuous cloud, widening outward
        const armWidth = 30 + t * 74
        const count = 2 + Math.round(dens * 3.2)
        for (let k = 0; k < count; k++) {
          // triangular (gaussian-ish) perpendicular offset → denser near the
          // curve spine, thinning toward the arm edges
          const gp = rand() + rand() - 1
          const perp = gp * armWidth
          const off = (rand() - 0.5) * along * 2.2
          const x = cx + px * perp + tx * off
          const y = cy + py * perp + ty * off
          const dist = Math.hypot(x, y)
          if (dist < AVATAR_CLEAR_RADIUS) continue
          // Keep a clean disc around each marker so its star reads as part of
          // the spiral, not layered over a fog glyph.
          let nearMarker = false
          for (const m of markerCenters) {
            if (Math.hypot(x - m.x, y - m.y) < MARKER_CLEAR_RADIUS) {
              nearMarker = true
              break
            }
          }
          if (nearMarker) continue
          const rawEdge = Math.min(1, Math.max(0, (dist - AVATAR_CLEAR_RADIUS) / FADE_BAND))
          const edgeFade = rawEdge * rawEdge * (3 - 2 * rawEdge) // smoothstep
          // brighter near the spine, fainter toward the arm edge
          const widthFade = 1 - Math.min(1, Math.abs(perp) / (armWidth * 1.2)) * 0.7
          out.push({
            key: key++,
            x,
            y,
            r: dist,
            t,
            char: NEBULA_CHARS[Math.floor(rand() * NEBULA_CHARS.length)],
            size: 7 + Math.min(t, 1.5) * 7 + rand() * 4,
            max: (0.34 + rand() * 0.54) * edgeFade * widthFade,
            tone: NEBULA_TONES[Math.floor(rand() * NEBULA_TONES.length)],
            shimmerDur: 4 + rand() * 4.5,
            delay: -(rand() * 6),
          })
        }
      }
    }
    return out
  }, [markerCenters])

  // THE CURSOR — the ring sits on the FIRST unanswered read in the walking
  // sequence, major or mini alike, and moves one read at a time as answers
  // land. Purely derived from response data, so a returning user's cursor
  // reconstructs at their true position.
  const currentReadId = useMemo(() => {
    for (const r of reads) {
      if (!respondedIds.has(r.read.id)) return r.read.id
    }
    return null
  }, [reads, respondedIds])

  // When the ring passes to a new read (not on first paint), that star blooms
  // briefly (~800ms) as its ring + color arrive.
  const prevCurrentRef = useRef<string | null>(null)
  const [bloomId, setBloomId] = useState<string | null>(null)
  useEffect(() => {
    const prev = prevCurrentRef.current
    prevCurrentRef.current = currentReadId
    if (prev && currentReadId && prev !== currentReadId) {
      setBloomId(currentReadId)
      const t = setTimeout(() => setBloomId(null), 850)
      return () => clearTimeout(t)
    }
  }, [currentReadId])

  // PEOPLE — the others in the spiral, placed ON the arm by their order, each
  // in their own palette color. Tapping opens the bond read.
  const placedPeople = useMemo<PlacedPerson[]>(() => {
    const n = people.length
    return people.map((person, i) => {
      const { x, y } = spiralPoint(personT(i, n))
      const read = makePersonRead(person.id, person.name)
      return {
        person,
        x,
        y,
        r: Math.hypot(x, y),
        color: colorById.get(person.id) ?? PERSON_COLORS[i % PERSON_COLORS.length],
        panel: {
          src: "the bond between you",
          title: `${person.name} × you`,
          body: read.text,
          accent: colorById.get(person.id) ?? PERSON_COLORS[i % PERSON_COLORS.length],
        },
        read,
      }
    })
  }, [people, colorById])

  // BONDS — faint dashed lines between connected people, in world coords.
  const bonds = useMemo<PlacedBond[]>(() => {
    const byId = new Map(placedPeople.map((pp) => [pp.person.id, pp]))
    const out: PlacedBond[] = []
    for (const r of relationships) {
      const a = byId.get(r.fromPersonId)
      const b = byId.get(r.toPersonId)
      if (!a || !b) continue
      out.push({ id: r.id, x1: a.x, y1: a.y, x2: b.x, y2: b.y })
    }
    return out
  }, [relationships, placedPeople])

  // Mirror the latest placements + openers into refs so the (stable) pointer
  // effect can resolve a tap to the right object without re-subscribing.
  const readsRef = useRef(reads)
  readsRef.current = reads
  const peopleRef = useRef(placedPeople)
  peopleRef.current = placedPeople
  const openReadRef = useRef(openRead)
  openReadRef.current = openRead
  const openPersonRef = useRef(openPerson)
  openPersonRef.current = openPerson

  // Camera bounds: the world origin may never drift further than this from the
  // viewport center (in world units), so the view always contains part of the
  // populated universe and can't wander into empty void.
  const PAN_LIMIT = MAX_R * 1.2

  const clampCam = useCallback(() => {
    const cam = camRef.current
    const d = Math.hypot(cam.x, cam.y)
    if (d > PAN_LIMIT) {
      const k = PAN_LIMIT / d
      cam.x *= k
      cam.y *= k
    }
  }, [PAN_LIMIT])

  const apply = useCallback(() => {
    const stage = stageRef.current
    const universe = universeRef.current
    if (!stage || !universe) return
    const cam = camRef.current
    const cx = stage.clientWidth / 2
    const cy = stage.clientHeight / 2
    const tx = cx - cam.x * cam.scale
    const ty = cy - cam.y * cam.scale
    universe.style.transform = `translate(${tx}px, ${ty}px) scale(${cam.scale})`
    // Counter-scale the avatar in the same pass so it renders at constant
    // screen size and never jitters against the camera during pinch.
    if (avatarRef.current) {
      avatarRef.current.style.transform = `translate(-50%, -50%) scale(${1 / cam.scale})`
    }
    setIsHome(Math.abs(cam.scale - 1) < 0.005 && Math.abs(cam.x) < 1 && Math.abs(cam.y) < 1)
  }, [])

  // Run an animated camera move: temporarily put a transform transition on the
  // universe layer, apply the new camera, then strip the transition so drags
  // and pinches stay perfectly snappy afterwards.
  const animateCam = useCallback(
    (mutate: () => void, ms = 700) => {
      const universe = universeRef.current
      if (!universe) return
      if (camAnimTimer.current) clearTimeout(camAnimTimer.current)
      const easing = `transform ${ms}ms cubic-bezier(.3,.8,.3,1)`
      universe.style.transition = easing
      // The avatar's counter-scale must ease in lockstep with the camera.
      if (avatarRef.current) avatarRef.current.style.transition = easing
      mutate()
      apply()
      camAnimTimer.current = setTimeout(() => {
        universe.style.transition = ""
        if (avatarRef.current) avatarRef.current.style.transition = ""
      }, ms + 60)
    },
    [apply],
  )

  // Zoom anchored at a stage-relative point (sx,sy) — keeps that point fixed.
  const zoomAt = useCallback(
    (sx: number, sy: number, factor: number) => {
      const stage = stageRef.current
      if (!stage) return
      const cam = camRef.current
      const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, cam.scale * factor))
      if (newScale === cam.scale) return
      const cx = stage.clientWidth / 2
      const cy = stage.clientHeight / 2
      const wx = (sx - (cx - cam.x * cam.scale)) / cam.scale
      const wy = (sy - (cy - cam.y * cam.scale)) / cam.scale
      cam.scale = newScale
      cam.x = wx - (sx - cx) / cam.scale
      cam.y = wy - (sy - cy) / cam.scale
      clampCam()
      apply()
    },
    [apply, clampCam],
  )

  // Return home: smoothly animate the camera back to scale 1, avatar centered
  // (~700ms ease). Replaces the old RESET button — same end state, one motion.
  const goHome = useCallback(() => {
    animateCam(() => {
      camRef.current = { x: 0, y: 0, scale: 1 }
    }, 700)
  }, [animateCam])

  // THE UNLOCK MOMENT — when the last read of a section is answered during
  // this session (unlockedCount rises past its mount value), the next star
  // blooms in further along the arm; the camera acknowledges with a gentle
  // partial drift toward it (~40% of the way, no zoom), holds a beat while
  // the flare/reveal plays, then settles back home. Skipped on mount so a
  // returning user's rebuilt sky doesn't trigger a phantom drift.
  const prevUnlockedRef = useRef<number | null>(null)
  useEffect(() => {
    const prev = prevUnlockedRef.current
    prevUnlockedRef.current = unlockedCount
    if (prev === null || unlockedCount <= prev) return
    const star = sections[unlockedCount - 1]?.reads[0]
    if (!star) return
    const driftTimer = setTimeout(() => {
      animateCam(() => {
        camRef.current = {
          x: star.x * 0.4,
          y: star.y * 0.4,
          scale: camRef.current.scale,
        }
      }, 900)
    }, 500)
    const settleTimer = setTimeout(() => goHome(), 2600)
    return () => {
      clearTimeout(driftTimer)
      clearTimeout(settleTimer)
    }
  }, [unlockedCount, sections, animateCam, goHome])

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return

    const relX = (clientX: number) => clientX - stage.getBoundingClientRect().left
    const relY = (clientY: number) => clientY - stage.getBoundingClientRect().top

    const onPointerDown = (e: PointerEvent) => {
      // Let interactive controls (HUD buttons, avatar tap target) handle their
      // own clicks — don't hijack the pointer for panning, which would capture
      // it to the stage and swallow the click.
      if ((e.target as HTMLElement | null)?.closest("button")) return
      ptsRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
      draggingRef.current = true
      lastRef.current = { x: e.clientX, y: e.clientY }
      downPtRef.current = { x: e.clientX, y: e.clientY }
      movedRef.current = false
      downTargetRef.current = e.target as HTMLElement | null
      try {
        stage.setPointerCapture(e.pointerId)
      } catch {
        // ignore — capture is best-effort
      }
    }

    const onPointerMove = (e: PointerEvent) => {
      if (ptsRef.current.has(e.pointerId)) {
        ptsRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
      }
      // Once the pointer travels past the slop, this gesture is a drag, not a
      // tap — suppress any object click that would otherwise fire on pointerup.
      if (
        !movedRef.current &&
        Math.hypot(e.clientX - downPtRef.current.x, e.clientY - downPtRef.current.y) > TAP_SLOP
      ) {
        movedRef.current = true
      }
      // Two pointers → pinch zoom about their midpoint.
      if (ptsRef.current.size === 2) {
        const [a, b] = [...ptsRef.current.values()]
        const d = Math.hypot(a.x - b.x, a.y - b.y)
        const mx = (a.x + b.x) / 2
        const my = (a.y + b.y) / 2
        if (pinchRef.current) {
          zoomAt(mx - stage.getBoundingClientRect().left, my - stage.getBoundingClientRect().top, d / pinchRef.current)
        }
        pinchRef.current = d
        draggingRef.current = false
        return
      }
      if (!draggingRef.current) return
      const dx = e.clientX - lastRef.current.x
      const dy = e.clientY - lastRef.current.y
      lastRef.current = { x: e.clientX, y: e.clientY }
      const cam = camRef.current
      // Zoom-gated panning: at 100% the view IS the fixed home composition —
      // dragging does nothing. Panning unlocks only when zoomed in or out.
      if (Math.abs(cam.scale - 1) < 0.005) return
      // Divide by scale so pan speed feels natural at every zoom level.
      cam.x -= dx / cam.scale
      cam.y -= dy / cam.scale
      clampCam()
      apply()
    }

    // Resolve a tap: only when the gesture didn't move past the slop and wasn't
    // a pinch. We use the element pressed at pointerdown (capture retargets the
    // synthetic click, so onClick on the object is unreliable here).
    const resolveTap = () => {
      if (movedRef.current) return
      const objEl = downTargetRef.current?.closest<HTMLElement>("[data-obj]")
      if (!objEl) return
      const type = objEl.dataset.obj
      const idx = Number(objEl.dataset.objIndex)
      if (Number.isNaN(idx)) return
      // Locked objects (beyond the revealed frontier) can't be opened — the
      // user has to expand the frontier by answering reads first.
      if (type === "read") {
        const r = readsRef.current[idx]
        if (r && r.r <= revealRadiusRef.current) openReadRef.current(r)
      } else if (type === "person") {
        const p = peopleRef.current[idx]
        if (p && p.r <= revealRadiusRef.current) openPersonRef.current(p)
      }
    }

    const onPointerUp = (e: PointerEvent) => {
      const wasPinch = ptsRef.current.size >= 2
      ptsRef.current.delete(e.pointerId)
      if (ptsRef.current.size < 2) pinchRef.current = 0
      if (ptsRef.current.size === 0) {
        draggingRef.current = false
        if (!wasPinch) resolveTap()
        downTargetRef.current = null
      }
    }

    const onPointerCancel = (e: PointerEvent) => {
      ptsRef.current.delete(e.pointerId)
      if (ptsRef.current.size < 2) pinchRef.current = 0
      if (ptsRef.current.size === 0) {
        draggingRef.current = false
        downTargetRef.current = null
      }
    }

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12
      zoomAt(relX(e.clientX), relY(e.clientY), factor)
    }

    stage.addEventListener("pointerdown", onPointerDown)
    stage.addEventListener("pointermove", onPointerMove)
    stage.addEventListener("pointerup", onPointerUp)
    stage.addEventListener("pointercancel", onPointerCancel)
    stage.addEventListener("wheel", onWheel, { passive: false })

    const onResize = () => apply()
    window.addEventListener("resize", onResize)

    // Initial layout (rect is available now that we've mounted + painted).
    apply()

    return () => {
      stage.removeEventListener("pointerdown", onPointerDown)
      stage.removeEventListener("pointermove", onPointerMove)
      stage.removeEventListener("pointerup", onPointerUp)
      stage.removeEventListener("pointercancel", onPointerCancel)
      stage.removeEventListener("wheel", onWheel)
      window.removeEventListener("resize", onResize)
    }
  }, [apply, zoomAt, clampCam])

  const monoFont =
    "'Geist Pixel', ui-monospace, monospace"

  return (
    <div
      ref={stageRef}
      className="absolute inset-0 overflow-hidden"
      style={{
        touchAction: "none",
        cursor: "grab",
        userSelect: "none",
        // Pure black void — no gradient lift. The only light in this sky is the
        // cool nebula glow that blooms inside the revealed frontier.
        background: "#050505",
      }}
    >
      {/* ===== The universe layer: everything here pans + zooms — including
          the self creature, anchored at world origin (0,0). ===== */}
      <div
        ref={universeRef}
        className="absolute left-0 top-0"
        style={{ width: 0, height: 0, transformOrigin: "0 0", willChange: "transform" }}
      >
        {/* ── Nebula, glow underlay ──────────────────────────────────────
            One blurred layer holding EVERY glyph. Lit (inside-frontier) glyphs
            carry a soft cool bloom; locked ones sit at opacity 0. Because the
            whole layer shares a single blur filter, the moonlit-fog glow costs
            one filter pass instead of a shadow per glyph. When the frontier
            grows, new glyphs fade their bloom in over ~1.2s (spread by radius),
            so the fog visibly rolls outward. */}
        <div
          className="absolute left-0 top-0 select-none"
          style={{ width: 0, height: 0, filter: "blur(9px)" }}
        >
          {glyphs.map((g) => {
            const lit = g.r <= revealRadius
            const ext = extFade(g.t)
            const spread = justRevealed(g.r)
              ? Math.min(0.6, Math.max(0, (g.r - prevRevealRef.current) / REVEAL_STEP) * 0.6)
              : 0
            return (
              <span
                key={`bloom-${g.key}`}
                className="absolute"
                style={{
                  left: px2(g.x),
                  top: px2(g.y),
                  fontFamily: monoFont,
                  // Larger + brighter than the crisp glyph so the revealed
                  // region reads as luminous fog, not just brighter points.
                  fontSize: px2(g.size * 1.7),
                  lineHeight: 1,
                  color: "#bdd6ee",
                  transform: "translate(-50%, -50%)",
                  opacity: lit ? Math.min(1, g.max * 3.4) * ext : 0,
                  transition: "opacity 1.2s ease",
                  transitionDelay: `${Math.max(spread, crawlDelay(g.t))}s`,
                }}
              >
                {g.char}
              </span>
            )
          })}
        </div>

        {/* ── Nebula, crisp layer ────────────────────────────────────────
            The readable glyphs on top of the bloom.
              • inside the frontier → lit cool tone with a slow, staggered
                opacity shimmer; warms from dim ember to its tone over ~1.2s
                (delayed by radius) as the frontier passes over it.
              • outside → barely-there embers: very dim, desaturated, no glow.
            Positions are deterministic (seeded RNG), so SSR + client agree. */}
        {glyphs.map((g) => {
          const lit = g.r <= revealRadius
          const ext = extFade(g.t)
          const spread = justRevealed(g.r)
            ? Math.min(0.6, Math.max(0, (g.r - prevRevealRef.current) / REVEAL_STEP) * 0.6)
            : 0
          return (
            <span
              key={`glyph-${g.key}`}
              className={lit ? "animate-nebula-shimmer absolute select-none" : "absolute select-none"}
              style={{
                // Round to 2 decimals so full-precision floats don't hydrate as
                // a CSSOM-rounded mismatch (imperceptible at 0.01px).
                left: px2(g.x),
                top: px2(g.y),
                fontFamily: monoFont,
                fontSize: px2(g.size),
                lineHeight: 1,
                color: lit ? g.tone : "#4b515b",
                transform: "translate(-50%, -50%)",
                // Beyond the drawn spiral's current extent (ext → 0) the fog
                // simply doesn't exist yet; the last stretch before the edge
                // thins out as sparse embers implying more.
                opacity: lit ? undefined : Math.min(0.22, g.max * 0.6) * ext,
                // Lit glyphs run at ~2x their scattered base brightness so the
                // revealed fog is clearly luminous; unrevealed embers keep the
                // untouched dim path above.
                // @ts-expect-error custom property consumed by the shimmer keyframes
                "--glyph-max": (lit ? Math.min(1, g.max * 2) : g.max) * ext,
                animationDuration: `${g.shimmerDur}s`,
                animationDelay: `${g.delay}s`,
                transition: "color 1.2s ease, opacity 1.2s ease",
                transitionDelay: `${Math.max(spread, crawlDelay(g.t))}s`,
              }}
            >
              {g.char}
            </span>
          )
        })}

        {/* Bonds — faint dashed lines between connected people, in world
            coords. Drawn beneath the nodes via a zero-size, overflow-visible
            SVG anchored at the universe origin. */}
        {bonds.length > 0 && (
          <svg
            className="absolute left-0 top-0 overflow-visible"
            style={{ width: 0, height: 0 }}
            aria-hidden="true"
          >
            {bonds.map((b) => (
              <line
                key={b.id}
                x1={b.x1}
                y1={b.y1}
                x2={b.x2}
                y2={b.y2}
                stroke="#3a3550"
                strokeWidth={1}
                strokeDasharray="3 5"
                opacity={0.5}
              />
            ))}
          </svg>
        )}

        {/* READ objects — section constellations: each unlocked section's
            major star on the arm + its minor glyphs clustered around it. Tap
            to open. Taps resolve in the stage's pointerup handler (via
            data-obj), since pointer capture makes per-element onClick
            unreliable here. */}
        {reads.map((r, i) => {
          // Marker states within a constellation:
          // CURRENT   — the active section's major only: section-color ring +
          //             colored star + colored glow.
          // ANSWERED  — major or minor, takes the section color (minors keep
          //             their small local fog-tint glow, now in section hue);
          //             still tappable to reopen.
          // UNANSWERED major — bare white glowing star, no ring.
          // UNANSWERED minor — dim white glyph, waiting forever if need be.
          const completed = respondedIds.has(r.read.id)
          const isCurrent = r.read.id === currentReadId
          const blooming = bloomId === r.read.id
          const isMajor = r.kind === "major"
          // Subtle full-saturation glow once a constellation is 100% answered.
          const sectionDone = fullyAnswered[r.sectionIdx]
          const starColor = isCurrent || completed ? r.color : isMajor ? "#e8e4da" : "#8d8a80"
          return (
            <div
              key={r.read.id}
              data-obj="read"
              data-obj-index={i}
              role="button"
              tabIndex={0}
              aria-label={`Read: ${r.label}`}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  openRead(r)
                }
              }}
              className={`group absolute flex flex-col items-center${
                justRevealed(r.r) ? " animate-flare-in" : ""
              }`}
              style={{
                left: px2(r.x),
                top: px2(r.y),
                transform: "translate(-50%, -50%)",
                cursor: "pointer",
                transition:
                  "opacity 1s ease, filter 1s ease, transform 1s cubic-bezier(.3,.8,.3,1)",
              }}
            >
              <span
                className={`flex items-center justify-center rounded-full leading-none transition-all duration-500 group-hover:brightness-150 animate-object-pulse${
                  blooming ? " animate-current-bloom" : ""
                }`}
                style={{
                  // Major: the ringed CURRENT star's glyph fills ~60-65% of
                  // the circle (20px in a 31px ring); bare stars proportional.
                  // Minor: a smaller badge around the fragment's sigil.
                  width: isMajor ? 31 : 24,
                  height: isMajor ? 31 : 24,
                  backgroundColor: isCurrent ? "#050505" : "transparent",
                  border: isCurrent
                    ? `1.5px solid ${r.color}`
                    : "1.5px solid transparent",
                  color: starColor,
                  fontFamily: monoFont,
                  fontSize: isMajor ? (isCurrent ? 20 : 16) : 10,
                  letterSpacing: isMajor ? undefined : "-0.5px",
                  whiteSpace: "nowrap",
                  textShadow: completed
                    ? sectionDone
                      ? `0 0 6px ${r.color}, 0 0 14px ${r.color}, 0 0 26px ${r.color}88`
                      : `0 0 8px ${r.color}, 0 0 18px ${r.color}99`
                    : isCurrent
                      ? `0 0 8px ${r.color}, 0 0 18px ${r.color}`
                      : isMajor
                        ? `0 0 8px #e8e4da, 0 0 16px #e8e4da66`
                        : "0 0 6px #8d8a8055",
                  boxShadow: isCurrent
                    ? `0 0 10px ${r.color}, 0 0 20px ${r.color}66`
                    : "none",
                }}
              >
                {isMajor ? "\u2605" : r.glyph}
              </span>
            </div>
          )
        })}

        {/* PEOPLE — placed on the spiral arm, each in their own color. Tap to
            open the bond read. */}
        {placedPeople.map((pp, i) => {
          const locked = pp.r > revealRadius
          return (
            <div
              key={pp.person.id}
              data-obj="person"
              data-obj-index={i}
              role="button"
              tabIndex={locked ? -1 : 0}
              aria-hidden={locked || undefined}
              aria-label={`Bond: ${pp.person.name}`}
              onKeyDown={(e) => {
                if (locked) return
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  openPerson(pp)
                }
              }}
              className={`group absolute flex flex-col items-center${
                justRevealed(pp.r) ? " animate-flare-in" : ""
              }`}
              style={{
                left: px2(pp.x),
                top: px2(pp.y),
                transform: `translate(-50%, -50%) scale(${locked ? 0.78 : 1})`,
                opacity: locked ? 0.34 : 1,
                filter: locked ? "grayscale(0.8) blur(0.5px)" : "none",
                pointerEvents: locked ? "none" : "auto",
                cursor: locked ? "default" : "pointer",
                transition:
                  "opacity 1s ease, filter 1s ease, transform 1s cubic-bezier(.3,.8,.3,1)",
              }}
            >
              {/* A star set inside a black disc outlined in this person's hue —
                  a node in the spiral. Slightly larger than a read node. */}
              <span
                className={`flex items-center justify-center rounded-full leading-none transition-[filter] duration-150 group-hover:brightness-150${
                  locked ? "" : " animate-object-pulse"
                }`}
                style={{
                  width: 27,
                  height: 27,
                  backgroundColor: "#050505",
                  border: `1.5px solid ${locked ? "#4a4e56" : pp.color}`,
                  color: locked ? "#4a4e56" : pp.color,
                  fontFamily: monoFont,
                  fontSize: 13,
                  boxShadow: locked ? "none" : `0 0 11px ${pp.color}, 0 0 22px ${pp.color}66`,
                }}
              >
                {"\u2605"}
              </span>
            </div>
          )
        })}
        {/* ===== The avatar: anchored to the WORLD at origin (0,0) — the
            spiral's center — so it pans with the map, but counter-scaled by
            1/cameraScale (set imperatively in apply()) so the disc, creature,
            and outline render at a constant screen size at every zoom. ===== */}
        <div
          ref={avatarRef}
          className="pointer-events-none absolute z-[60]"
          style={{
            left: 0,
            top: 0,
            width: creatureSize,
            height: creatureSize,
            transform: "translate(-50%, -50%)",
            transformOrigin: "center",
          }}
        >
        {/* The moon of this sky: an opaque black disc that contains the self
            creature and masks the nebula behind it, so the fog reads as emerging
            from the circle's rim. Its outline normally sits at the neutral
            near-white, but adopts the color of whichever read/person panel is
            open — echoing the tapped node back onto the self. */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            width: discSize,
            height: discSize,
            backgroundColor: "#050505",
            border: `1.5px solid ${panel?.data.accent ?? NEUTRAL_COLOR}`,
            boxShadow: panel?.data.accent ? `0 0 18px ${panel.data.accent}55` : "none",
            // width/height ease makes stage-evolution growth a smooth swell.
            transition:
              "border-color .5s ease, box-shadow .5s ease, width .8s cubic-bezier(.3,.8,.3,1), height .8s cubic-bezier(.3,.8,.3,1)",
          }}
        />
        <div className="relative flex h-full w-full items-center justify-center overflow-hidden">
          <SelfCreature
            ref={creatureRef}
            score={engagementScore}
            seed={userId}
            color={reactColor ?? NEUTRAL_COLOR}
            size={creatureSize}
          />
        </div>
          {/* Tap target over the face → opens the chart read sheet. Still
              works inside the transformed layer: the stage's pointerdown
              handler skips buttons, so the native click reaches it. */}
          {onSelectSelf && (
            <button
              type="button"
              onClick={onSelectSelf}
              aria-label="Read your chart"
              className="pointer-events-auto absolute left-1/2 top-1/2 size-36 -translate-x-1/2 -translate-y-1/2 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          )}
        </div>
      </div>

      {/* Sky dim: while a read panel is open, the whole universe (nebula,
          stars, disc) fades to ~10% behind this near-black overlay — the
          creature has left its disc for the panel's stage. 300ms both ways. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-30"
        style={{
          background: "#050505",
          opacity: panelOpen ? 0.9 : 0,
          transition: "opacity 300ms ease",
        }}
      />

      {/* ===== HUD ===== */}
      {/* Top hint: white, fades out as soon as the camera leaves home. */}
      <div
        className="pointer-events-none absolute left-1/2 top-3 z-20 flex -translate-x-1/2 flex-col items-center gap-1 transition-opacity duration-500"
        style={{ opacity: isHome ? 1 : 0 }}
      >
        <p
          className="text-center text-[10px] uppercase tracking-[0.3em] text-balance"
          style={{ fontFamily: monoFont, color: "#fff" }}
        >
          pinch to zoom · swipe to explore
        </p>
      </div>

      {/* Bottom dock: one fixed slot shared by the hint text (at home) and the
          return-home button (when away), so the button appears in the exact
          position the text occupied. */}
      <div
        className="absolute bottom-4 left-1/2 z-20 flex h-12 -translate-x-1/2 items-center justify-center"
        style={{ marginRight: "-22px" }}
      >
        {isHome ? (
          <p
            className="pointer-events-none max-w-64 text-center text-[10px] lowercase leading-relaxed tracking-widest text-balance"
            style={{ fontFamily: monoFont, color: "#fff" }}
          >
            if you get lost, a button will appear here to take you back
          </p>
        ) : (
          /* Return-home: a tiny ghost of the creature's face + "you", shown
             only when the camera has left the home composition. Tapping glides
             the camera back to scale 1, centered (~700ms). */
          <button
            type="button"
            onClick={goHome}
            aria-label="Return to you"
            className="flex h-12 flex-col items-center justify-center rounded-lg px-3 animate-in fade-in duration-300"
            style={{
              fontFamily: monoFont,
              backgroundColor: "#0d0d0d",
              border: "1px solid #fff",
              color: "#fff",
            }}
          >
            <span className="text-[11px] leading-none">{"[..]"}</span>
            <span className="mt-1 text-[9px] lowercase leading-none tracking-widest">you</span>
          </button>
        )}
      </div>

      {/* Slide-up read panel — tapping a read/person opens it; yes/no persists
          to read_responses (fragments) / the spiral session, same as /self.
          The stage: the creature standing ON the panel's top edge, animated
          by the choreographer (endlessly varied mood-weighted move sequences)
          rather than a fixed idle loop, tinted the read's accent. */}
      <UniverseReadPanel
        data={panel?.data ?? null}
        onJudge={judge}
        onClose={closePanel}
        stage={
          panel ? (
            // Outer wrapper: the spirit-domain drift (up a few px + settle).
            // Inner wrapper: the choreographer's stage — moves animate its
            // transform via WAAPI, each starting/ending in neutral stance.
            <div
              style={{
                animation: activeMood.driftAnimation ?? "none",
              }}
            >
              <div
                ref={stageMoveRef}
                style={{
                  // relationships: constant slight lean toward the panel text
                  rotate: `${activeMood.leanDeg}deg`,
                  transition: "rotate 600ms ease",
                }}
              >
                <SelfCreature
                  ref={stageCreatureRef}
                  score={engagementScore}
                  seed={userId}
                  color={reactColor ?? panel.data.accent ?? NEUTRAL_COLOR}
                  size={Math.round(creatureSize * 3.375)}
                  breatheDuration={activeMood.breatheDuration}
                  blinkMinMs={activeMood.blinkMinMs}
                  blinkMaxMs={activeMood.blinkMaxMs}
                  blinkHoldMs={activeMood.blinkHoldMs}
                  ember={activeMood.ember}
                />
              </div>
            </div>
          ) : null
        }
      />
    </div>
  )
}


