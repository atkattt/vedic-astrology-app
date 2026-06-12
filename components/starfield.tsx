'use client'

import { useMemo } from 'react'

type Star = {
  id: number
  top: string
  left: string
  size: number
  delay: string
  duration: string
  opacity: number
}

// A deterministic pseudo-random generator so the field is stable per `count`
// and doesn't cause hydration mismatches.
function seededStars(count: number): Star[] {
  const stars: Star[] = []
  let seed = 7
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280
    return seed / 233280
  }
  for (let i = 0; i < count; i++) {
    stars.push({
      id: i,
      top: `${rand() * 100}%`,
      left: `${rand() * 100}%`,
      size: rand() < 0.85 ? 1 : 2,
      delay: `${rand() * 6}s`,
      duration: `${4 + rand() * 6}s`,
      opacity: 0.15 + rand() * 0.5,
    })
  }
  return stars
}

export function Starfield({ count = 90 }: { count?: number }) {
  const stars = useMemo(() => seededStars(count), [count])

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 overflow-hidden"
    >
      {stars.map((star) => (
        <span
          key={star.id}
          className="absolute rounded-full bg-foreground"
          style={{
            top: star.top,
            left: star.left,
            width: star.size,
            height: star.size,
            opacity: star.opacity,
            animation: `twinkle ${star.duration} ease-in-out ${star.delay} infinite`,
          }}
        />
      ))}
    </div>
  )
}
