"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import SelfAvatar, { type Mood } from "@/components/circle/SelfAvatar"

/**
 * SpiralUniverse — Layer 1 of the explorable universe.
 *
 * Turns the spiral area into a draggable, zoomable "universe." The SelfAvatar
 * stays PINNED at the center of the stage and never moves; the universe layer
 * (starfield + spiral arm + object markers) pans and zooms behind/around it.
 *
 * Two layers, by design:
 *   1. #universe — absolutely positioned, transform-origin 0 0, gets a CSS
 *      transform translate(tx,ty) scale(s). Everything that should pan/zoom
 *      lives inside it, positioned in WORLD coordinates (0,0 = universe center).
 *   2. The avatar — a SEPARATE layer on top, pinned to stage center. It is NOT
 *      inside #universe, so the zoom/pan transform never touches it.
 *
 * Layer 1 uses placeholder markers only. Real read-objects and people, plus
 * click-to-open reads, arrive in Layers 2 and 3.
 */

const MIN_SCALE = 0.4
const MAX_SCALE = 4

// Spiral geometry in world units, centered on (0,0).
const TURNS = 3
const MAX_R = 480
// No spiral glyph is drawn within this radius — carves a clean hole where the
// pinned avatar lives. Glyphs fade in over FADE_BAND just outside it.
const AVATAR_CLEAR_RADIUS = 96
const FADE_BAND = 72
const GLYPH_STEPS = 250
const GLYPH_T_START = 0.04
const GLYPH_T_END = 1.7

function spiralPoint(t: number) {
  const theta = t * TURNS * Math.PI * 2 - Math.PI / 2
  const r = MAX_R * t
  return { x: r * Math.cos(theta), y: r * Math.sin(theta) }
}

type Glyph = {
  key: number
  x: number
  y: number
  char: string
  size: number
  max: number
  delay: number
}

type WorldStar = {
  x: number
  y: number
  size: number
  opacity: number
  duration: string
  delay: string
}

type Marker = {
  label: string
  x: number
  y: number
  color: string
  glyph: string
}

// Placeholder markers (Layer 2 replaces these with real reads + people).
const MARKERS: Marker[] = [
  { label: "core", x: 150, y: -96, color: "#cfcbc1", glyph: "✦" },
  { label: "gift", x: -168, y: 64, color: "#cfcbc1", glyph: "✦" },
  { label: "turn", x: 64, y: 188, color: "#cfcbc1", glyph: "✦" },
  { label: "Mara", x: 372, y: -228, color: "#d98a9a", glyph: "★" },
  { label: "Théo", x: -432, y: 148, color: "#7fc4d4", glyph: "★" },
  { label: "Ines", x: 128, y: 446, color: "#a99ad9", glyph: "★" },
]

export function SpiralUniverse({
  mood = "idle",
  growth,
  onSelectSelf,
}: {
  mood?: Mood
  growth: number
  onSelectSelf?: () => void
}) {
  const stageRef = useRef<HTMLDivElement | null>(null)
  const universeRef = useRef<HTMLDivElement | null>(null)
  const camRef = useRef({ x: 0, y: 0, scale: 1 })
  const [zoomPct, setZoomPct] = useState(100)

  // Pointer / gesture bookkeeping.
  const draggingRef = useRef(false)
  const lastRef = useRef({ x: 0, y: 0 })
  const ptsRef = useRef<Map<number, { x: number; y: number }>>(new Map())
  const pinchRef = useRef(0)

  // The spiral arm, as a trail of ASCII glyphs winding outward from the core.
  const glyphs = useMemo<Glyph[]>(() => {
    const chars = ["+", "*", "✦"]
    const out: Glyph[] = []
    for (let i = 0; i <= GLYPH_STEPS; i++) {
      const t = GLYPH_T_START + (GLYPH_T_END - GLYPH_T_START) * (i / GLYPH_STEPS)
      const { x, y } = spiralPoint(t)
      const dist = Math.hypot(x, y)
      if (dist < AVATAR_CLEAR_RADIUS) continue
      const rawEdge = Math.min(1, Math.max(0, (dist - AVATAR_CLEAR_RADIUS) / FADE_BAND))
      const edgeFade = rawEdge * rawEdge * (3 - 2 * rawEdge) // smoothstep
      out.push({
        key: i,
        x,
        y,
        char: chars[i % chars.length],
        size: 7 + Math.min(t, 1.4) * 9,
        max: (0.16 + Math.min(t, 1) * 0.34) * edgeFade,
        delay: -((i * 0.07) % 3.2),
      })
    }
    return out
  }, [])

  // Starfield baked into the universe so it parallaxes as you pan/zoom.
  // Seeded PRNG keeps positions stable across SSR + client (no hydration drift).
  const stars = useMemo<WorldStar[]>(() => {
    let seed = 7
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280
      return seed / 233280
    }
    return Array.from({ length: 220 }).map(() => {
      const r = 80 + rand() * 860
      const a = rand() * Math.PI * 2
      return {
        x: Math.cos(a) * r,
        y: Math.sin(a) * r,
        size: rand() < 0.85 ? 1 : 2,
        opacity: 0.2 + rand() * 0.55,
        duration: `${3 + rand() * 5}s`,
        delay: `${rand() * 6}s`,
      }
    })
  }, [])

  const apply = useCallback(() => {
    const stage = stageRef.current
    const universe = universeRef.current
    if (!stage || !universe) return
    const cam = camRef.current
    const cx = stage.clientWidth / 2
    const cy = stage.clientHeight / 2
    const tx = cx - cam.x * cam.scale
    const ty = cy - cam.y * cam.scale
    universe.style.transform = `translate(${tx}px, ${ty}px) scale(${cam.scale})`
    setZoomPct(Math.round(cam.scale * 100))
  }, [])

  // Zoom anchored at a stage-relative point (sx,sy) — keeps that point fixed.
  const zoomAt = useCallback(
    (sx: number, sy: number, factor: number) => {
      const stage = stageRef.current
      if (!stage) return
      const cam = camRef.current
      const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, cam.scale * factor))
      if (newScale === cam.scale) return
      const cx = stage.clientWidth / 2
      const cy = stage.clientHeight / 2
      const wx = (sx - (cx - cam.x * cam.scale)) / cam.scale
      const wy = (sy - (cy - cam.y * cam.scale)) / cam.scale
      cam.scale = newScale
      cam.x = wx - (sx - cx) / cam.scale
      cam.y = wy - (sy - cy) / cam.scale
      apply()
    },
    [apply],
  )

  const reset = useCallback(() => {
    camRef.current = { x: 0, y: 0, scale: 1 }
    apply()
  }, [apply])

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return

    const relX = (clientX: number) => clientX - stage.getBoundingClientRect().left
    const relY = (clientY: number) => clientY - stage.getBoundingClientRect().top

    const onPointerDown = (e: PointerEvent) => {
      // Let interactive controls (HUD buttons, avatar tap target) handle their
      // own clicks — don't hijack the pointer for panning, which would capture
      // it to the stage and swallow the click.
      if ((e.target as HTMLElement | null)?.closest("button")) return
      ptsRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
      draggingRef.current = true
      lastRef.current = { x: e.clientX, y: e.clientY }
      try {
        stage.setPointerCapture(e.pointerId)
      } catch {
        // ignore — capture is best-effort
      }
    }

    const onPointerMove = (e: PointerEvent) => {
      if (ptsRef.current.has(e.pointerId)) {
        ptsRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
      }
      // Two pointers → pinch zoom about their midpoint.
      if (ptsRef.current.size === 2) {
        const [a, b] = [...ptsRef.current.values()]
        const d = Math.hypot(a.x - b.x, a.y - b.y)
        const mx = (a.x + b.x) / 2
        const my = (a.y + b.y) / 2
        if (pinchRef.current) {
          zoomAt(mx - stage.getBoundingClientRect().left, my - stage.getBoundingClientRect().top, d / pinchRef.current)
        }
        pinchRef.current = d
        draggingRef.current = false
        return
      }
      if (!draggingRef.current) return
      const dx = e.clientX - lastRef.current.x
      const dy = e.clientY - lastRef.current.y
      lastRef.current = { x: e.clientX, y: e.clientY }
      const cam = camRef.current
      // Divide by scale so pan speed feels natural at every zoom level.
      cam.x -= dx / cam.scale
      cam.y -= dy / cam.scale
      apply()
    }

    const clearPt = (e: PointerEvent) => {
      ptsRef.current.delete(e.pointerId)
      if (ptsRef.current.size < 2) pinchRef.current = 0
      if (ptsRef.current.size === 0) draggingRef.current = false
    }

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12
      zoomAt(relX(e.clientX), relY(e.clientY), factor)
    }

    stage.addEventListener("pointerdown", onPointerDown)
    stage.addEventListener("pointermove", onPointerMove)
    stage.addEventListener("pointerup", clearPt)
    stage.addEventListener("pointercancel", clearPt)
    stage.addEventListener("wheel", onWheel, { passive: false })

    const onResize = () => apply()
    window.addEventListener("resize", onResize)

    // Initial layout (rect is available now that we've mounted + painted).
    apply()

    return () => {
      stage.removeEventListener("pointerdown", onPointerDown)
      stage.removeEventListener("pointermove", onPointerMove)
      stage.removeEventListener("pointerup", clearPt)
      stage.removeEventListener("pointercancel", clearPt)
      stage.removeEventListener("wheel", onWheel)
      window.removeEventListener("resize", onResize)
    }
  }, [apply, zoomAt])

  const monoFont =
    "var(--font-space-mono), 'Space Mono', ui-monospace, SFMono-Regular, Menlo, monospace"

  return (
    <div
      ref={stageRef}
      className="absolute inset-0 overflow-hidden"
      style={{ touchAction: "none", cursor: "grab", userSelect: "none" }}
    >
      {/* ===== The universe layer: everything here pans + zooms ===== */}
      <div
        ref={universeRef}
        aria-hidden="true"
        className="absolute left-0 top-0"
        style={{ width: 0, height: 0, transformOrigin: "0 0", willChange: "transform" }}
      >
        {/* Parallaxing starfield, scattered across world space */}
        {stars.map((s, i) => (
          <span
            key={`star-${i}`}
            className="animate-twinkle absolute rounded-full bg-foreground"
            style={{
              left: s.x,
              top: s.y,
              width: s.size,
              height: s.size,
              opacity: s.opacity,
              transform: "translate(-50%, -50%)",
              // @ts-expect-error custom property consumed by the twinkle keyframes
              "--twinkle-duration": s.duration,
              animationDelay: s.delay,
            }}
          />
        ))}

        {/* Spiral arm — a trail of pulsating glyphs winding out from the core */}
        {glyphs.map((g) => (
          <span
            key={`glyph-${g.key}`}
            className="animate-glyph-pulse absolute select-none"
            style={{
              left: g.x,
              top: g.y,
              fontFamily: monoFont,
              fontSize: g.size,
              lineHeight: 1,
              color: "oklch(0.62 0 0)",
              transform: "translate(-50%, -50%)",
              // @ts-expect-error custom property consumed by the pulse keyframes
              "--glyph-max": g.max,
              animationDelay: `${g.delay}s`,
            }}
          >
            {g.char}
          </span>
        ))}

        {/* Placeholder object markers, positioned in world coordinates */}
        {MARKERS.map((m) => (
          <div
            key={m.label}
            className="absolute flex flex-col items-center"
            style={{ left: m.x, top: m.y, transform: "translate(-50%, -50%)" }}
          >
            <span
              className="flex size-8 items-center justify-center rounded-full text-[10px]"
              style={{
                border: `1px solid ${m.color}`,
                color: m.color,
                boxShadow: `0 0 10px ${m.color}`,
              }}
            >
              {m.glyph}
            </span>
            <span
              className="mt-1.5 text-[11px] tracking-widest"
              style={{ fontFamily: monoFont, color: "#9a9a9a" }}
            >
              {m.label}
            </span>
          </div>
        ))}
      </div>

      {/* ===== Pinned avatar: a separate layer, never transformed ===== */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
        style={{ width: 230, height: 230 }}
      >
        {/* Dark radial backdrop so the core reads cleanly over the glyph trail */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            width: 230,
            height: 230,
            background:
              "radial-gradient(circle, var(--background) 30%, color-mix(in oklch, var(--background) 70%, transparent) 58%, color-mix(in oklch, var(--background) 35%, transparent) 78%, transparent 100%)",
          }}
        />
        <div className="relative flex h-full w-full items-center justify-center overflow-hidden">
          <SelfAvatar mood={mood} growth={growth} size={230} />
        </div>
        {/* Tap target over the face → opens the chart read sheet */}
        {onSelectSelf && (
          <button
            type="button"
            onClick={onSelectSelf}
            aria-label="Read your chart"
            className="pointer-events-auto absolute left-1/2 top-1/2 size-36 -translate-x-1/2 -translate-y-1/2 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        )}
      </div>

      {/* ===== HUD ===== */}
      <p
        className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 text-[10px] uppercase tracking-[0.3em] text-muted-foreground/40"
        style={{ fontFamily: monoFont }}
      >
        Drag to move · scroll / pinch to zoom
      </p>

      <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2">
        <HudButton
          label="Zoom out"
          onClick={() => zoomAt(stageRef.current!.clientWidth / 2, stageRef.current!.clientHeight / 2, 1 / 1.25)}
        >
          −
        </HudButton>
        <span
          className="min-w-14 text-center text-[10px] tracking-widest text-muted-foreground/60"
          style={{ fontFamily: monoFont }}
        >
          {zoomPct}%
        </span>
        <HudButton
          label="Zoom in"
          onClick={() => zoomAt(stageRef.current!.clientWidth / 2, stageRef.current!.clientHeight / 2, 1.25)}
        >
          +
        </HudButton>
        <button
          type="button"
          onClick={reset}
          className="h-9 rounded-lg px-3 text-[10px] uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
          style={{ fontFamily: monoFont, backgroundColor: "#0d0d0d", border: "1px solid #262626" }}
        >
          Reset
        </button>
      </div>
    </div>
  )
}

function HudButton({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex size-9 items-center justify-center rounded-lg text-base text-muted-foreground transition-colors hover:text-foreground"
      style={{
        fontFamily: "var(--font-space-mono), 'Space Mono', ui-monospace, monospace",
        backgroundColor: "#0d0d0d",
        border: "1px solid #262626",
      }}
    >
      {children}
    </button>
  )
}
