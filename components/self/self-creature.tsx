"use client"

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react"
import {
  STAGE_ART,
  STAGE_1,
  STAGE_5,
  MAX_STAGE,
  scoreToStage,
  buildAccretionGrid,
  buildDetails,
  ZONE_OPACITY,
  type PlacedDetail,
} from "@/lib/self/avatar-stages"

/**
 * SelfCreature — the evolving ASCII "you".
 *
 * Two growth systems layer here:
 *   1. STAGES (1–5) — discrete skeletons from lib/self/avatar-stages.ts. When
 *      the stage increases the old form dissolves and the new one reassembles.
 *   2. ACCRETION — infinite growth. Every engagement point adds one persistent
 *      detail (aura spark / body texture / edge whisker), placed deterministically
 *      from seed = hash(userId + point index). New details flicker in; the rest
 *      of the being stays perfectly stable.
 *
 * The whole being (skeleton + details) is drawn as ONE monospace grid of
 * absolutely-positioned cells, so details always line up with the skeleton and
 * ride along with breathing / reactions / evolution.
 *
 * Reactions are imperative so the reads UI can fire them without prop churn:
 *   const ref = useRef<SelfCreatureHandle>(null)
 *   <SelfCreature ref={ref} score={score} seed={userId} />
 *   ref.current?.react("agree")
 */

export type CreatureReaction = "agree" | "disagree" | "submit"

export type SelfCreatureHandle = {
  react: (type: CreatureReaction) => void
}

type Props = {
  /** engagement score — drives BOTH the stage and the accretion detail count */
  score?: number
  /** explicit stage override; ignored when `score` is provided */
  stage?: number
  /** per-user seed (e.g. the auth user id) so the being regrows identically */
  seed?: string
  size?: number
  /** glyph + glow tint; defaults to the neutral glowing self */
  color?: string
}

// Lay an arbitrary stage skeleton, centered, into the fixed grid envelope so it
// shares coordinates with the accretion details (which are built from stage 5).
function layoutSkeleton(art: string, cols: number, rows: number): string[] {
  const lines = art.split("\n")
  const w = Math.max(...lines.map((l) => l.length))
  const top = Math.floor((rows - lines.length) / 2)
  const left = Math.floor((cols - w) / 2)
  const out = Array.from({ length: rows }, () => Array<string>(cols).fill(" "))
  lines.forEach((line, i) => {
    const lineLeft = left + Math.floor((w - line.length) / 2)
    for (let j = 0; j < line.length; j++) {
      const r = top + i
      const c = lineLeft + j
      if (r >= 0 && r < rows && c >= 0 && c < cols) out[r][c] = line[j]
    }
  })
  return out.map((a) => a.join(""))
}

const REACTION_MS = 600
const EVOLVE_OUT_MS = 420
const EVOLVE_IN_MS = 480
const CAPTION_MS = 1900
const ACCRETE_MS = 800

const MONO =
  "var(--font-space-mono), 'Space Mono', ui-monospace, SFMono-Regular, Menlo, monospace"

const SelfCreature = forwardRef<SelfCreatureHandle, Props>(function SelfCreature(
  { score, stage, seed, size = 230, color = "#e8e4da" },
  ref,
) {
  // Effective stage: score wins when present, else the explicit stage prop.
  const effectiveStage =
    score != null ? scoreToStage(score) : Math.round(stage ?? 1)
  const clampedStage = Math.max(1, Math.min(MAX_STAGE, effectiveStage))

  // One detail per growth point, no cap.
  const detailCount = score != null && seed ? Math.max(0, Math.floor(score)) : 0

  // The form currently drawn. Lags the prop during an evolution transition.
  const [displayStage, setDisplayStage] = useState(clampedStage)
  const [blinking, setBlinking] = useState(false)
  const [reaction, setReaction] = useState<CreatureReaction | null>(null)
  const [evolvePhase, setEvolvePhase] = useState<"idle" | "out" | "in">("idle")
  const [showCaption, setShowCaption] = useState(false)

  const reactTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const evolveTimers = useRef<ReturnType<typeof setTimeout>[]>([])

  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches

  // ----- imperative reactions ------------------------------------------------
  useImperativeHandle(
    ref,
    () => ({
      react(type: CreatureReaction) {
        if (reduceMotion) return
        if (reactTimer.current) clearTimeout(reactTimer.current)
        setReaction(type)
        reactTimer.current = setTimeout(() => setReaction(null), REACTION_MS)
      },
    }),
    [reduceMotion],
  )

  // ----- blink loop ----------------------------------------------------------
  useEffect(() => {
    if (reduceMotion) return
    let alive = true
    let blinkOff: ReturnType<typeof setTimeout>
    const schedule = () => {
      const wait = 4000 + Math.random() * 5000 // 4–9s
      return setTimeout(() => {
        if (!alive) return
        setBlinking(true)
        blinkOff = setTimeout(() => {
          setBlinking(false)
          next = schedule()
        }, 150)
      }, wait)
    }
    let next = schedule()
    return () => {
      alive = false
      clearTimeout(next)
      clearTimeout(blinkOff)
    }
  }, [reduceMotion])

  // ----- evolution transition on stage increase ------------------------------
  useEffect(() => {
    if (clampedStage === displayStage) return
    if (reduceMotion) {
      setDisplayStage(clampedStage)
      return
    }
    evolveTimers.current.forEach(clearTimeout)
    evolveTimers.current = []

    setEvolvePhase("out")
    evolveTimers.current.push(
      setTimeout(() => {
        setDisplayStage(clampedStage)
        setEvolvePhase("in")
        setShowCaption(true)
      }, EVOLVE_OUT_MS),
    )
    evolveTimers.current.push(
      setTimeout(() => setEvolvePhase("idle"), EVOLVE_OUT_MS + EVOLVE_IN_MS),
    )
    evolveTimers.current.push(
      setTimeout(
        () => setShowCaption(false),
        EVOLVE_OUT_MS + EVOLVE_IN_MS + CAPTION_MS,
      ),
    )
    return () => {
      evolveTimers.current.forEach(clearTimeout)
      evolveTimers.current = []
    }
  }, [clampedStage, displayStage, reduceMotion])

  // ----- accretion: which details are freshly added (to flicker in) ----------
  const prevCount = useRef(detailCount)
  const [freshFrom, setFreshFrom] = useState(detailCount)
  useEffect(() => {
    if (detailCount > prevCount.current) {
      setFreshFrom(prevCount.current) // animate indices >= previous count
      const t = setTimeout(() => setFreshFrom(detailCount), ACCRETE_MS + 100)
      prevCount.current = detailCount
      return () => clearTimeout(t)
    }
    if (detailCount !== prevCount.current) {
      prevCount.current = detailCount
      setFreshFrom(detailCount)
    }
  }, [detailCount])

  // ----- geometry (fixed to the mature stage-5 envelope) ---------------------
  const grid = useMemo(() => buildAccretionGrid(STAGE_5), [])
  const details = useMemo(
    () => (seed ? buildDetails(seed, detailCount, grid) : []),
    [seed, detailCount, grid],
  )
  const skelLines = useMemo(
    () => layoutSkeleton(STAGE_ART[displayStage] ?? STAGE_1, grid.cols, grid.rows),
    [displayStage, grid],
  )

  // Font sized so the whole grid fits inside the face disc with aura room.
  const inner = size * 0.62
  const cellW = useMemo(() => {
    const byWidth = inner / (grid.cols * 0.6)
    const byHeight = inner / (grid.rows * 1.05)
    return Math.min(byWidth, byHeight) * 0.6
  }, [inner, grid.cols, grid.rows])
  const fontPx = cellW / 0.6
  const rowH = fontPx * 1.05
  const boardW = grid.cols * cellW
  const boardH = grid.rows * rowH

  const evolving = evolvePhase !== "idle"
  const artOpacity = evolvePhase === "out" ? 0 : 1
  const artBlur = evolvePhase === "out" ? 6 : 0
  const evolveScale = evolvePhase === "out" ? 0.9 : 1

  // Reaction animation on the whole being.
  let reactionAnim = "none"
  if (reaction === "agree") reactionAnim = `creatureBounce ${REACTION_MS}ms ease`
  else if (reaction === "disagree")
    reactionAnim = `creatureTilt ${REACTION_MS}ms ease`
  else if (reaction === "submit")
    reactionAnim = `creatureAbsorb ${REACTION_MS}ms ease`
  const breatheAnim = reduceMotion
    ? "none"
    : "creatureBreathe 4.5s ease-in-out infinite"

  const cellStyle = (r: number, c: number): React.CSSProperties => ({
    position: "absolute",
    left: c * cellW,
    top: r * rowH,
    width: cellW,
    height: rowH,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: MONO,
    fontSize: `${fontPx}px`,
    lineHeight: 1,
    userSelect: "none",
  })

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <style>{CREATURE_KEYFRAMES}</style>

      {/* Dust motes drifting inside the circle */}
      {!reduceMotion && <Dust color={color} size={size} />}

      {/* The being: skeleton + accreted details, one shared grid */}
      <div
        aria-hidden="true"
        style={{
          position: "relative",
          width: boardW,
          height: boardH,
          opacity: artOpacity,
          filter: `drop-shadow(0 0 10px ${color}) blur(${artBlur}px)`,
          transform: `scale(${evolveScale})`,
          transformOrigin: "center",
          transition: evolving
            ? `opacity ${EVOLVE_OUT_MS}ms ease, filter ${EVOLVE_OUT_MS}ms ease, transform ${EVOLVE_OUT_MS}ms ease`
            : "opacity .3s ease, filter .3s ease, transform .3s ease",
          animation: reaction ? reactionAnim : breatheAnim,
          pointerEvents: "none",
          color,
        }}
      >
        {/* skeleton glyphs */}
        {skelLines.flatMap((line, r) =>
          line.split("").map((ch, c) => {
            if (ch === " ") return null
            const shown = blinking && ch === "o" ? "-" : ch
            return (
              <span key={`s-${r}-${c}`} style={cellStyle(r, c)}>
                {shown}
              </span>
            )
          }),
        )}

        {/* accreted details */}
        {details.map((d: PlacedDetail, i) => {
          const fresh = !reduceMotion && d.index >= freshFrom
          return (
            <span
              key={`d-${d.row}-${d.col}-${i}`}
              style={{
                ...cellStyle(d.row, d.col),
                fontSize: `${fontPx * 0.92}px`,
                opacity: fresh ? undefined : ZONE_OPACITY[d.zone],
                filter: `drop-shadow(0 0 3px ${color})`,
                animation: fresh
                  ? `creatureAccrete ${ACCRETE_MS}ms ease forwards`
                  : "none",
              }}
            >
              {d.char}
            </span>
          )
        })}
      </div>

      {/* Quiet evolution caption */}
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          bottom: size * 0.12,
          left: "50%",
          transform: "translateX(-50%)",
          fontFamily: MONO,
          fontSize: 10,
          letterSpacing: 2,
          textTransform: "lowercase",
          color,
          whiteSpace: "nowrap",
          opacity: showCaption ? 0.85 : 0,
          transition: "opacity .8s ease",
          pointerEvents: "none",
        }}
      >
        you&apos;re taking shape
      </span>
    </div>
  )
})

/** A few faint glyph motes drifting within the circle. */
function Dust({ color, size }: { color: string; size: number }) {
  // The motes use Math.random(), which would differ between the server and
  // client and cause a hydration mismatch (that mismatch was stalling the
  // preview). They're purely decorative, so we generate them only AFTER mount:
  // the server renders an empty layer and the client fills it in.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const motes = useMemo(
    () =>
      mounted
        ? Array.from({ length: 9 }).map((_, i) => ({
            id: i,
            left: 12 + Math.random() * 76, // %
            top: 12 + Math.random() * 76, // %
            delay: Math.random() * 6,
            dur: 5 + Math.random() * 5,
            char: Math.random() > 0.5 ? "·" : "*",
            op: 0.12 + Math.random() * 0.22,
          }))
        : [],
    [mounted],
  )
  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{ width: size, height: size }}
    >
      {motes.map((m) => (
        <span
          key={m.id}
          style={{
            position: "absolute",
            left: `${m.left}%`,
            top: `${m.top}%`,
            fontFamily: MONO,
            fontSize: 9,
            color,
            opacity: m.op,
            animation: `creatureDrift ${m.dur}s ease-in-out ${m.delay}s infinite`,
          }}
        >
          {m.char}
        </span>
      ))}
    </div>
  )
}

const CREATURE_KEYFRAMES = `
@keyframes creatureBreathe {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-3px) scale(1.02); }
}
@keyframes creatureBounce {
  0% { transform: translateY(0); }
  30% { transform: translateY(-10px) scale(1.05); }
  55% { transform: translateY(0) scale(0.98); }
  75% { transform: translateY(-4px); }
  100% { transform: translateY(0) scale(1); }
}
@keyframes creatureTilt {
  0% { transform: rotate(0deg); }
  35% { transform: rotate(-8deg); }
  70% { transform: rotate(5deg); }
  100% { transform: rotate(0deg); }
}
@keyframes creatureAbsorb {
  0% { transform: scale(1); filter: brightness(1); }
  40% { transform: scale(1.12); filter: brightness(1.8); }
  100% { transform: scale(1); filter: brightness(1); }
}
@keyframes creatureDrift {
  0%, 100% { transform: translate(0, 0); opacity: 0.1; }
  50% { transform: translate(4px, -6px); opacity: 0.35; }
}
@keyframes creatureAccrete {
  0% { opacity: 0; }
  20% { opacity: 0.65; }
  35% { opacity: 0.12; }
  55% { opacity: 0.9; }
  70% { opacity: 0.3; }
  100% { opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  @keyframes creatureBreathe { 0%,100% { transform: none; } }
}
`

export default SelfCreature
