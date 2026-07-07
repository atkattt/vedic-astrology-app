"use client"

import { useEffect, useState } from "react"
import SwirlCloudSky from "@/components/SwirlCloudSky"
import AsciiRippleSky from "@/components/AsciiRippleSky"
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

// Solid-black accent to match the onboarding glass aesthetic (black text on a
// translucent grey card — no glow). Reused for emphasis words and the CTA.
const glowText = { color: "#000" }

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
    <main className="relative min-h-[100dvh] overflow-y-auto">
      {/* Faint blueprint grid behind the sky layers — matches /onboarding. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* Same animated sky field as /onboarding and the welcome screen:
          clouds (z-0) behind the ASCII ripple (z-1), sharing one wave. */}
      <SwirlCloudSky />
      <AsciiRippleSky />

      {/* Sticky hero — stays pinned while the story scrolls beneath it. */}
      <div className="sticky top-0 z-20 flex flex-col items-center px-6 pb-10 pt-16">
        <div className="relative z-10 flex flex-col items-center">
          {/* Spiral drawn in ASCII — matches the SelfAvatar glyph palette,
              winding infinitely inward into a dark core. */}
          <AsciiSpiral size={150} />

          {/* Cycling status line — shows the loading stages, or the error
              message if the read faltered. On success it stays empty (no
              "found you" label). */}
          <p
            className="mt-6 h-4 text-[11px] uppercase tracking-[0.25em] transition-colors"
            style={{ fontFamily: '"Geist Mono", sans-serif', color: "#1a1a1a" }}
            aria-live="polite"
          >
            {ready ? (
              error ? (
                <span style={{ ...glowText, fontWeight: 600 }}>
                  {"\u2726 the read faltered"}
                </span>
              ) : null
            ) : (
              STAGES[stage]
            )}
          </p>

          {/* Thin loading bar with a travelling dark sweep. Hidden entirely once
              the read is ready so no solid line remains under the status. */}
          {!ready && (
            <div className="relative mt-5 h-px w-44 overflow-hidden bg-black/20">
              <div
                className="animate-bar-sweep absolute inset-y-0 w-1/4"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, rgba(0,0,0,0.7), transparent)",
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Scrollable story body */}
      <div className="relative z-10 mx-auto max-w-md px-7 pb-44">
        <StoryReadCards />
      </div>

      {/* The handoff CTA — fixed at the bottom, fades/rises in only when the
          read finishes. It waits; it never forces the transition. */}
      {ready && (
        <>
          {/* Frosted glass shelf — kept in its OWN fixed element, OUTSIDE the
              animated CTA wrapper below. The rise-in animation applies a
              `transform` to its host, and a transformed ancestor disables
              `backdrop-filter` on descendants, so the shelf must not live
              inside it. Two layers because combining `mask-image` with
              `backdrop-filter` also disables the blur in Chrome/Safari. */}
          <div
            aria-hidden="true"
            className="pointer-events-none fixed inset-x-0 bottom-0 z-20 h-56"
          >
            {/* Layer 1: the actual backdrop blur — no mask, so it truly applies
                and the story sliding behind it becomes a soft haze. */}
            <div
              className="absolute inset-x-0 bottom-0 top-16"
              style={{
                backdropFilter: "blur(24px) saturate(140%)",
                WebkitBackdropFilter: "blur(24px) saturate(140%)",
              }}
            />
            {/* Layer 2: a frosted tint that fades out toward the top so the
                shelf blends into the story above. */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to top, rgba(198,200,206,0.72), rgba(190,192,198,0.5) 45%, rgba(180,182,190,0.16) 85%, transparent)",
              }}
            />
          </div>

          <div className="animate-rise-in fixed inset-x-0 bottom-0 z-30 flex flex-col items-center px-6 pb-8 pt-20">
          <button
            onClick={onEnter}
            className="relative z-10 rounded-full border px-9 py-3.5 text-xs uppercase tracking-[0.25em] transition-transform active:scale-95"
            style={{
              ...glowText,
              fontFamily: '"Geist Mono", sans-serif',
              borderColor: "#000",
              // Transparent pill — the frosted glass shelf beneath supplies the
              // backdrop, so the story text never shows through the label.
              background: "transparent",
            }}
          >
            {"enter the spiral \u23CE"}
          </button>
          {error ? (
            <p
              className="relative z-10 mt-3 max-w-xs text-center text-[10px] normal-case leading-relaxed tracking-[0.15em]"
              style={{ fontFamily: '"Geist Mono", sans-serif', color: "#7f1d1d" }}
            >
              {error}
            </p>
          ) : (
            <p
              className="relative z-10 mt-3 text-[10px] uppercase tracking-[0.25em]"
              style={{ fontFamily: '"Geist Mono", sans-serif', color: "#2a2a2a" }}
            >
              your chart is ready
            </p>
          )}
          </div>
        </>
      )}
    </main>
  )
}
