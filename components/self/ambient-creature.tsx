"use client"

import { useEffect, useRef, useState } from "react"
import { RIPPLE_STAGGER_MS, randomScramble } from "@/lib/self/mutation"

/**
 * AmbientCreature — a "demo mode" of the self being for the landing page.
 *
 * It sits inside the same black disc + thin near-white outline used on /self,
 * and cycles playfully through small forms — creature faces, tiny symbols, and
 * short lowercase words from the app's world — as a preview of the self you'll
 * grow. Transitions reuse the being's ripple/stagger mutation feel (via
 * lib/self/mutation): characters resolve one by one, each flickering through a
 * scramble glyph before it settles, rather than swapping in hard cuts.
 *
 * Deterministic first paint (a fixed "you") so SSR and client match; the random
 * morphing only begins after mount. Animation pauses while the tab is hidden
 * and collapses to quiet swaps under prefers-reduced-motion.
 */

const NEUTRAL = "#e8e4da"
const MONO = "'Geist Pixel', ui-monospace, monospace"

// The width of the morph field, in character cells (odd → centers cleanly).
const WIDTH = 7

// What the being shows off it can become: faces, symbols, and world-words.
const FORMS = [
  "[><]",
  "{o o}",
  "[ . . ]",
  "(˚ ˚)",
  "✦",
  "☾",
  "⁂",
  "you",
  "begin",
  "spiral",
  "self",
]

const INITIAL = "you"

/** Center a form string into a fixed-width array of cells (padded with spaces). */
function centerForm(s: string): string[] {
  const arr = Array<string>(WIDTH).fill(" ")
  const start = Math.max(0, Math.floor((WIDTH - s.length) / 2))
  for (let i = 0; i < s.length && start + i < WIDTH; i++) arr[start + i] = s[i]
  return arr
}

export default function AmbientCreature({ size = 200 }: { size?: number }) {
  const [chars, setChars] = useState<string[]>(() => centerForm(INITIAL))
  const charsRef = useRef<string[]>(chars)
  charsRef.current = chars
  const curForm = useRef(INITIAL)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    let alive = true
    const reduce =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false
    const clearAll = () => {
      timers.current.forEach(clearTimeout)
      timers.current = []
    }

    function scheduleNext() {
      const wait = 1500 + Math.random() * 1500 // 1.5–3s between forms
      const t = setTimeout(() => {
        if (!alive) return
        // Hold while the tab is hidden; re-check shortly.
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
      let next = curForm.current
      while (next === curForm.current)
        next = FORMS[Math.floor(Math.random() * FORMS.length)]
      curForm.current = next
      const target = centerForm(next)

      if (reduce) {
        setChars(target)
        scheduleNext()
        return
      }

      const from = charsRef.current
      // Only animate cells that actually change from/to a glyph — space→space
      // cells stay put so the ripple stays clean. Randomized order gives the
      // one-by-one stagger its organic feel.
      const active = target
        .map((_, i) => i)
        .filter((i) => !(from[i] === " " && target[i] === " "))
        .sort(() => Math.random() - 0.5)

      const per = RIPPLE_STAGGER_MS / 2 // ~75ms between cells resolving
      let maxDelay = 0
      active.forEach((idx, k) => {
        const base = k * per
        // brief scramble flicker...
        const t1 = setTimeout(() => {
          if (!alive) return
          setChars((prev) => {
            const n = [...prev]
            n[idx] = randomScramble(prev[idx])
            return n
          })
        }, base)
        // ...then settle onto the target glyph
        const t2 = setTimeout(() => {
          if (!alive) return
          setChars((prev) => {
            const n = [...prev]
            n[idx] = target[idx]
            return n
          })
        }, base + 130)
        timers.current.push(t1, t2)
        maxDelay = Math.max(maxDelay, base + 130)
      })

      const done = setTimeout(() => alive && scheduleNext(), maxDelay + 220)
      timers.current.push(done)
    }

    scheduleNext()
    return () => {
      alive = false
      clearAll()
    }
  }, [])

  const disc = size * 0.75
  const fontPx = size * 0.16
  const cellW = fontPx * 0.66

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

      {/* The morphing being. */}
      <div
        className="relative flex"
        style={{
          color: NEUTRAL,
          filter: `drop-shadow(0 0 10px ${NEUTRAL})`,
          animation: "ambientBreathe 4.5s ease-in-out infinite",
        }}
      >
        {chars.map((ch, i) => (
          <span
            key={i}
            style={{
              width: cellW,
              textAlign: "center",
              fontFamily: MONO,
              fontSize: `${fontPx}px`,
              lineHeight: 1,
              userSelect: "none",
            }}
          >
            {ch === " " ? "\u00A0" : ch}
          </span>
        ))}
      </div>
    </div>
  )
}

const AMBIENT_KEYFRAMES = `
@keyframes ambientBreathe {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-3px) scale(1.02); }
}
@media (prefers-reduced-motion: reduce) {
  @keyframes ambientBreathe { 0%,100% { transform: none; } }
}
`
