"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  BIRTH_DATA_KEY,
  BIRTH_NORMALIZED_KEY,
  CHART_KEY,
} from "@/lib/birth-data"
import {
  ensureUserChart,
  persistBirthChart,
} from "@/app/actions/birth-chart"

type StoredNormalized = {
  date: string
  time: string
  place: string
  placeName?: string
  country?: string
  lat?: number
  lng?: number
  timezone?: string
}

/**
 * Runs once when an authenticated user lands in the spiral. If the onboarding
 * ritual stashed a computed chart in sessionStorage, it persists that chart to
 * the user's profile server-side and clears the temporary keys. Otherwise it
 * asks the server to ensure a chart exists (recomputing from stored birth data,
 * or routing to /onboarding when the profile still holds placeholder data).
 *
 * Renders nothing.
 */
export function BirthChartBootstrap() {
  const router = useRouter()
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    async function run() {
      let normalized: StoredNormalized | null = null
      let chart: {
        planets: unknown
        ascendant: unknown
        houses: unknown
        dashas: unknown
      } | null = null

      try {
        // localStorage first (survives new-tab sign-in flows like the email
        // confirm link or OAuth); sessionStorage as a legacy fallback.
        const rawNorm =
          localStorage.getItem(BIRTH_NORMALIZED_KEY) ??
          sessionStorage.getItem(BIRTH_NORMALIZED_KEY)
        const rawChart =
          localStorage.getItem(CHART_KEY) ?? sessionStorage.getItem(CHART_KEY)
        if (rawNorm && rawChart) {
          normalized = JSON.parse(rawNorm)
          chart = JSON.parse(rawChart)
        }
      } catch {
        normalized = null
        chart = null
      }

      // A fresh chart is waiting from onboarding — persist it.
      if (
        normalized &&
        chart &&
        typeof normalized.lat === "number" &&
        typeof normalized.lng === "number" &&
        normalized.timezone
      ) {
        const place =
          normalized.placeName && normalized.country
            ? `${normalized.placeName}, ${normalized.country}`
            : normalized.placeName || normalized.place

        const res = await persistBirthChart({
          birth: {
            date: normalized.date,
            time: normalized.time,
            place,
            lat: normalized.lat,
            lng: normalized.lng,
            timezone: normalized.timezone,
          },
          chart: {
            planets: chart.planets as never,
            ascendant: chart.ascendant as never,
            houses: chart.houses as never,
            dashas: chart.dashas as never,
          },
        })

        // Only clear on success so a transient failure can retry next load.
        if (res.status === "saved") {
          for (const key of [BIRTH_DATA_KEY, BIRTH_NORMALIZED_KEY, CHART_KEY]) {
            localStorage.removeItem(key)
            sessionStorage.removeItem(key)
          }
        } else if (res.status !== "unauthenticated") {
          console.log("[v0] persistBirthChart:", res)
        }
        return
      }

      // Nothing pending — make sure a chart exists, or route to onboarding.
      const res = await ensureUserChart()
      if (res.status === "needs_onboarding") {
        router.replace("/onboarding")
      } else if (res.status === "error") {
        console.log("[v0] ensureUserChart:", res.message)
      }
    }

    void run()
  }, [router])

  return null
}
