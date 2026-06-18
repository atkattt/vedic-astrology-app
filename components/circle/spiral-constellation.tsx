"use client"

import { useMemo } from "react"
import { Star } from "lucide-react"
import type { Person, Relationship } from "@/lib/db/schema"
import { YOU_COLOR } from "@/lib/circle/colors"
import SelfAvatar, { type Mood } from "@/components/circle/SelfAvatar"

// Spiral geometry, expressed in a 400x400 SVG viewBox. Because the container is
// kept square, viewBox coordinates map 1:1 to percentage offsets for the HTML
// nodes layered on top (x / VIEW * 100).
const VIEW = 400
const CENTER = VIEW / 2
const MAX_R = 190 // outermost radius, leaves room for labels
const TURNS = 2.6 // how many revolutions the arm makes
// People live in the ring OUTSIDE the central avatar (whose 195px box +
// backdrop occupy the inner ~120px radius). These t bounds keep every node
// clear of the enlarged avatar.
const MIN_T = 0.72
const MAX_T = 0.97

// A point on an Archimedean spiral (r grows linearly with angle) for t in 0..1.
function spiralPoint(t: number) {
  const theta = t * TURNS * Math.PI * 2
  const r = MAX_R * t
  return {
    x: CENTER + r * Math.cos(theta),
    y: CENTER + r * Math.sin(theta),
  }
}

function pct(value: number) {
  return `${(value / VIEW) * 100}%`
}

type PlacedPerson = {
  person: Person
  x: number
  y: number
  color: string
}

export function SpiralConstellation({
  people,
  relationships,
  colorById,
  onSelect,
  mood = "idle",
}: {
  people: Person[]
  relationships: Relationship[]
  colorById: Map<number, string>
  onSelect: (person: Person) => void
  mood?: Mood
}) {
  // The spiral arm as a trail of ASCII glyphs (only + * ✦) winding outward.
  // Sampling starts right at the center (behind the avatar backdrop) so the arm
  // seamlessly emerges from the avatar, and runs past t=1 so the spiral spills
  // beyond the container edges — reading as if it goes on infinitely.
  const spiralGlyphs = useMemo(() => {
    const steps = 230
    const start = 0.04
    const end = 1.85
    const chars = ["+", "*", "✦"]
    const glyphs: {
      x: number
      y: number
      char: string
      size: number
      glyphMax: number
      delay: number
    }[] = []
    for (let i = 0; i <= steps; i++) {
      const t = start + (end - start) * (i / steps)
      const { x, y } = spiralPoint(t)
      const char = chars[i % chars.length]
      // Glyphs grow toward the outer edge; brightness peaks mid-arm and eases
      // off far out so the infinite tail fades into the dark.
      const size = 7 + Math.min(t, 1.4) * 9
      const glyphMax = 0.16 + Math.min(t, 1) * 0.34
      // Negative, staggered delay makes a band of brightness travel outward.
      const delay = -((i * 0.07) % 3.2)
      glyphs.push({ x, y, char, size, glyphMax, delay })
    }
    return glyphs
  }, [])

  // Distribute people along the arm: closer to center = smaller t.
  const placed = useMemo<PlacedPerson[]>(() => {
    const n = people.length
    return people.map((person, i) => {
      const t = n === 1 ? 0.78 : MIN_T + (MAX_T - MIN_T) * (i / (n - 1))
      const { x, y } = spiralPoint(t)
      return { person, x, y, color: colorById.get(person.id) ?? YOU_COLOR }
    })
  }, [people, colorById])

  return (
    <div className="flex h-full items-center justify-center px-2">
      <div className="relative aspect-square w-full max-w-[22rem]">
        {/* Spiral arm — a trail of pulsating ASCII glyphs winding outward.
            Sits just above the starfield (z-1), beneath the avatar. */}
        <svg
          viewBox={`0 0 ${VIEW} ${VIEW}`}
          className="absolute inset-0 z-[1] h-full w-full overflow-visible"
          aria-hidden="true"
        >
          {spiralGlyphs.map((g, i) => (
            <text
              key={i}
              x={g.x}
              y={g.y}
              textAnchor="middle"
              dominantBaseline="central"
              fill="oklch(0.97 0 0)"
              className="animate-glyph-pulse"
              style={{
                fontSize: g.size,
                fontFamily: "var(--font-space-mono), ui-monospace, monospace",
                ["--glyph-max" as string]: g.glyphMax,
                animationDelay: `${g.delay}s`,
              }}
            >
              {g.char}
            </text>
          ))}
        </svg>

        {/* People nodes, placed ON the spiral curve in the outer ring (z-1) */}
        {placed.map(({ person, x, y, color }) => (
          <button
            key={person.id}
            onClick={() => onSelect(person)}
            className="group absolute z-[1] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5"
            style={{ left: pct(x), top: pct(y) }}
            aria-label={`View ${person.name}`}
          >
            <span className="relative flex items-center justify-center">
              <span
                className="absolute size-6 rounded-full blur-md transition-opacity group-hover:opacity-90"
                style={{ backgroundColor: color, opacity: 0.4 }}
              />
              <Star
                className="relative size-3 transition-transform group-hover:scale-125"
                style={{ color, fill: color, filter: `drop-shadow(0 0 5px ${color})` }}
              />
            </span>
            <span className="max-w-20 truncate font-serif text-xs text-foreground/90 transition-colors group-hover:text-foreground">
              {person.name}
            </span>
          </button>
        ))}

        {/* Center: the expressive ASCII "you", large and on top of the spiral */}
        <YouNode mood={mood} growth={Math.min(1, 0.35 + people.length * 0.1)} />
      </div>
    </div>
  )
}

function YouNode({ mood, growth }: { mood: Mood; growth: number }) {
  return (
    <div
      className="pointer-events-none absolute z-[2]"
      style={{ left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}
    >
      {/* Circular backdrop: punches a calm "hole" in the busy field behind the
          avatar so it reads cleanly. Sits above the spiral (z-2). */}
      <div
        className="absolute left-1/2 top-1/2 z-[2] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          width: 234,
          height: 234,
          background:
            "radial-gradient(circle, var(--background) 55%, color-mix(in oklch, var(--background) 60%, transparent) 78%, transparent 100%)",
        }}
      />
      {/* The avatar, constrained to a fixed 195x195 box so it can never sprawl
          into the surrounding ring. Sits on top of everything (z-3). */}
      <div
        className="relative z-[3] flex items-center justify-center overflow-hidden"
        style={{ width: 195, height: 195 }}
      >
        <SelfAvatar mood={mood} growth={growth} size={195} />
      </div>
    </div>
  )
}
