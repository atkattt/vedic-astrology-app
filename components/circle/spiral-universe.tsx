"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { Mood } from "@/components/circle/SelfAvatar"
import SelfCreature, { type SelfCreatureHandle } from "@/components/self/self-creature"
import type { Person, Relationship } from "@/lib/db/schema"
import { YOU_COLOR } from "@/lib/circle/colors"
import { chartRead } from "@/lib/spiral/chart-read"
import { useSpiral } from "@/components/spiral/spiral-provider"
import { makePersonRead, type Read } from "@/lib/spiral/reads"
import { UniverseReadPanel, type PanelData } from "@/components/circle/universe-read-panel"
import { saveRevealRadius } from "@/app/actions/progress"

// Neutral self color — a glowing white, NOT gold. Reactions tint away from it.
const NEUTRAL_COLOR = "#e8e4da"
const AGREE_COLOR = "#8fc9a3"
const DISAGREE_COLOR = "#d98a9a"
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
const MAX_SCALE = 4

// ---- Layer 4: progressive reveal ----------------------------------------
// The universe starts mostly in void. Each answered read pushes a circular
// "revealed frontier" outward from center; objects/stars now inside it
// materialize (fade up, desaturate→color, scale into place). Objects beyond
// the frontier stay dimly visible but locked (not clickable, no label).
// Starting frontier: covers ALL of the user's own read-facets (inner ring,
// max radius ~232) so their own chart is reachable from the first moment —
// locking your own facets behind progress would be confusing. Only PEOPLE,
// placed further out on the arm (radius >= 250), reveal progressively.
const BASE_REVEAL_RADIUS = 240
const REVEAL_STEP = 120 // how far each answer pushes the frontier outward

// Spiral geometry in world units, centered on (0,0).
const TURNS = 3
const MAX_R = 480
// No spiral glyph is drawn within this radius — carves a clean hole where the
// pinned avatar lives. Glyphs fade in over FADE_BAND just outside it.
const AVATAR_CLEAR_RADIUS = 96
const FADE_BAND = 72
const GLYPH_STEPS = 250
const GLYPH_T_START = 0.04
const GLYPH_T_END = 1.7

function spiralPoint(t: number) {
  const theta = t * TURNS * Math.PI * 2 - Math.PI / 2
  const r = MAX_R * t
  return { x: r * Math.cos(theta), y: r * Math.sin(theta) }
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
  char: string
  size: number
  max: number
  delay: number
}

// READ objects (facets of your own chart) live in the inner ring, placed by
// angle + radius — NOT on the spiral arm. These fixed slots keep them spread
// evenly around the avatar; chart sections fill them in order.
const READ_LAYOUT: { angle: number; r: number }[] = [
  { angle: -0.5, r: 172 },
  { angle: 1.1, r: 205 },
  { angle: 2.5, r: 158 },
  { angle: 3.7, r: 232 },
  { angle: 5.0, r: 190 },
]

// PEOPLE live ON the spiral arm, further out than the reads. The first person
// added sits innermost; each subsequent one is placed further along the arm.
const PERSON_MIN_T = 0.52
const PERSON_MAX_T = 1.12

function personT(i: number, n: number) {
  if (n <= 1) return 0.7
  return PERSON_MIN_T + (PERSON_MAX_T - PERSON_MIN_T) * (i / (n - 1))
}

// A read placed in the inner ring by angle + radius.
function readPoint(angle: number, r: number) {
  return { x: Math.cos(angle) * r, y: Math.sin(angle) * r }
}

type PlacedRead = {
  label: string
  x: number
  y: number
  r: number
  panel: PanelData
  read: Read
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

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
}

export function SpiralUniverse({
  people,
  relationships,
  colorById,
  engagementScore = 0,
  userId,
  onSelectSelf,
  guest,
  initialRevealRadius = BASE_REVEAL_RADIUS,
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
}) {
  const stageRef = useRef<HTMLDivElement | null>(null)
  const universeRef = useRef<HTMLDivElement | null>(null)
  const camRef = useRef({ x: 0, y: 0, scale: 1 })
  const [zoomPct, setZoomPct] = useState(100)

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

  const { agree, disagree } = useSpiral()

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

  // The open read/person panel + the avatar's transient reaction.
  const [panel, setPanel] = useState<{ data: PanelData; read: Read } | null>(null)
  const [reactMood, setReactMood] = useState<Mood | null>(null)
  const [reactColor, setReactColor] = useState<string | null>(null)
  const reactTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // The evolving self creature at the center. Its stage comes from real
  // engagement; its brief reactions mirror the universe's read reactions.
  const creatureRef = useRef<SelfCreatureHandle>(null)
  useEffect(() => {
    if (!reactMood) return
    if (reactMood === "agree") creatureRef.current?.react("agree")
    else if (reactMood === "submit") creatureRef.current?.react("submit")
    else if (reactMood === "disagree" || reactMood === "curious")
      creatureRef.current?.react("disagree")
  }, [reactMood])

  const closePanel = useCallback(() => {
    if (reactTimer.current) clearTimeout(reactTimer.current)
    setPanel(null)
    setReactMood(null)
    setReactColor(null)
  }, [])

  const openRead = useCallback((r: PlacedRead) => {
    if (reactTimer.current) clearTimeout(reactTimer.current)
    setPanel({ data: r.panel, read: r.read })
    setReactMood("curious") // lean in; reads stay neutral white
    setReactColor(null)
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
      setReactMood(agreeIt ? "agree" : "disagree")
      setReactColor(agreeIt ? AGREE_COLOR : DISAGREE_COLOR)
      // Both YES and NO are self-knowledge — both push the frontier outward and
      // materialize more of the universe. Persist for authed users so the
      // revealed world stays revealed across sessions; guests stay in memory.
      setRevealRadius((prev) => {
        const next = prev + REVEAL_STEP
        if (!guest) void saveRevealRadius(next).catch(() => {})
        return next
      })
      if (reactTimer.current) clearTimeout(reactTimer.current)
      reactTimer.current = setTimeout(() => closePanel(), 820)
    },
    [panel, agree, disagree, closePanel, guest],
  )

  useEffect(() => {
    return () => {
      if (reactTimer.current) clearTimeout(reactTimer.current)
    }
  }, [])

  // When a read/bond panel is open it slides up from the bottom and can cover
  // the centered avatar. Lift the avatar into the upper area so it stays fully
  // visible above the panel. The amount scales with the stage height.
  const avatarLift = panel
    ? Math.min(220, Math.max(120, (stageRef.current?.clientHeight ?? 720) * 0.2))
    : 0

  // The spiral arm, as a trail of ASCII glyphs winding outward from the core.
  const glyphs = useMemo<Glyph[]>(() => {
    const chars = ["+", "*", "✦"]
    const out: Glyph[] = []
    for (let i = 0; i <= GLYPH_STEPS; i++) {
      const t = GLYPH_T_START + (GLYPH_T_END - GLYPH_T_START) * (i / GLYPH_STEPS)
      const { x, y } = spiralPoint(t)
      const dist = Math.hypot(x, y)
      if (dist < AVATAR_CLEAR_RADIUS) continue
      const rawEdge = Math.min(1, Math.max(0, (dist - AVATAR_CLEAR_RADIUS) / FADE_BAND))
      const edgeFade = rawEdge * rawEdge * (3 - 2 * rawEdge) // smoothstep
      out.push({
        key: i,
        x,
        y,
        r: dist,
        char: chars[i % chars.length],
        size: 7 + Math.min(t, 1.4) * 9,
        max: (0.16 + Math.min(t, 1) * 0.34) * edgeFade,
        delay: -((i * 0.07) % 3.2),
      })
    }
    return out
  }, [])

  // READ objects — facets of the user's own chart, derived from the chart
  // engine output (chartRead.sections), placed in the inner ring by angle+r.
  // Each carries the panel content + a Read that persists through the SAME
  // agree/disagree pipeline the bottom ReadHub uses.
  const reads = useMemo<PlacedRead[]>(() => {
    return chartRead.sections.slice(0, READ_LAYOUT.length).map((s, i) => {
      const { angle, r } = READ_LAYOUT[i % READ_LAYOUT.length]
      const { x, y } = readPoint(angle, r)
      return {
        label: s.label,
        x,
        y,
        r: Math.hypot(x, y),
        panel: { src: s.value.toLowerCase(), title: s.label, body: s.body },
        read: { id: `chart-${slug(s.label)}`, category: "about-you", text: s.body },
      }
    })
  }, [])

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
        color: colorById.get(person.id) ?? YOU_COLOR,
        panel: {
          src: "the bond between you",
          title: `${person.name} × you`,
          body: read.text,
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
    setZoomPct(Math.round(cam.scale * 100))
  }, [])

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
      apply()
    },
    [apply],
  )

  const reset = useCallback(() => {
    camRef.current = { x: 0, y: 0, scale: 1 }
    apply()
  }, [apply])

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
      // Divide by scale so pan speed feels natural at every zoom level.
      cam.x -= dx / cam.scale
      cam.y -= dy / cam.scale
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
  }, [apply, zoomAt])

  const monoFont =
    "var(--font-space-mono), 'Space Mono', ui-monospace, SFMono-Regular, Menlo, monospace"

  // Progress HUD: how many real objects (reads + people) sit inside the
  // revealed frontier vs. how many exist in total.
  const totalObjects = reads.length + placedPeople.length
  const revealedObjects =
    reads.filter((r) => r.r <= revealRadius).length +
    placedPeople.filter((p) => p.r <= revealRadius).length

  return (
    <div
      ref={stageRef}
      className="absolute inset-0 overflow-hidden"
      style={{
        touchAction: "none",
        cursor: "grab",
        userSelect: "none",
        // Charcoal void: a near-black field that lifts faintly toward the
        // center, so the explored core feels lit and the unexplored edges
        // recede into darkness.
        background:
          "radial-gradient(120% 120% at 50% 50%, oklch(0.19 0 0) 0%, oklch(0.13 0 0) 45%, oklch(0.08 0 0) 100%)",
      }}
    >
      {/* ===== The universe layer: everything here pans + zooms ===== */}
      <div
        ref={universeRef}
        aria-hidden="true"
        className="absolute left-0 top-0"
        style={{ width: 0, height: 0, transformOrigin: "0 0", willChange: "transform" }}
      >
        {/* Frontier pulse: a soft, fog-like bloom that swells at the current
            reveal radius whenever it expands, marking the edge of what you've
            uncovered. Rather than a hard ring it's an organic, blurred halo —
            a radial gradient that glows toward its rim, with a slightly
            irregular (non-circular) shape so it reads as drifting fog rather
            than a geometric outline. Keyed on revealRadius so it remounts +
            re-animates on each step. */}
        <span
          key={`frontier-${revealRadius}`}
          className="animate-frontier-pulse absolute"
          style={{
            left: px2(-revealRadius * 1.18),
            top: px2(-revealRadius * 1.18),
            width: px2(revealRadius * 2.36),
            height: px2(revealRadius * 2.36),
            // Organic, lava-lamp-ish blob outline (not a perfect circle).
            borderRadius: "46% 54% 52% 48% / 52% 47% 53% 48%",
            // Fog: transparent core, a diffuse luminous band near the frontier
            // edge, fading back out — no hard stroke anywhere.
            background:
              "radial-gradient(circle, transparent 56%, oklch(0.92 0 0 / 0.10) 72%, oklch(0.95 0 0 / 0.22) 82%, oklch(0.92 0 0 / 0.08) 92%, transparent 100%)",
            filter: "blur(14px)",
          }}
        />

        {/* Spiral arm — a trail of pulsating glyphs winding out from the core.
            Glyphs beyond the revealed frontier are barely-there points of light
            (locked stars); answering reads expands the frontier and they
            materialize up to their full pulse amplitude.
            Positions are deterministic (spiralPoint), so SSR and client agree. */}
        {glyphs.map((g) => {
          const locked = g.r > revealRadius
          return (
            <span
              key={`glyph-${g.key}`}
              className="animate-glyph-pulse absolute select-none"
              style={{
                // Round to 2 decimals: the browser's CSSOM rounds sub-pixel
                // values when it parses the server HTML, so full-precision
                // floats hydrate as a mismatch. 0.01px is imperceptible and
                // serializes identically on server and client.
                left: px2(g.x),
                top: px2(g.y),
                fontFamily: monoFont,
                fontSize: px2(g.size),
                lineHeight: 1,
                color: "oklch(0.62 0 0)",
                transform: "translate(-50%, -50%)",
                // @ts-expect-error custom property consumed by the pulse keyframes
                // Round: React serializes the CSS var at full float precision,
                // which the client re-computes slightly differently → mismatch.
                "--glyph-max": locked ? 0.12 : Math.round(g.max * 10000) / 10000,
                transition: "color 1s ease",
                animationDelay: `${g.delay}s`,
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

        {/* READ objects — facets of your chart in the inner ring. Tap to open.
            Taps resolve in the stage's pointerup handler (via data-obj), since
            pointer capture makes per-element onClick unreliable here. */}
        {reads.map((r, i) => {
          const locked = r.r > revealRadius
          return (
            <div
              key={r.label}
              data-obj="read"
              data-obj-index={i}
              role="button"
              tabIndex={locked ? -1 : 0}
              aria-hidden={locked || undefined}
              aria-label={`Read: ${r.label}`}
              onKeyDown={(e) => {
                if (locked) return
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
                transform: `translate(-50%, -50%) scale(${locked ? 0.78 : 1})`,
                opacity: locked ? 0.34 : 1,
                filter: locked ? "grayscale(0.8) blur(0.5px)" : "none",
                pointerEvents: locked ? "none" : "auto",
                cursor: locked ? "default" : "pointer",
                transition:
                  "opacity 1s ease, filter 1s ease, transform 1s cubic-bezier(.3,.8,.3,1)",
              }}
            >
              <span
                className="flex size-[26px] items-center justify-center rounded-full text-[11px] transition-transform duration-150 group-hover:scale-[1.18] group-hover:brightness-125 group-active:scale-[1.18]"
                style={{
                  border: "1px solid #6a6a6a",
                  color: "#e8e4da",
                  backgroundColor: "#080808",
                  boxShadow: locked ? "none" : "0 0 10px rgba(245,245,245,0.2)",
                }}
              >
                {"\u2726"}
              </span>
              <span
                className="mt-1.5 text-[10px] uppercase tracking-[1.5px]"
                style={{
                  fontFamily: monoFont,
                  color: "#8a8a8a",
                  opacity: locked ? 0 : 1,
                  transition: "opacity 1s ease",
                }}
              >
                {r.label}
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
              <span
                className="flex size-[34px] items-center justify-center rounded-full text-[13px] transition-transform duration-150 group-hover:scale-[1.18] group-hover:brightness-125 group-active:scale-[1.18]"
                style={{
                  border: `1.5px solid ${pp.color}`,
                  color: pp.color,
                  backgroundColor: "#080808",
                  boxShadow: locked ? "none" : `0 0 14px ${pp.color}`,
                }}
              >
                {"\u2605"}
              </span>
              <span
                className="mt-1.5 max-w-24 truncate text-[12px] tracking-[1px]"
                style={{
                  fontFamily: monoFont,
                  color: pp.color,
                  opacity: locked ? 0 : 1,
                  transition: "opacity 1s ease",
                }}
              >
                {pp.person.name}
              </span>
            </div>
          )
        })}
      </div>

      {/* ===== Pinned avatar: a separate layer, never transformed by the
          camera. It lifts upward while a panel is open so it stays visible. ===== */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 z-[60]"
        style={{
          width: 230,
          height: 230,
          transform: `translate(-50%, calc(-50% - ${avatarLift}px))`,
          transition: "transform .4s cubic-bezier(.3,.8,.3,1)",
        }}
      >
        {/* Dark radial backdrop so the core reads cleanly over the glyph trail */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            width: 172,
            height: 172,
            // A solid, opaque disc — your own "self avatar screen". Fully
            // contained inside the stroke (no glow, no bleed into the
            // surrounding universe).
            backgroundColor: "var(--background)",
            border: "1px solid oklch(0.95 0 0 / 0.55)",
          }}
        />
        <div className="relative flex h-full w-full items-center justify-center overflow-hidden">
          <SelfCreature
            ref={creatureRef}
            score={engagementScore}
            seed={userId}
            color={reactColor ?? NEUTRAL_COLOR}
            size={230}
          />
        </div>
        {/* Tap target over the face ��� opens the chart read sheet */}
        {onSelectSelf && (
          <button
            type="button"
            onClick={onSelectSelf}
            aria-label="Read your chart"
            className="pointer-events-auto absolute left-1/2 top-1/2 size-36 -translate-x-1/2 -translate-y-1/2 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        )}
      </div>

      {/* ===== HUD ===== */}
      {/* Progress: how much of your universe you've uncovered so far. */}
      <div className="pointer-events-none absolute left-1/2 top-3 z-20 flex -translate-x-1/2 flex-col items-center gap-1">
        <p
          className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground/70"
          style={{ fontFamily: monoFont }}
        >
          your universe ·{" "}
          <span className="text-foreground/80">
            {revealedObjects} of {totalObjects}
          </span>{" "}
          revealed
        </p>
        <p
          className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground/40"
          style={{ fontFamily: monoFont }}
        >
          Drag to move · scroll / pinch to zoom
        </p>
      </div>

      <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2">
        <HudButton
          label="Zoom out"
          onClick={() => zoomAt(stageRef.current!.clientWidth / 2, stageRef.current!.clientHeight / 2, 1 / 1.25)}
        >
          −
        </HudButton>
        <span
          className="min-w-14 text-center text-[10px] tracking-widest text-muted-foreground/60"
          style={{ fontFamily: monoFont }}
        >
          {zoomPct}%
        </span>
        <HudButton
          label="Zoom in"
          onClick={() => zoomAt(stageRef.current!.clientWidth / 2, stageRef.current!.clientHeight / 2, 1.25)}
        >
          +
        </HudButton>
        <button
          type="button"
          onClick={reset}
          className="h-9 rounded-lg px-3 text-[10px] uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
          style={{ fontFamily: monoFont, backgroundColor: "#0d0d0d", border: "1px solid #262626" }}
        >
          Reset
        </button>
      </div>

      {/* Slide-up read panel — tapping a read/person opens it; yes/no route to
          the same agree/disagree persistence as the bottom ReadHub. */}
      <UniverseReadPanel data={panel?.data ?? null} onJudge={judge} onClose={closePanel} />
    </div>
  )
}

function HudButton({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex size-9 items-center justify-center rounded-lg text-base text-muted-foreground transition-colors hover:text-foreground"
      style={{
        fontFamily: "var(--font-space-mono), 'Space Mono', ui-monospace, monospace",
        backgroundColor: "#0d0d0d",
        border: "1px solid #262626",
      }}
    >
      {children}
    </button>
  )
}
