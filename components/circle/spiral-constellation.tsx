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
// People live in the ring OUTSIDE the central avatar (which occupies the inner
// ~90px radius). These t bounds keep every node clear of the avatar backdrop.
const MIN_T = 0.6
const MAX_T = 0.95

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
  // The spiral arm as ONE continuous, thin, luminous SVG path winding outward.
  // It starts near the center (hidden behind the avatar backdrop) and spirals
  // out through the ring where the people sit.
  const spiralPath = useMemo(() => {
    const steps = 280
    const start = 0.05
    let d = ""
    for (let i = 0; i <= steps; i++) {
      const t = start + (1 - start) * (i / steps)
      const { x, y } = spiralPoint(t)
      d += i === 0 ? `M ${x.toFixed(2)} ${y.toFixed(2)}` : ` L ${x.toFixed(2)} ${y.toFixed(2)}`
    }
    return d
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

  const placedById = useMemo(() => {
    const map = new Map<number, PlacedPerson>()
    for (const p of placed) map.set(p.person.id, p)
    return map
  }, [placed])

  // Bonds: faint colored lines between two placed nodes. A bond takes the
  // color of its "from" person so it reads as belonging to them.
  const bonds = useMemo(() => {
    return relationships
      .map((r) => {
        const from = placedById.get(r.fromPersonId)
        const to = placedById.get(r.toPersonId)
        if (!from || !to) return null
        return { id: r.id, from, to, color: from.color }
      })
      .filter((x): x is { id: number; from: PlacedPerson; to: PlacedPerson; color: string } => x !== null)
  }, [relationships, placedById])

  return (
    <div className="flex h-full items-center justify-center px-2">
      <div className="relative aspect-square w-full max-w-[22rem]">
        {/* Spiral arm (one continuous luminous line) + bond lines.
            Sits just above the starfield (z-1), beneath the avatar. */}
        <svg
          viewBox={`0 0 ${VIEW} ${VIEW}`}
          className="absolute inset-0 z-[1] h-full w-full overflow-visible"
          aria-hidden="true"
        >
          {bonds.map((b) => (
            <line
              key={b.id}
              x1={b.from.x}
              y1={b.from.y}
              x2={b.to.x}
              y2={b.to.y}
              stroke={b.color}
              strokeWidth={1.2}
              strokeDasharray="2 7"
              strokeLinecap="round"
              className="animate-bond-in"
              style={{ ["--bond-opacity" as string]: "0.45", opacity: 0.45 }}
            />
          ))}
          <path
            d={spiralPath}
            fill="none"
            stroke="oklch(0.97 0 0)"
            strokeOpacity={0.28}
            strokeWidth={1.4}
            strokeLinecap="round"
            style={{ filter: "drop-shadow(0 0 3px oklch(0.97 0 0 / 0.35))" }}
          />
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
          width: 180,
          height: 180,
          background:
            "radial-gradient(circle, var(--background) 55%, color-mix(in oklch, var(--background) 60%, transparent) 78%, transparent 100%)",
        }}
      />
      {/* The avatar, constrained to a fixed 150x150 box so it can never sprawl
          into the surrounding ring. Sits on top of everything (z-3). */}
      <div
        className="relative z-[3] flex items-center justify-center overflow-hidden"
        style={{ width: 150, height: 150 }}
      >
        <SelfAvatar mood={mood} growth={growth} size={150} />
      </div>
    </div>
  )
}
