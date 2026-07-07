"use client"

import { useEffect, useRef, useState } from "react"
import { RIPPLE_STAGGER_MS, randomScramble } from "@/lib/self/mutation"

/**
 * AmbientCreature — a "demo mode" of the self being for the landing page.
 *
 * It sits inside the same black disc + thin near-white outline used on /self,
 * and cycles playfully through small forms as a preview of the self you'll grow:
 *   - creature faces/emoticons in three detail tiers (minimal → detailed), and
 *   - short world-words ("YOU", "ARE", "HERE").
 *
 * IMPORTANT: words do NOT pass through the creature's cell/mutation grid. There
 * is no pixel-font / letterform system. A word is rendered as ONE plain <span>
 * in the pixel typeface (Pixelify Sans, loaded in app/layout.tsx as the
 * --font-pixelify-sans variable — the substitute for the unavailable Geist
 * Pixel), uppercase, single line, centered, fading/blurring in over ~200ms.
 *
 * ONLY the emoticon faces use the being's ripple/stagger mutation feel
 * (lib/self/mutation): their cells resolve one by one, each flickering through
 * a scramble glyph before settling.
 *
 * Deterministic first paint (a fixed "YOU") so SSR and client match; morphing,
 * blinking and breathing begin after mount. Animation pauses while the tab is
 * hidden and collapses to quiet swaps under prefers-reduced-motion.
 */

const NEUTRAL = "#e8e4da"
const MONO = "ui-monospace, monospace"
const PIXEL = "var(--font-pixelify-sans), ui-monospace, monospace"

// ---- forms -----------------------------------------------------------------
// Words are plain text. The cycle is fixed: YOU → face → face → ARE → face →
// HERE → face → (repeat), with faces chosen at random from the tiers below.
const WORD_CYCLE = ["YOU", "ARE", "HERE"]

const EMOTES_T1 = ["[ . . ]", "( · · )", "{ - - }", "[ ˚ ˚ ]"]
const EMOTES_T2 = ["[><]", "{o o}", "( ^ ^ )", "[ o_o ]", "{ >.< }", "( ˘ ˘ )"]
const EMOTES_T3 = [
  " /\\ /\\\n( o o )\n [>_<]",
  " ^  ^\n(o  o)\n  (v)",
  " . · .\n( ✦ ✦ )\n \\ ~ /",
  " /\\_/\\\n( o.o )\n > ^ <",
]

/** A displayed form: either a plain word, or an emoticon rendered on a grid. */
type WordForm = { kind: "word"; value: string }
type EmoteGrid = { kind: "emote"; cells: string[]; rows: number; cols: number; fontPx: number }
type Form = WordForm | EmoteGrid

const INITIAL: WordForm = { kind: "word", value: "YOU" }

/** Build an emoticon's grid, preserving internal spacing, padded to a rectangle. */
function buildEmote(art: string, size: number): EmoteGrid {
  const lines = art.split("\n")
  const cols = Math.max(...lines.map((l) => l.length))
  const rows = lines.length
  const cells = Array<string>(rows * cols).fill(" ")
  for (let r = 0; r < rows; r++) {
    const line = lines[r]
    for (let c = 0; c < line.length; c++) cells[r * cols + c] = line[c]
  }
  // Fit the emoticon comfortably inside the disc.
  const usable = size * 0.75 * 0.8
  const byWidth = usable / (cols * 0.62)
  const byHeight = usable / (rows * 1.15)
  const fontPx = Math.min(byWidth, byHeight, size * 0.14)
  return { kind: "emote", cells, rows, cols, fontPx }
}

function randomEmote(size: number): EmoteGrid {
  const roll = Math.random()
  const tier = roll < 0.4 ? EMOTES_T1 : roll < 0.85 ? EMOTES_T2 : EMOTES_T3
  return buildEmote(tier[Math.floor(Math.random() * tier.length)], size)
}

export default function AmbientCreature({ size = 200 }: { size?: number }) {
  const [form, setForm] = useState<Form>(INITIAL)
  // Bumped on each word change so the fade/blur-in animation restarts.
  const [wordKey, setWordKey] = useState(0)
  // Live grid cells while an emoticon resolves in.
  const [emoteCells, setEmoteCells] = useState<string[]>([])
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  // Fixed word cycle position.
  const wordStep = useRef(0)
  // Toggle: after a word we show 2 faces, then the next word.
  const facesLeft = useRef(0)

  useEffect(() => {
    let alive = true
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false
    const clearAll = () => {
      timers.current.forEach(clearTimeout)
      timers.current = []
    }

    function scheduleNext() {
      const wait = 1600 + Math.random() * 1400 // 1.6–3s per form
      const t = setTimeout(() => {
        if (!alive) return
        if (typeof document !== "undefined" && document.hidden) {
          const retry = setTimeout(() => alive && scheduleNext(), 900)
          timers.current.push(retry)
          return
        }
        morph()
      }, wait)
      timers.current.push(t)
    }

    function showWord() {
      const value = WORD_CYCLE[wordStep.current % WORD_CYCLE.length]
      wordStep.current += 1
      facesLeft.current = 2
      setForm({ kind: "word", value })
      setWordKey((k) => k + 1) // restart the fade/blur-in
      scheduleNext()
    }

    function showEmote() {
      facesLeft.current -= 1
      const target = randomEmote(size)
      setForm(target)

      if (reduce) {
        setEmoteCells(target.cells)
        scheduleNext()
        return
      }

      // Seed every "on" cell with a scramble glyph, then resolve them one by
      // one — the being's signature ripple/mutation. (Words never do this.)
      setEmoteCells(target.cells.map((c) => (c === " " ? " " : randomScramble(c))))

      const active = target.cells
        .map((c, i) => (c === " " ? -1 : i))
        .filter((i) => i >= 0)
        .sort(() => Math.random() - 0.5)

      const per = Math.min(RIPPLE_STAGGER_MS / 2, 700 / Math.max(1, active.length))
      let maxDelay = 0
      active.forEach((idx, k) => {
        const base = k * per
        const t1 = setTimeout(() => {
          if (!alive) return
          setEmoteCells((prev) => {
            const cells = [...prev]
            cells[idx] = randomScramble(cells[idx])
            return cells
          })
        }, base)
        const t2 = setTimeout(() => {
          if (!alive) return
          setEmoteCells((prev) => {
            const cells = [...prev]
            cells[idx] = target.cells[idx]
            return cells
          })
        }, base + 130)
        timers.current.push(t1, t2)
        maxDelay = Math.max(maxDelay, base + 130)
      })

      const done = setTimeout(() => alive && scheduleNext(), maxDelay + 260)
      timers.current.push(done)
    }

    function morph() {
      if (facesLeft.current > 0) showEmote()
      else showWord()
    }

    scheduleNext()
    return () => {
      alive = false
      clearAll()
    }
  }, [size])

  const disc = size * 0.75

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <style>{AMBIENT_KEYFRAMES}</style>

      {/* The black disc with a thin near-white outline + breathing halo. */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          width: disc,
          height: disc,
          backgroundColor: "var(--background)",
          border: "2px solid oklch(0.95 0 0 / 0.6)",
          boxShadow: "0 0 22px oklch(0.95 0 0 / 0.12)",
          animation: "ambientHalo 4.5s ease-in-out infinite",
        }}
      />

      {/* The morphing being — breathes (outer) and blinks (inner). */}
      <div className="relative" style={{ animation: "ambientBreathe 4.5s ease-in-out infinite" }}>
        <div
          className="flex items-center justify-center"
          style={{
            color: NEUTRAL,
            filter: `drop-shadow(0 0 10px ${NEUTRAL})`,
            animation: "ambientBlink 5.4s ease-in-out infinite",
            width: disc,
            height: disc,
          }}
        >
          {form.kind === "word" ? (
            // A WORD: one plain styled text element — no grid, no letterforms.
            <span
              key={wordKey}
              style={{
                fontFamily: PIXEL,
                fontWeight: 600,
                fontSize: `${size * 0.2}px`,
                lineHeight: 1,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                whiteSpace: "nowrap",
                userSelect: "none",
                animation: "ambientWordIn 0.2s ease-out both",
              }}
            >
              {form.value}
            </span>
          ) : (
            // A FACE: the mutation grid (cells resolve in one by one).
            <div className="flex flex-col items-center">
              {Array.from({ length: form.rows }).map((_, r) => (
                <div key={r} className="flex" style={{ height: form.fontPx * 1.15 }}>
                  {Array.from({ length: form.cols }).map((_, c) => {
                    const ch = emoteCells[r * form.cols + c] ?? " "
                    return (
                      <span
                        key={c}
                        style={{
                          width: form.fontPx * 0.62,
                          textAlign: "center",
                          fontFamily: MONO,
                          fontSize: `${form.fontPx}px`,
                          lineHeight: `${form.fontPx * 1.15}px`,
                          userSelect: "none",
                        }}
                      >
                        {ch === " " ? "\u00A0" : ch}
                      </span>
                    )
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const AMBIENT_KEYFRAMES = `
@keyframes ambientBreathe {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-3px) scale(1.02); }
}
@keyframes ambientBlink {
  0%, 90%, 100% { opacity: 1; }
  93% { opacity: 0.2; }
  96% { opacity: 1; }
}
@keyframes ambientHalo {
  0%, 100% { box-shadow: 0 0 18px oklch(0.95 0 0 / 0.10); }
  50% { box-shadow: 0 0 30px oklch(0.95 0 0 / 0.20); }
}
@keyframes ambientWordIn {
  from { opacity: 0; filter: blur(6px); transform: scale(0.96); }
  to { opacity: 1; filter: blur(0); transform: scale(1); }
}
@media (prefers-reduced-motion: reduce) {
  @keyframes ambientBreathe { 0%,100% { transform: none; } }
  @keyframes ambientBlink { 0%,100% { opacity: 1; } }
  @keyframes ambientHalo { 0%,100% { box-shadow: 0 0 18px oklch(0.95 0 0 / 0.12); } }
  @keyframes ambientWordIn { from { opacity: 1; filter: none; transform: none; } to { opacity: 1; } }
}
`
