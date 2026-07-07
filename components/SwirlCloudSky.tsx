"use client"

import { useEffect, useRef } from "react"
import { SKY_CELL, skyField } from "@/lib/sky-field"

/**
 * A rendered sky that sits BEHIND the AsciiRippleSky on the landing page.
 *
 * It reads from the SAME shared wave field (lib/sky-field) as the ripple, so
 * the clouds gather and drift exactly where the ASCII glyphs brighten — the two
 * layers are one field drawn two ways.
 *
 *  - Day  (06:00–18:59 local): swirled clouds over a blue sky gradient.
 *  - Night (19:00–05:59 local): a clear, gently twinkling starfield.
 *
 * Performance: the cloud field is computed at ~1/6 resolution into a small
 * offscreen buffer and scaled up (the upscale doubles as a soft blur), and the
 * loop is capped near 30fps. prefers-reduced-motion renders a single static
 * frame. This is the heaviest visual in the app, so it stays cheap on purpose.
 */

type RGB = [number, number, number]
const PALETTE: Record<"day" | "night", { sky: RGB; sky2: RGB; cloud: RGB }> = {
  // Neutral greyscale swirl: a medium-grey sky with lighter grey clouds, so the
  // backdrop reads as soft grey fog (no blue tint) at any time of day.
  day: { sky: [128, 128, 128], sky2: [142, 142, 142], cloud: [214, 214, 214] },
  night: { sky: [128, 128, 128], sky2: [142, 142, 142], cloud: [214, 214, 214] },
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

export default function SwirlCloudSky() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const hour = new Date().getHours()
    const isNight = hour < 6 || hour >= 19
    const PA = isNight ? PALETTE.night : PALETTE.day
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches

    // ---- tiny value-noise (fBm) for cloud texture -------------------------
    const perm = new Uint8Array(512)
    {
      const p: number[] = []
      for (let i = 0; i < 256; i++) p[i] = i
      for (let i = 255; i > 0; i--) {
        const j = (Math.random() * (i + 1)) | 0
        ;[p[i], p[j]] = [p[j], p[i]]
      }
      for (let i = 0; i < 512; i++) perm[i] = p[i & 255]
    }
    const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10)
    const grad = (h: number, x: number, y: number) => {
      switch (h & 3) {
        case 0:
          return x + y
        case 1:
          return -x + y
        case 2:
          return x - y
        default:
          return -x - y
      }
    }
    const vnoise = (x: number, y: number) => {
      const X = Math.floor(x) & 255
      const Y = Math.floor(y) & 255
      x -= Math.floor(x)
      y -= Math.floor(y)
      const u = fade(x)
      const v = fade(y)
      const aa = perm[perm[X] + Y]
      const ab = perm[perm[X] + Y + 1]
      const ba = perm[perm[X + 1] + Y]
      const bb = perm[perm[X + 1] + Y + 1]
      return lerp(
        lerp(grad(aa, x, y), grad(ba, x - 1, y), u),
        lerp(grad(ab, x, y - 1), grad(bb, x - 1, y - 1), u),
        v,
      )
    }
    const fbm = (x: number, y: number) => {
      let v = 0
      let a = 0.5
      let f = 1
      for (let i = 0; i < 4; i++) {
        v += a * vnoise(x * f, y * f)
        f *= 2
        a *= 0.5
      }
      return v // ~ -1..1
    }

    // ---- sizing -----------------------------------------------------------
    let W = 0
    let H = 0
    let dpr = 1
    let cols = 0
    let rows = 0
    // Low-res offscreen buffer for the cloud field (perf).
    const buffer = document.createElement("canvas")
    const bctx = buffer.getContext("2d")
    let bw = 0
    let bh = 0
    let bimg: ImageData | null = null

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      W = window.innerWidth
      H = window.innerHeight
      canvas.width = Math.floor(W * dpr)
      canvas.height = Math.floor(H * dpr)
      canvas.style.width = `${W}px`
      canvas.style.height = `${H}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.imageSmoothingEnabled = true
      // Ripple grid dimensions (CSS px / cell) — must match AsciiRippleSky so
      // the wave lines up between layers.
      cols = Math.ceil(W / SKY_CELL)
      rows = Math.ceil(H / SKY_CELL)
      // Cloud buffer at ~1/6 resolution.
      bw = Math.max(80, Math.floor(W / 6))
      bh = Math.max(80, Math.floor(H / 6))
      buffer.width = bw
      buffer.height = bh
      bimg = bctx ? bctx.createImageData(bw, bh) : null
    }
    resize()
    window.addEventListener("resize", resize)

    // ---- render -----------------------------------------------------------
    function renderDay(t: number) {
      if (!bctx || !bimg) return
      const d = bimg.data
      for (let y = 0; y < bh; y++) {
        // vertical sky gradient
        const gy = y / bh
        const sr = lerp(PA.sky[0], PA.sky2[0], gy)
        const sg = lerp(PA.sky[1], PA.sky2[1], gy)
        const sb = lerp(PA.sky[2], PA.sky2[2], gy)
        // map buffer row -> ripple grid row
        const r = (y / bh) * rows
        for (let x = 0; x < bw; x++) {
          const idx = (y * bw + x) * 4
          const c = (x / bw) * cols
          const n = skyField(c, r, cols, rows, t)
          // only the upper half of the wave becomes cloud -> blue-sky gaps
          let cloud = Math.pow(Math.max(0, n - 0.5) / 0.5, 1.1)
          if (cloud > 0.02) {
            // texture so it reads as cloud, not smooth bands
            const tex = fbm(x * 0.05 + t * 0.02, y * 0.05) + 0.75
            cloud = Math.min(1, cloud * tex * 1.05)
          }
          d[idx] = lerp(sr, PA.cloud[0], Math.max(0, cloud))
          d[idx + 1] = lerp(sg, PA.cloud[1], Math.max(0, cloud))
          d[idx + 2] = lerp(sb, PA.cloud[2], Math.max(0, cloud))
          d[idx + 3] = 255
        }
      }
      bctx.putImageData(bimg, 0, 0)
      // scale the low-res buffer up to full size — the upscale softens it into
      // fog for free.
      ctx.drawImage(buffer, 0, 0, W, H)
    }

    function renderNight(t: number) {
      // clear sky gradient
      const g = ctx.createLinearGradient(0, 0, 0, H)
      g.addColorStop(
        0,
        `rgb(${PA.sky[0]}, ${PA.sky[1]}, ${PA.sky[2]})`,
      )
      g.addColorStop(
        1,
        `rgb(${PA.sky2[0]}, ${PA.sky2[1]}, ${PA.sky2[2]})`,
      )
      ctx.fillStyle = g
      ctx.fillRect(0, 0, W, H)
      // ~160 hash-stable stars with a gentle twinkle
      for (let i = 0; i < 160; i++) {
        const hx = Math.sin(i * 12.9898) * 43758.5453
        const hy = Math.sin(i * 78.233) * 12543.113
        const sx = (hx - Math.floor(hx)) * W
        const sy = (hy - Math.floor(hy)) * H
        const tw = 0.5 + 0.5 * Math.sin(t * 1.4 + i)
        ctx.fillStyle = `rgba(220, 226, 255, ${0.35 + tw * 0.5})`
        ctx.fillRect(sx, sy, 1.4, 1.4)
      }
    }

    let raf = 0
    let last = 0
    const start = performance.now()

    function loop(now: number) {
      // clouds are expensive — cap near 30fps
      if (now - last > 33) {
        const t = (now - start) / 1000
        if (isNight) renderNight(t)
        else renderDay(t)
        last = now
      }
      raf = requestAnimationFrame(loop)
    }

    if (reduceMotion) {
      // single static frame
      if (isNight) renderNight(0)
      else renderDay(0)
    } else {
      raf = requestAnimationFrame(loop)
    }

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
    />
  )
}
