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
const MAX_R = 178 // outermost radius, leaves room for labels
const TURNS = 3.1 // how many revolutions the arm makes
const MIN_T = 0.34 // first person sits clear of the central avatar
const MAX_T = 1

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
  // The spiral arm, drawn as a trail of ASCII characters + glyphs placed along
  // the curve. Sampling starts a little out from the center so the glyphs never
  // collide with the avatar. Characters and sizes vary along the arm to give it
  // texture, with occasional ꩜ spirals and ✦ stars among the faint dots.
  const spiralGlyphs = useMemo(() => {
    const steps = 150
    const start = 0.14 // skip the dense center where the avatar sits
    const glyphs: { x: number; y: number; char: string; size: number; opacity: number }[] = []
    for (let i = 0; i <= steps; i++) {
      const t = start + (1 - start) * (i / steps)
      const { x, y } = spiralPoint(t)
      let char = "·"
      if (i % 11 === 0) char = "꩜"
      else if (i % 7 === 0) char = "✦"
      else if (i % 3 === 0) char = "*"
      else if (i % 2 === 0) char = "+"
      // Glyphs grow and brighten slightly toward the outer edge.
      const size = 7 + t * 12
      const opacity = 0.22 + t * 0.3
      glyphs.push({ x, y, char, size, opacity })
    }
    return glyphs
  }, [])

  // Distribute people along the arm: closer to center = smaller t.
  const placed = useMemo<PlacedPerson[]>(() => {
    const n = people.length
    return people.map((person, i) => {
      const t = n === 1 ? 0.55 : MIN_T + (MAX_T - MIN_T) * (i / (n - 1))
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
    <div className="flex h-full items-center justify-center px-6">
      <div className="relative aspect-square w-full max-w-[20rem]">
        {/* Spiral arm + bond lines */}
        <svg
          viewBox={`0 0 ${VIEW} ${VIEW}`}
          className="absolute inset-0 h-full w-full overflow-visible"
          aria-hidden="true"
        >
          <path
            d={spiralPath}
            fill="none"
            stroke="oklch(0.97 0 0)"
            strokeOpacity={0.12}
            strokeWidth={1}
            strokeLinecap="round"
          />
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
        </svg>

        {/* Center: "You" — an expressive ASCII avatar layered over the glow */}
        <YouNode mood={mood} growth={Math.min(1, 0.35 + people.length * 0.1)} />

        {/* People along the arm */}
        {placed.map(({ person, x, y, color }) => (
          <button
            key={person.id}
            onClick={() => onSelect(person)}
            className="group absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5"
            style={{ left: pct(x), top: pct(y) }}
            aria-label={`View ${person.name}`}
          >
            <span className="relative flex items-center justify-center">
              <span
                className="absolute size-8 rounded-full blur-md transition-opacity group-hover:opacity-90"
                style={{ backgroundColor: color, opacity: 0.45 }}
              />
              <span
                className="relative size-3 rounded-full transition-transform group-hover:scale-125"
                style={{ backgroundColor: color, boxShadow: `0 0 12px 2px ${color}` }}
              />
            </span>
            <span className="max-w-24 truncate font-serif text-sm text-foreground/90 transition-colors group-hover:text-foreground">
              {person.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

function YouNode({ mood, growth }: { mood: Mood; growth: number }) {
  return (
    <div
      className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5"
      style={{ left: "50%", top: "50%" }}
    >
      <span className="relative flex size-20 items-center justify-center">
        {/* Soft glow behind the avatar */}
        <span
          className="animate-star-glow absolute size-16 rounded-full blur-xl"
          style={{ backgroundColor: YOU_COLOR, opacity: 0.4 }}
        />
        {/* The expressive ASCII "you", driven by the current mood */}
        <SelfAvatar mood={mood} growth={growth} size={80} />
      </span>
      <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-foreground/80">
        You
      </span>
    </div>
  )
}
