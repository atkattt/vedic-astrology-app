"use client"

import { useEffect, useRef } from "react"
import { SKY_CELL, skyField } from "@/lib/sky-field"

/**
 * A full-screen, infinitely animating ASCII "ripple sky" rendered to a canvas.
 * Concentric sine ripples drift across a grid of monospace glyphs on pure black,
 * each glyph shaded along a grayscale gradient that fades from black up to a
 * soft grey at the ripple peaks (never full white). Sits behind all content
 * (fixed, pointer-events-none) and respects reduced-motion preferences.
 */
export default function AsciiRippleSky() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Sparse -> dense glyph ramp. Spaces keep the sky mostly empty/black.
    // ꩜ (spiral) replaces the round "o/O" glyphs as a nod to "Spiral Inward".
    // The three densest steps are all spirals, drawn small -> medium -> large
    // so the gradient ramps up smoothly toward the brightest ripple peaks.
    const ramp = "  ...,:;+*=꩜꩜꩜"
    // Per-index scale factor (of the cell size) for the spiral glyphs.
    const SPIRAL_SCALE: Record<number, number> = {
      11: 0.55, // small spiral
      12: 0.78, // medium spiral
      13: 1.0, // large spiral
    }
    const cell = SKY_CELL // px per glyph cell (shared with the cloud layer)
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches

    let cols = 0
    let rows = 0
    let dpr = 1

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = window.innerWidth
      const h = window.innerHeight
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.font = `${cell}px "JetBrains Mono", ui-monospace, monospace`
      ctx.textBaseline = "top"
      cols = Math.ceil(w / cell)
      rows = Math.ceil(h / cell)
    }
    resize()
    window.addEventListener("resize", resize)

    // The ripple reads from the shared sky-field module (skyField / SKY_SOURCES)
    // so the cloud layer behind us pulses from the exact same wave.
    let raf = 0
    let start = performance.now()

    function frame(now: number) {
      const t = (now - start) / 1000
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const n = skyField(c, r, cols, rows, t)

          const idx = Math.floor(n * (ramp.length - 1))
          const ch = ramp[idx]
          if (ch === " ") continue

          // Grayscale gradient that fades from black up to grey (never full
          // white). Brightness follows the ripple value, capped at GREY_MAX so
          // the peaks settle into a soft grey rather than glowing white.
          const GREY_MAX = 150
          const lum = Math.round(Math.pow(n, 1.5) * GREY_MAX)
          ctx.fillStyle = `rgb(${lum}, ${lum}, ${lum})`

          const scale = SPIRAL_SCALE[idx]
          if (scale && scale < 1) {
            // Draw smaller spirals centered in their cell so the gradient steps
            // up smoothly from small -> medium -> large ꩜.
            const size = Math.round(cell * scale)
            ctx.font = `${size}px "JetBrains Mono", ui-monospace, monospace`
            const off = (cell - size) / 2
            ctx.fillText(ch, c * cell + off, r * cell + off)
            ctx.font = `${cell}px "JetBrains Mono", ui-monospace, monospace`
          } else {
            ctx.fillText(ch, c * cell, r * cell)
          }
        }
      }

      if (!reduceMotion) {
        raf = requestAnimationFrame(frame)
      }
    }

    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("resize", resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[1]"
      // Transparent + screen blend so the ASCII glyphs sit as light ON TOP of
      // the SwirlCloudSky (z-0) behind it — the two layers share one wave.
      style={{ backgroundColor: "transparent", mixBlendMode: "screen" }}
    />
  )
}
