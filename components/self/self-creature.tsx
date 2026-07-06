"use client"

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react"
import { STAGE_ART, MAX_STAGE, toBlinkArt } from "@/lib/self/avatar-stages"

/**
 * SelfCreature — the evolving ASCII "you".
 *
 * Discrete forms (1–5) come from lib/self/avatar-stages.ts. The creature
 * breathes and blinks on its own, plays brief reactions on demand (agree /
 * disagree / submit), and — when its `stage` prop increases — dissolves the old
 * form into ascii dust and reassembles the new one with a quiet caption.
 *
 * Reactions are imperative so the reads UI can fire them without prop churn:
 *   const ref = useRef<SelfCreatureHandle>(null)
 *   <SelfCreature ref={ref} stage={stage} />
 *   ref.current?.react("agree")
 */

export type CreatureReaction = "agree" | "disagree" | "submit"

export type SelfCreatureHandle = {
  react: (type: CreatureReaction) => void
}

type Props = {
  stage: number
  size?: number
  /** glyph + glow tint; defaults to the neutral glowing self */
  color?: string
}

// Center every line of an art block to a common width so it sits centered in
// the circle regardless of how the stage was hand-drawn.
function centerArt(art: string): string {
  const lines = art.split("\n")
  const width = Math.max(...lines.map((l) => l.length))
  return lines
    .map((l) => {
      const pad = width - l.length
      const left = Math.floor(pad / 2)
      return " ".repeat(left) + l + " ".repeat(pad - left)
    })
    .join("\n")
}

function artDims(art: string): { cols: number; rows: number } {
  const lines = art.split("\n")
  return {
    cols: Math.max(...lines.map((l) => l.length)),
    rows: lines.length,
  }
}

const REACTION_MS = 600
const EVOLVE_OUT_MS = 420
const EVOLVE_IN_MS = 480
const CAPTION_MS = 1900

const SelfCreature = forwardRef<SelfCreatureHandle, Props>(function SelfCreature(
  { stage, size = 230, color = "#e8e4da" },
  ref,
) {
  const clampedStage = Math.max(1, Math.min(MAX_STAGE, Math.round(stage)))

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
    // Clear any in-flight transition.
    evolveTimers.current.forEach(clearTimeout)
    evolveTimers.current = []

    // Dissolve the old form → swap → assemble the new → caption.
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

  // ----- art text ------------------------------------------------------------
  const baseArt = STAGE_ART[displayStage] ?? STAGE_ART[1]
  const text = useMemo(() => {
    const centered = centerArt(baseArt)
    return blinking ? toBlinkArt(centered) : centered
  }, [baseArt, blinking])

  const { cols, rows } = useMemo(() => artDims(centerArt(baseArt)), [baseArt])

  // Font sized so the widest line and the row count both fit the circle, with
  // breathing room inside the 172px face disc.
  const inner = size * 0.62
  const fontPx = Math.min(inner / (cols + 1), inner / (rows + 0.5))

  const evolving = evolvePhase !== "idle"
  const artOpacity = evolvePhase === "out" ? 0 : 1
  const artBlur = evolvePhase === "out" ? 6 : 0
  const artScatter = evolvePhase === "out" ? 6 : 0

  // Reaction transform / filter.
  let reactionAnim = "none"
  if (reaction === "agree") reactionAnim = `creatureBounce ${REACTION_MS}ms ease`
  else if (reaction === "disagree")
    reactionAnim = `creatureTilt ${REACTION_MS}ms ease`
  else if (reaction === "submit")
    reactionAnim = `creatureAbsorb ${REACTION_MS}ms ease`

  const breatheAnim = reduceMotion ? "none" : "creatureBreathe 4.5s ease-in-out infinite"

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <style>{CREATURE_KEYFRAMES}</style>

      {/* Dust particles drifting inside the circle */}
      {!reduceMotion && <Dust color={color} size={size} />}

      {/* The creature itself */}
      <pre
        aria-hidden="true"
        style={{
          margin: 0,
          fontFamily:
            "var(--font-space-mono), 'Space Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: `${fontPx}px`,
          lineHeight: 1.05,
          letterSpacing: `${artScatter}px`,
          whiteSpace: "pre",
          textAlign: "center",
          color,
          filter: `drop-shadow(0 0 10px ${color}) blur(${artBlur}px)`,
          opacity: artOpacity,
          transition: evolving
            ? `opacity ${EVOLVE_OUT_MS}ms ease, filter ${EVOLVE_OUT_MS}ms ease, letter-spacing ${EVOLVE_OUT_MS}ms ease`
            : "opacity .3s ease, filter .3s ease",
          animation: reaction ? reactionAnim : breatheAnim,
          userSelect: "none",
          pointerEvents: "none",
        }}
      >
        {text}
      </pre>

      {/* Quiet evolution caption */}
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          bottom: size * 0.12,
          left: "50%",
          transform: "translateX(-50%)",
          fontFamily:
            "var(--font-space-mono), 'Space Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
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
  const motes = useMemo(
    () =>
      Array.from({ length: 9 }).map((_, i) => ({
        id: i,
        left: 12 + Math.random() * 76, // %
        top: 12 + Math.random() * 76, // %
        delay: Math.random() * 6,
        dur: 5 + Math.random() * 5,
        char: Math.random() > 0.5 ? "·" : "*",
        op: 0.12 + Math.random() * 0.22,
      })),
    [],
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
            fontFamily:
              "var(--font-space-mono), 'Space Mono', ui-monospace, monospace",
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
@media (prefers-reduced-motion: reduce) {
  @keyframes creatureBreathe { 0%,100% { transform: none; } }
}
`

export default SelfCreature
