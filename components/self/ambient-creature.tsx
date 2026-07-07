"use client"

import { useEffect, useRef, useState } from "react"
import { RIPPLE_STAGGER_MS, randomScramble } from "@/lib/self/mutation"

/**
 * AmbientCreature — a "demo mode" of the self being for the landing page.
 *
 * It sits inside the same black disc + thin near-white outline used on /self,
 * and cycles playfully through small forms as a preview of the self you'll
 * grow:
 *   - creature faces/emoticons in three detail tiers (minimal → detailed), and
 *   - short world-words ("you", "self", "spiral", "hi", "?") rendered as large
 *     ASCII-art letterforms DRAWN OUT of the creature's own palette glyphs via
 *     a tiny 3x5 pixel font.
 *
 * Every form is laid out on a fixed-cell grid and the whole grid is optically
 * centered in the disc (so nothing sits off-center), with the font-size scaled
 * per form so even the longest word fits with margin. Transitions reuse the
 * being's ripple/stagger mutation feel (lib/self/mutation): cells resolve one
 * by one, each flickering through a scramble glyph before settling.
 *
 * Deterministic first paint (a fixed "you") so SSR and client match; morphing,
 * blinking and breathing begin after mount. Animation pauses while the tab is
 * hidden and collapses to quiet swaps under prefers-reduced-motion.
 */

const NEUTRAL = "#e8e4da"
const MONO = "'Geist Pixel', ui-monospace, monospace"

// The glyphs an "on" pixel of a word can be drawn from — the creature's palette.
const PALETTE = ["*", "+", ":", "✦", "·"]

// ---- 3x5 pixel font --------------------------------------------------------
// Each letter is 3 wide, 5 tall. '#' = on pixel (becomes a palette glyph),
// space = off. Letters are joined horizontally with a 1-column gap.
const FONT: Record<string, string[]> = {
  a: ["###", "#.#", "###", "#.#", "#.#"],
  b: ["##.", "#.#", "##.", "#.#", "##."],
  e: ["###", "#..", "##.", "#..", "###"],
  f: ["###", "#..", "##.", "#..", "#.."],
  g: ["###", "#..", "#.#", "#.#", "###"],
  h: ["#.#", "#.#", "###", "#.#", "#.#"],
  i: ["###", ".#.", ".#.", ".#.", "###"],
  l: ["#..", "#..", "#..", "#..", "###"],
  o: ["###", "#.#", "#.#", "#.#", "###"],
  p: ["###", "#.#", "###", "#..", "#.."],
  r: ["##.", "#.#", "##.", "#.#", "#.#"],
  s: ["###", "#..", "###", "..#", "###"],
  u: ["#.#", "#.#", "#.#", "#.#", "###"],
  y: ["#.#", "#.#", ".#.", ".#.", ".#."],
  "?": ["###", "..#", ".##", "...", ".#."],
}

const WORDS = ["you", "self", "spiral", "hi", "?"]

// ---- emoticon repertoire, in three detail tiers ----------------------------
const EMOTES_T1 = ["[ . . ]", "( · · )", "{ - - }", "[ ˚ ˚ ]"]
const EMOTES_T2 = ["[><]", "{o o}", "( ^ ^ )", "[ o_o ]", "{ >.< }", "( ˘ ˘ )"]
const EMOTES_T3 = [
  " /\\ /\\\n( o o )\n [>_<]",
  " ^  ^\n(o  o)\n  (v)",
  " . · .\n( ✦ ✦ )\n \\ ~ /",
  " /\\_/\\\n( o.o )\n > ^ <",
]

type FormSpec = { id: string; kind: "word" | "emote"; value: string }
type Grid = { cells: string[]; rows: number; cols: number; fontPx: number }

const INITIAL: FormSpec = { id: "w:you", kind: "word", value: "you" }

/** Build a word's 2D cell grid from the pixel font (palette glyphs on "on"). */
function buildWordCells(word: string): { cells: string[]; rows: number; cols: number } {
  const letters = [...word].map((ch) => FONT[ch] ?? FONT["?"])
  const rows = 5
  const cols = letters.length * 3 + (letters.length - 1) // 1-col gap between letters
  const cells = Array<string>(rows * cols).fill(" ")
  let x = 0
  letters.forEach((pat, li) => {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < 3; c++) {
        if (pat[r][c] === "#") {
          // Deterministic palette pick → identical SSR/client first paint.
          const g = PALETTE[(li * 7 + r * 3 + c) % PALETTE.length]
          cells[r * cols + (x + c)] = g
        }
      }
    }
    x += 4 // 3 wide + 1 gap
  })
  return { cells, rows, cols }
}

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

/** Fit a grid of the given dimensions into the disc, returning a font size. */
function fitFont(rows: number, cols: number, size: number): number {
  const usable = size * 0.75 * 0.82 // disc is size*0.75; keep an inner margin
  const byWidth = usable / (cols * 0.62)
  const byHeight = usable / (rows * 1.02)
  return Math.min(byWidth, byHeight, size * 0.16) // cap so tiny forms stay tidy
}

function buildForm(spec: FormSpec, size: number): Grid {
  const { cells, rows, cols } =
    spec.kind === "word" ? buildWordCells(spec.value) : buildEmoteCells(spec.value)
  return { cells, rows, cols, fontPx: fitFont(rows, cols, size) }
}

/** Pick the next form: mostly emoticons (tiers 1-2, occasional 3), some words. */
function pickForm(currentId: string): FormSpec {
  for (let tries = 0; tries < 12; tries++) {
    let spec: FormSpec
    if (Math.random() < 0.45) {
      const value = WORDS[Math.floor(Math.random() * WORDS.length)]
      spec = { id: `w:${value}`, kind: "word", value }
    } else {
      const roll = Math.random()
      const tier = roll < 0.4 ? EMOTES_T1 : roll < 0.85 ? EMOTES_T2 : EMOTES_T3
      const idx = Math.floor(Math.random() * tier.length)
      const value = tier[idx]
      spec = { id: `e:${value}`, kind: "emote", value }
    }
    if (spec.id !== currentId) return spec
  }
  return INITIAL
}

export default function AmbientCreature({ size = 200 }: { size?: number }) {
  const [grid, setGrid] = useState<Grid>(() => buildForm(INITIAL, size))
  const curId = useRef(INITIAL.id)
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

    function morph() {
      const spec = pickForm(curId.current)
      curId.current = spec.id
      const target = buildForm(spec, size)

      if (reduce) {
        setGrid(target)
        scheduleNext()
        return
      }

      // Reshape to the target grid immediately, seeding every "on" cell with a
      // scramble glyph so the new form resolves IN rather than hard-cutting.
      const seeded: Grid = {
        ...target,
        cells: target.cells.map((c) => (c === " " ? " " : randomScramble(c))),
      }
      setGrid(seeded)

      const active = target.cells
        .map((c, i) => (c === " " ? -1 : i))
        .filter((i) => i >= 0)
        .sort(() => Math.random() - 0.5)

      // Adaptive stagger so dense words don't take too long to resolve.
      const per = Math.min(RIPPLE_STAGGER_MS / 2, 700 / Math.max(1, active.length))
      let maxDelay = 0
      active.forEach((idx, k) => {
        const base = k * per
        const t1 = setTimeout(() => {
          if (!alive) return
          setGrid((prev) => {
            const cells = [...prev.cells]
            cells[idx] = randomScramble(cells[idx])
            return { ...prev, cells }
          })
        }, base)
        const t2 = setTimeout(() => {
          if (!alive) return
          setGrid((prev) => {
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
  const cellW = grid.fontPx * 0.62
  const lineH = grid.fontPx * 1.02

  // Chunk the flat cell array into rows for rendering.
  const rows: string[][] = []
  for (let r = 0; r < grid.rows; r++) {
    rows.push(grid.cells.slice(r * grid.cols, (r + 1) * grid.cols))
  }

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <style>{AMBIENT_KEYFRAMES}</style>

      {/* The black disc with a thin near-white outline — matching /self. */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          width: disc,
          height: disc,
          backgroundColor: "var(--background)",
          border: "1px solid oklch(0.95 0 0 / 0.55)",
        }}
      />

      {/* The morphing being — breathes (outer) and blinks (inner). */}
      <div
        className="relative"
        style={{ animation: "ambientBreathe 4.5s ease-in-out infinite" }}
      >
        <div
          className="flex flex-col items-center"
          style={{
            color: NEUTRAL,
            filter: `drop-shadow(0 0 10px ${NEUTRAL})`,
            animation: "ambientBlink 5.4s ease-in-out infinite",
          }}
        >
          {rows.map((row, r) => (
            <div key={r} className="flex" style={{ height: lineH }}>
              {row.map((ch, c) => (
                <span
                  key={c}
                  style={{
                    width: cellW,
                    textAlign: "center",
                    fontFamily: MONO,
                    fontSize: `${grid.fontPx}px`,
                    lineHeight: `${lineH}px`,
                    userSelect: "none",
                  }}
                >
                  {ch === " " ? "\u00A0" : ch}
                </span>
              ))}
            </div>
          ))}
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
@media (prefers-reduced-motion: reduce) {
  @keyframes ambientBreathe { 0%,100% { transform: none; } }
  @keyframes ambientBlink { 0%,100% { opacity: 1; } }
}
`
