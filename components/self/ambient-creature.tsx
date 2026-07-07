"use client"

import { useEffect, useRef, useState } from "react"
import { RIPPLE_STAGGER_MS, randomScramble } from "@/lib/self/mutation"

/**
 * AmbientCreature — a "demo mode" of the self being for the landing page.
 *
 * It sits inside the same black disc + near-white outline used on /self, and
 * cycles through a fixed narrative of small forms as a preview of the self
 * you'll grow. The word order is always the same:
 *
 *   YOU → face → face → ARE → face → HERE → face → (repeat)
 *
 * Words render in a pixel typeface (Pixelify Sans, our stand-in for Geist
 * Pixel) in uppercase; faces are emoticons picked at random from three detail
 * tiers each pass, so the rhythm is fixed but the faces stay fresh.
 *
 * Transitions:
 *   - faces resolve with the being's ripple/stagger mutation feel (each grid
 *     cell flickers through a scramble glyph before settling), and
 *   - words do a quick per-character "pixel-in" resolve (~200ms) so they feel
 *     like the same organism reshaping, not a slide swapping.
 *
 * Everything is scaled to occupy roughly the middle ~55% of the disc, always
 * optically centered. Deterministic first paint ("YOU") so SSR/client match;
 * morphing, blinking and breathing begin after mount. Animation pauses while
 * the tab is hidden and collapses to quiet swaps under prefers-reduced-motion.
 */

const NEUTRAL = "#e8e4da"
const PIXEL_FONT = "var(--font-pixelify-sans), ui-monospace, monospace"
const MONO = "ui-monospace, monospace"

// Fixed word beats, always in this order.
const WORDS = ["YOU", "ARE", "HERE"]
// Scramble glyphs for the word pixel-in resolve.
const WORD_SCRAMBLE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ*+:#".split("")

// ---- emoticon repertoire, in three detail tiers ----------------------------
const EMOTES_T1 = ["[ . . ]", "( · · )", "{ - - }", "[ ˚ ˚ ]"]
const EMOTES_T2 = ["[><]", "{o o}", "( ^ ^ )", "[ o_o ]", "{ >.< }", "( ˘ ˘ )"]
const EMOTES_T3 = [
  " /\\ /\\\n( o o )\n [>_<]",
  " ^  ^\n(o  o)\n  (v)",
  " . · .\n( ✦ ✦ )\n \\ ~ /",
  " /\\_/\\\n( o.o )\n > ^ <",
]

type WordForm = { kind: "word"; chars: string[]; fontPx: number }
type EmoteForm = { kind: "emote"; cells: string[]; rows: number; cols: number; fontPx: number }
type Form = WordForm | EmoteForm

const INITIAL_WORD = "YOU"

/** Build an emoticon's grid, preserving internal spacing, padded to a rectangle. */
function buildEmoteCells(art: string): { cells: string[]; rows: number; cols: number } {
  const lines = art.split("\n")
  const cols = Math.max(...lines.map((l) => l.length))
  const rows = lines.length
  const cells = Array<string>(rows * cols).fill(" ")
  for (let r = 0; r < rows; r++) {
    const line = lines[r]
    for (let c = 0; c < line.length; c++) cells[r * cols + c] = line[c]
  }
  return { cells, rows, cols }
}

/** Target box for content: roughly the middle ~55% of the disc diameter. */
function targetBox(size: number) {
  return size * 0.75 * 0.55
}

/** Fit a rows×cols glyph grid into the target box, returning a font size. */
function fitGridFont(rows: number, cols: number, size: number): number {
  const usable = targetBox(size)
  const byWidth = usable / (cols * 0.62)
  const byHeight = usable / (rows * 1.02)
  return Math.min(byWidth, byHeight, size * 0.2)
}

/** Fit a single-line word into the target box, returning a font size. */
function fitWordFont(len: number, size: number): number {
  const usable = targetBox(size)
  const byWidth = usable / (Math.max(1, len) * 0.66)
  const byHeight = usable * 0.9
  return Math.min(byWidth, byHeight, size * 0.26)
}

function buildWord(word: string, size: number): WordForm {
  return { kind: "word", chars: [...word], fontPx: fitWordFont(word.length, size) }
}

function buildEmote(art: string, size: number): EmoteForm {
  const { cells, rows, cols } = buildEmoteCells(art)
  return { kind: "emote", cells, rows, cols, fontPx: fitGridFont(rows, cols, size) }
}

/** Pick a random face, weighted toward tiers 1-2 with occasional tier 3. */
function pickFace(): string {
  const roll = Math.random()
  const tier = roll < 0.4 ? EMOTES_T1 : roll < 0.85 ? EMOTES_T2 : EMOTES_T3
  return tier[Math.floor(Math.random() * tier.length)]
}

function randWordGlyph() {
  return WORD_SCRAMBLE[Math.floor(Math.random() * WORD_SCRAMBLE.length)]
}

export default function AmbientCreature({ size = 200 }: { size?: number }) {
  const [form, setForm] = useState<Form>(() => buildWord(INITIAL_WORD, size))
  // Step in the fixed cycle. Position 0 (YOU) is the initial paint, so the
  // first morph advances to step 1 (a face).
  const step = useRef(1)
  const wordBeat = useRef(1) // next word index: after YOU comes ARE, then HERE
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    let alive = true
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false
    const clearAll = () => {
      timers.current.forEach(clearTimeout)
      timers.current = []
    }

    function scheduleNext() {
      const wait = 1500 + Math.random() * 1500 // 1.5–3s per form
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

    // Cycle: steps 0,3,5 are words (YOU, ARE, HERE); 1,2,4,6 are faces.
    function isWordStep(s: number) {
      return s === 0 || s === 3 || s === 5
    }

    function morph() {
      const s = step.current % 7
      step.current = (step.current + 1) % 7
      if (isWordStep(s)) {
        const word = WORDS[wordBeat.current % WORDS.length]
        wordBeat.current++
        morphToWord(word)
      } else {
        morphToFace(pickFace())
      }
    }

    // ---- word: quick per-character pixel-in resolve (~200ms) ---------------
    function morphToWord(word: string) {
      const target = buildWord(word, size)
      if (reduce) {
        setForm(target)
        scheduleNext()
        return
      }
      // Seed all characters scrambled, then settle them left-to-right fast.
      setForm({ ...target, chars: target.chars.map(randWordGlyph) })
      const per = Math.min(60, 200 / target.chars.length)
      let maxDelay = 0
      target.chars.forEach((ch, i) => {
        const delay = i * per + 40
        const t = setTimeout(() => {
          if (!alive) return
          setForm((prev) => {
            if (prev.kind !== "word") return prev
            const chars = [...prev.chars]
            chars[i] = ch
            return { ...prev, chars }
          })
        }, delay)
        timers.current.push(t)
        maxDelay = Math.max(maxDelay, delay)
      })
      const done = setTimeout(() => alive && scheduleNext(), maxDelay + 240)
      timers.current.push(done)
    }

    // ---- face: ripple/stagger mutation resolve -----------------------------
    function morphToFace(art: string) {
      const target = buildEmote(art, size)
      if (reduce) {
        setForm(target)
        scheduleNext()
        return
      }
      setForm({
        ...target,
        cells: target.cells.map((c) => (c === " " ? " " : randomScramble(c))),
      })
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
          setForm((prev) => {
            if (prev.kind !== "emote") return prev
            const cells = [...prev.cells]
            cells[idx] = randomScramble(cells[idx])
            return { ...prev, cells }
          })
        }, base)
        const t2 = setTimeout(() => {
          if (!alive) return
          setForm((prev) => {
            if (prev.kind !== "emote") return prev
            const cells = [...prev.cells]
            cells[idx] = target.cells[idx]
            return { ...prev, cells }
          })
        }, base + 130)
        timers.current.push(t1, t2)
        maxDelay = Math.max(maxDelay, base + 130)
      })
      const done = setTimeout(() => alive && scheduleNext(), maxDelay + 260)
      timers.current.push(done)
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

      {/* The black disc — a 2px near-white outline with a slow breathing halo,
          so the circle itself feels alive rather than a static ring. */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          width: disc,
          height: disc,
          backgroundColor: "var(--background)",
          border: "2px solid oklch(0.95 0 0 / 0.6)",
          animation: "ambientHalo 4s ease-in-out infinite",
        }}
      />

      {/* The morphing being — breathes (outer) and blinks (inner). */}
      <div className="relative" style={{ animation: "ambientBreathe 4.5s ease-in-out infinite" }}>
        <div
          className="flex flex-col items-center"
          style={{
            color: NEUTRAL,
            filter: `drop-shadow(0 0 10px ${NEUTRAL})`,
            animation: "ambientBlink 5.4s ease-in-out infinite",
          }}
        >
          {form.kind === "word" ? (
            <div
              className="flex items-center justify-center"
              style={{
                fontFamily: PIXEL_FONT,
                fontSize: `${form.fontPx}px`,
                fontWeight: 600,
                lineHeight: 1,
                letterSpacing: `${form.fontPx * 0.06}px`,
                userSelect: "none",
              }}
            >
              {form.chars.map((ch, i) => (
                <span key={i} style={{ display: "inline-block" }}>
                  {ch === " " ? "\u00A0" : ch}
                </span>
              ))}
            </div>
          ) : (
            <FaceGrid form={form} />
          )}
        </div>
      </div>
    </div>
  )
}

function FaceGrid({ form }: { form: EmoteForm }) {
  const cellW = form.fontPx * 0.62
  const lineH = form.fontPx * 1.02
  const rows: string[][] = []
  for (let r = 0; r < form.rows; r++) {
    rows.push(form.cells.slice(r * form.cols, (r + 1) * form.cols))
  }
  return (
    <>
      {rows.map((row, r) => (
        <div key={r} className="flex" style={{ height: lineH }}>
          {row.map((ch, c) => (
            <span
              key={c}
              style={{
                width: cellW,
                textAlign: "center",
                fontFamily: MONO,
                fontSize: `${form.fontPx}px`,
                lineHeight: `${lineH}px`,
                userSelect: "none",
              }}
            >
              {ch === " " ? "\u00A0" : ch}
            </span>
          ))}
        </div>
      ))}
    </>
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
  0%, 100% {
    box-shadow: 0 0 6px 0 oklch(0.98 0 0 / 0.1), 0 0 0 0 oklch(0.98 0 0 / 0);
  }
  50% {
    box-shadow: 0 0 18px 3px oklch(0.98 0 0 / 0.28), 0 0 34px 8px oklch(0.98 0 0 / 0.08);
  }
}
@media (prefers-reduced-motion: reduce) {
  @keyframes ambientBreathe { 0%,100% { transform: none; } }
  @keyframes ambientBlink { 0%,100% { opacity: 1; } }
  @keyframes ambientHalo { 0%,100% { box-shadow: 0 0 8px 1px oklch(0.98 0 0 / 0.18); } }
}
`
