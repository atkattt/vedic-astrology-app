"use client"

import { useEffect, useState } from "react"
import { Starfield } from "@/components/starfield"
import { StoryReadCards } from "@/components/threshold/story-read-cards"
import AsciiSpiral from "@/components/threshold/ascii-spiral"
import {
  BIRTH_DATA_KEY,
  BIRTH_NORMALIZED_KEY,
  CHART_KEY,
  normalizeBirthData,
  type RawBirthData,
} from "@/lib/birth-data"

// The loading stages cycle while the chart "reads". Later this list will be
// driven by the real engine; for now it's a timed simulation (~4.5s total).
const STAGES = [
  "reading your chart…",
  "placing the planets…",
  "tracing your dasha…",
  "drawing the spiral…",
]

// Glowing-white accent — never gold. Reused for emphasis words and the CTA.
const glowText = { color: "#f5f5f5", textShadow: "0 0 10px rgba(255,255,255,0.45)" }

export default function ThresholdScreen({ onEnter }: { onEnter: () => void }) {
  const [stage, setStage] = useState(0)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const timers: ReturnType<typeof setTimeout>[] = []
    // Advance through each stage every ~1.1s for the ritual's pacing.
    STAGES.forEach((_, i) => {
      timers.push(setTimeout(() => !cancelled && setStage(i), i * 1100))
    })

    // A minimum on-screen time so a fast read still feels like a "reading"
    // rather than a flash.
    const minDelay = new Promise<void>((res) => setTimeout(res, 4500))

    // The real "read": normalize the onboarding answers, geocode the birth
    // place, then ask the chart engine (the brain) to compute the chart.
    async function computeChart() {
      try {
        const rawStr = sessionStorage.getItem(BIRTH_DATA_KEY)
        if (!rawStr) {
          throw new Error("we lost your birth details — begin again")
        }
        const raw = JSON.parse(rawStr) as RawBirthData
        const norm = normalizeBirthData(raw)

        if (!norm.place) throw new Error("we need your birth place to read the sky")

        const geoRes = await fetch(
          `/api/geocode?q=${encodeURIComponent(norm.place)}`,
        )
        const geo = await geoRes.json()
        if (!geoRes.ok) {
          throw new Error(geo.error || "couldn't place your birth city")
        }

        const chartRes = await fetch("/api/chart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: norm.date,
            time: norm.time,
            lat: geo.lat,
            lng: geo.lng,
            timezone: geo.timezone,
          }),
        })
        const chart = await chartRes.json()
        if (!chartRes.ok) {
          throw new Error(chart.error || "the sky wouldn't read")
        }

        // Stash the computed chart + resolved location so the account step and
        // the spiral can use them.
        sessionStorage.setItem(
          BIRTH_NORMALIZED_KEY,
          JSON.stringify({
            ...norm,
            placeName: geo.name,
            country: geo.country,
            lat: geo.lat,
            lng: geo.lng,
            timezone: geo.timezone,
          }),
        )
        sessionStorage.setItem(CHART_KEY, JSON.stringify(chart))
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "the read failed")
        }
      }
    }

    // Reveal the CTA once both the minimum time and the real computation finish.
    Promise.all([computeChart(), minDelay]).then(() => {
      if (!cancelled) setReady(true)
    })

    return () => {
      cancelled = true
      timers.forEach(clearTimeout)
    }
  }, [])

  return (
    <main className="relative min-h-[100dvh] overflow-y-auto bg-background">
      <Starfield count={70} />

      {/* Sticky hero — stays pinned while the story scrolls beneath it. */}
      <div className="sticky top-0 z-20 flex flex-col items-center px-6 pb-10 pt-16">
        {/* A subtle black wash so the scrolling story passes cleanly under. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background via-background to-transparent"
        />

        <div className="relative z-10 flex flex-col items-center">
          {/* Spiral drawn in ASCII — matches the SelfAvatar glyph palette,
              winding infinitely inward into a dark core. */}
          <AsciiSpiral size={150} />

          {/* Cycling status line */}
          <p
            className="mt-6 h-4 font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground transition-colors"
            aria-live="polite"
          >
            {ready ? (
              <span style={glowText}>
                {error ? "\u2726 the read faltered" : "\u2726 found you"}
              </span>
            ) : (
              STAGES[stage]
            )}
          </p>

          {/* Thin loading bar with a travelling light sweep */}
          <div className="relative mt-5 h-px w-44 overflow-hidden bg-foreground/15">
            {ready ? (
              <div
                className="h-full w-full"
                style={{
                  background: "#f5f5f5",
                  boxShadow: "0 0 12px rgba(255,255,255,0.6)",
                }}
              />
            ) : (
              <div
                className="animate-bar-sweep absolute inset-y-0 w-1/4"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, rgba(255,255,255,0.85), transparent)",
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Scrollable story body */}
      <div className="relative z-10 mx-auto max-w-md px-7 pb-44">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground/70">
          While the sky reads you
        </p>

        <StoryReadCards />
      </div>

      {/* The handoff CTA — fixed at the bottom, fades/rises in only when the
          read finishes. It waits; it never forces the transition. */}
      {ready && (
        <div className="animate-rise-in fixed inset-x-0 bottom-0 z-30 flex flex-col items-center px-6 pb-8 pt-10">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background via-background/90 to-transparent"
          />
          <button
            onClick={onEnter}
            className="relative z-10 rounded-full border px-9 py-3.5 font-mono text-xs uppercase tracking-[0.25em] transition-transform active:scale-95"
            style={{
              ...glowText,
              borderColor: "rgba(255,255,255,0.55)",
              boxShadow: "0 0 24px rgba(255,255,255,0.12)",
            }}
          >
            {"enter the spiral \u23CE"}
          </button>
          {error ? (
            <p className="relative z-10 mt-3 max-w-xs text-center font-mono text-[10px] normal-case leading-relaxed tracking-[0.15em] text-destructive">
              {error}
            </p>
          ) : (
            <p className="relative z-10 mt-3 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              your chart is ready
            </p>
          )}
        </div>
      )}
    </main>
  )
}
