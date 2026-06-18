"use client"

import { useMemo } from "react"
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
const MIN_T = 0.55
const MAX_T = 0.7

// Glyph-trail sampling. Shared by the arm and the person placement so each
// person can claim an exact glyph index on the curve.
const GLYPH_STEPS = 230
const GLYPH_T_START = 0.04
const GLYPH_T_END = 1.85
// Marker glyph used for a person's claimed spot on the arm.
const PERSON_GLYPH = "✦"

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
  glyphIndex: number
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
    const steps = GLYPH_STEPS
    const start = GLYPH_T_START
    const end = GLYPH_T_END
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
      // Gradient the arm OUT from the center: it stays fully black (invisible)
      // through the avatar's region, then ramps up to grey only once it gets a
      // bit past the avatar — so the spiral emerges out of darkness instead of
      // needing a hard backdrop to hide its center.
      const centerFade = Math.min(1, Math.max(0, (t - 0.4) / 0.32))
      const glyphMax = (0.16 + Math.min(t, 1) * 0.34) * centerFade
      // Negative, staggered delay makes a band of brightness travel outward.
      const delay = -((i * 0.07) % 3.2)
      glyphs.push({ x, y, char, size, glyphMax, delay })
    }
    return glyphs
  }, [])

  // Distribute people along the arm by claiming a glyph index on the trail:
  // closer to center = smaller t. Each person's marker IS the spiral glyph at
  // that index, recolored to their color. Snapping the HTML name overlay to the
  // glyph's exact index position keeps the label aligned with the glow.
  const placed = useMemo<PlacedPerson[]>(() => {
    const n = people.length
    return people.map((person, i) => {
      const t = n === 1 ? 0.58 : MIN_T + (MAX_T - MIN_T) * (i / (n - 1))
      const glyphIndex = Math.round(
        ((t - GLYPH_T_START) / (GLYPH_T_END - GLYPH_T_START)) * GLYPH_STEPS,
      )
      const tt = GLYPH_T_START + (GLYPH_T_END - GLYPH_T_START) * (glyphIndex / GLYPH_STEPS)
      const { x, y } = spiralPoint(tt)
      return { person, x, y, color: colorById.get(person.id) ?? YOU_COLOR, glyphIndex }
    })
  }, [people, colorById])

  // Glyph index -> person/color, so the trail can recolor claimed glyphs.
  const personByGlyph = useMemo(() => {
    const map = new Map<number, { person: Person; color: string }>()
    for (const p of placed) map.set(p.glyphIndex, { person: p.person, color: p.color })
    return map
  }, [placed])

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
          {spiralGlyphs.map((g, i) => {
            const owner = personByGlyph.get(i)
            if (owner) {
              // This glyph belongs to a person: a dark halo lifts it off the
              // busy trail, then their colored, gently glowing marker on top.
              return (
                <g key={i}>
                  <circle cx={g.x} cy={g.y} r={12} fill="var(--background)" opacity={0.7} />
                  <text
                    x={g.x}
                    y={g.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={owner.color}
                    style={{
                      fontSize: 28,
                      fontFamily: "var(--font-space-mono), ui-monospace, monospace",
                      filter: `drop-shadow(0 0 5px ${owner.color}) drop-shadow(0 0 10px ${owner.color})`,
                    }}
                  >
                    {PERSON_GLYPH}
                  </text>
                </g>
              )
            }
            return (
              <text
                key={i}
                x={g.x}
                y={g.y}
                textAnchor="middle"
                dominantBaseline="central"
                fill="oklch(0.62 0 0)"
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
            )
          })}
        </svg>

        {/* People: the colored glyph itself (rendered in the SVG) is the marker.
            Here we overlay a click target on that glyph and the person's name
            beside it, flipped to whichever side faces away from the center. */}
        {placed.map(({ person, x, y }) => {
          const onRight = x >= CENTER
          return (
            <button
              key={person.id}
              onClick={() => onSelect(person)}
              className="group absolute z-[2] -translate-x-1/2 -translate-y-1/2"
              style={{ left: pct(x), top: pct(y) }}
              aria-label={`View ${person.name}`}
            >
              {/* Hit area centered on the glyph */}
              <span className="block size-7 rounded-full" />
              {/* Name beside the glyph, on the outward-facing side */}
              <span
                className={`pointer-events-none absolute top-1/2 max-w-24 -translate-y-1/2 truncate font-serif text-xs text-foreground/85 transition-colors group-hover:text-foreground ${
                  onRight ? "left-full ml-1 text-left" : "right-full mr-1 text-right"
                }`}
              >
                {person.name}
              </span>
            </button>
          )
        })}

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
      {/* No hard backdrop: the spiral glyphs gradient out toward the center
          (see centerFade), so the avatar already sits in a naturally clear
          space without a black circle covering the names. */}
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
