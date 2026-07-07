"use client"

import { useEffect, useRef } from "react"

/**
 * AsciiSpiral
 * A glowing ASCII spiral that matches the SelfAvatar aesthetic — same glyph
 * ramp, same Space Mono font, same drop-shadow glow. Rendered as a polar
 * field via requestAnimationFrame.
 *
 * Motion: two arms wind continuously *inward* and dissolve into a dark center,
 * while fresh arms emerge at the rim — an infinite loop that disappears into
 * darkness at its core. Respects prefers-reduced-motion (renders one frame).
 */

// Grid half-extents. Monospace cells are taller than wide, so ASPECT squashes
// the y axis to keep the spiral a true circle.
const RX = 15
const RY = 9
const ASPECT = RY / RX

// Shared glyph ramp with SelfAvatar (sparse dots → dense star).
const RAMP = [" ", "·", "·", ":", "+", "*", "#", "✦"]

const smooth = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

export default function AsciiSpiral({ size = 150 }: { size?: number }) {
  const ref = useRef<HTMLPreElement | null>(null)
  const rafRef = useRef<number | null>(null)

  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches

  useEffect(() => {
    const el = ref.current
    if (!el) return

    let frame = 0

    const field = (t: number) => {
      // gentle breath so the spiral feels alive, not mechanical
      const breathe = Math.sin(t * 0.04) * 0.5 + 0.5
      const arms = 2
      const tightness = 0.62
      const grid: number[][] = []

      for (let y = -RY; y <= RY; y++) {
        const row: number[] = []
        for (let x = -RX; x <= RX; x++) {
          const nx = x
          const ny = y / ASPECT
          const d = Math.sqrt(nx * nx + ny * ny)
          if (d > RX + 0.5) {
            row.push(0)
            continue
          }
          const ang = Math.atan2(ny, nx)

          // Spiral arms: +t winds them inward toward the dark center.
          const s = Math.sin(arms * ang + d * tightness + t * 0.07)
          let arm = Math.max(0, s)
          arm = Math.pow(arm, 1.5)

          // Radial envelope: ~0 at the core (ends vanish into darkness),
          // brightest in the outer body, soft fade at the very rim.
          const rN = d / RX
          let env = smooth(0.04, 0.5, rN)
          env *= 1 - smooth(0.86, 1.02, rN)

          let v = arm * env * (0.78 + breathe * 0.22)

          // Faint inner sparkle so the dark core isn't perfectly empty.
          if (rN < 0.35 && Math.abs(s) > 0.985) v = Math.max(v, 0.25 * env + 0.12)

          row.push(v)
        }
        grid.push(row)
      }
      return grid
    }

    const draw = () => {
      const grid = field(frame)
      let out = ""
      for (const row of grid) {
        for (const v of row)
          out += v <= 0.02 ? " " : RAMP[Math.min(RAMP.length - 1, Math.floor(v * RAMP.length))]
        out += "\n"
      }
      el.textContent = out
    }

    const loop = () => {
      frame++
      draw()
      rafRef.current = requestAnimationFrame(loop)
    }

    if (reduceMotion) {
      draw()
    } else {
      rafRef.current = requestAnimationFrame(loop)
    }

    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    }
  }, [reduceMotion])

  const cols = RX * 2 + 1
  const fontPx = (size / cols) * 1.05

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        border: "2px solid #fff",
        background: "#000",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <pre
        ref={ref}
        aria-hidden="true"
        style={{
          margin: 0,
          width: size,
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily:
            "var(--font-space-mono), 'Space Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: `${fontPx}px`,
          lineHeight: 0.92,
          letterSpacing: 0,
          // White glyphs on the black circular background
          color: "#fff",
          whiteSpace: "pre",
          userSelect: "none",
          pointerEvents: "none",
          overflow: "hidden",
          filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.25))",
        }}
      />
    </div>
  )
}
