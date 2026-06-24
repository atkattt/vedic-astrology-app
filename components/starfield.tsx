"use client"

import { useMemo } from "react"

type Star = {
  top: string
  left: string
  size: number
  delay: string
  duration: string
  opacity: number
}

/**
 * A field of faint, gently twinkling stars rendered behind all content.
 * Deterministic per `count` so it stays stable across renders.
 */
export function Starfield({
  count = 80,
  className = "pointer-events-none fixed inset-0 overflow-hidden animate-drift",
}: {
  count?: number
  className?: string
}) {
  const stars = useMemo<Star[]>(() => {
    // Seeded pseudo-random for stable positions.
    let seed = 7
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280
      return seed / 233280
    }
    return Array.from({ length: count }).map(() => ({
      top: `${rand() * 100}%`,
      left: `${rand() * 100}%`,
      size: rand() < 0.85 ? 1 : 2,
      delay: `${rand() * 6}s`,
      duration: `${3 + rand() * 5}s`,
      opacity: 0.3 + rand() * 0.5,
    }))
  }, [count])

  return (
    <div aria-hidden="true" className={className}>
      {/* Subtle radial deepening toward the edges */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,oklch(0.12_0.02_275)_100%)]" />
      {stars.map((s, i) => (
        <span
          key={i}
          className="animate-twinkle absolute rounded-full bg-foreground"
          style={{
            top: s.top,
            left: s.left,
            width: s.size,
            height: s.size,
            opacity: s.opacity,
            // @ts-expect-error custom property
            "--twinkle-duration": s.duration,
            animationDelay: s.delay,
          }}
        />
      ))}
    </div>
  )
}
