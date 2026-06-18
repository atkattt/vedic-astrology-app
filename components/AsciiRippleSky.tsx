"use client"

import { useEffect, useRef } from "react"

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
    // ꩜ (spiral) appears among the denser peaks as a nod to "Spiral Inward".
    const ramp = "  ...,:;+*=oO#꩜"
    const cell = 14 // px per glyph cell
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

    // A few moving ripple sources, expressed in grid coordinates.
    const sources = [
      { x: 0.3, y: 0.35, freq: 0.45, speed: 1.1 },
      { x: 0.72, y: 0.62, freq: 0.32, speed: -0.8 },
      { x: 0.5, y: 0.5, freq: 0.6, speed: 0.55 },
    ]

    let raf = 0
    let start = performance.now()

    function frame(now: number) {
      const t = (now - start) / 1000
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          let v = 0
          for (const s of sources) {
            const dx = c - s.x * cols
            const dy = r - s.y * rows
            const dist = Math.sqrt(dx * dx + dy * dy)
            v += Math.sin(dist * s.freq - t * s.speed)
          }
          // Normalize roughly to 0..1
          let n = (v / sources.length + 1) / 2
          n = Math.max(0, Math.min(1, n))

          const idx = Math.floor(n * (ramp.length - 1))
          const ch = ramp[idx]
          if (ch === " ") continue

          // Grayscale gradient that fades from black up to grey (never full
          // white). Brightness follows the ripple value, capped at GREY_MAX so
          // the peaks settle into a soft grey rather than glowing white.
          const GREY_MAX = 150
          const lum = Math.round(Math.pow(n, 1.5) * GREY_MAX)
          ctx.fillStyle = `rgb(${lum}, ${lum}, ${lum})`
          ctx.fillText(ch, c * cell, r * cell)
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
      className="pointer-events-none fixed inset-0 z-0"
      style={{ backgroundColor: "#000000" }}
    />
  )
}
