import { NextResponse } from "next/server"
// The ephemeris package is pure-JS Moshier (no native bindings) — safe on
// serverless. It gives geocentric *tropical* apparent longitudes.
import ephemeris from "ephemeris"
import {
  SIGNS,
  ascendantTropical,
  computeDashas,
  houseOf,
  julianDay,
  lahiriAyanamsa,
  meanNodeLongitude,
  norm360,
  place,
  zonedWallTimeToUtc,
} from "@/lib/vedic/astro"

// Node runtime (the ephemeris package is CommonJS and does heavy math).
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Bodies we read straight from the ephemeris, in Vedic display order. Rahu/Ketu
// are computed separately from the Moon's mean node.
const EPHEMERIS_BODIES = [
  "sun",
  "moon",
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
] as const

type ChartRequest = {
  date?: string
  time?: string
  lat?: number
  lng?: number
  timezone?: string
}

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

export async function POST(req: Request) {
  let body: ChartRequest
  try {
    body = await req.json()
  } catch {
    return bad("invalid json body")
  }

  const { date, time, lat, lng, timezone } = body

  // --- validate input -------------------------------------------------------
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date))
    return bad('date must be "YYYY-MM-DD"')
  if (!time || !/^\d{2}:\d{2}$/.test(time)) return bad('time must be "HH:MM"')
  if (typeof lat !== "number" || lat < -90 || lat > 90)
    return bad("lat must be a number between -90 and 90")
  if (typeof lng !== "number" || lng < -180 || lng > 180)
    return bad("lng must be a number between -180 and 180")
  if (!timezone || typeof timezone !== "string")
    return bad("timezone must be an IANA string like America/New_York")

  try {
    const [year, month, day] = date.split("-").map(Number)
    const [hour, minute] = time.split(":").map(Number)

    // Wall-clock birth time in the given timezone -> exact UTC instant.
    let utcDate: Date
    try {
      utcDate = zonedWallTimeToUtc(year, month, day, hour, minute, timezone)
    } catch {
      return bad(`unknown timezone: ${timezone}`)
    }
    if (Number.isNaN(utcDate.getTime())) return bad("could not parse date/time")

    const jd = julianDay(utcDate)
    const ayanamsa = lahiriAyanamsa(jd)

    // --- planets: tropical from ephemeris -> sidereal via ayanamsa ----------
    const eph = ephemeris.getAllPlanets(utcDate, lng, lat, 0)

    const planets = EPHEMERIS_BODIES.map((name) => {
      const tropical = eph.observed[name].apparentLongitudeDd as number
      const sidereal = norm360(tropical - ayanamsa)
      const p = place(sidereal)
      return { name, ...p }
    })

    // Rahu (Moon's mean ascending node) and Ketu (exactly opposite).
    const rahuTropical = meanNodeLongitude(jd)
    const rahuSid = norm360(rahuTropical - ayanamsa)
    const ketuSid = norm360(rahuSid + 180)
    planets.push({ name: "rahu", ...place(rahuSid) })
    planets.push({ name: "ketu", ...place(ketuSid) })

    // --- ascendant (lagna): tropical -> sidereal ----------------------------
    const ascSid = norm360(ascendantTropical(jd, lat, lng) - ayanamsa)
    const ascPlacement = place(ascSid)
    const ascSignIndex = ascPlacement.signIndex

    // --- whole-sign houses --------------------------------------------------
    const planetsWithHouse = planets.map((p) => ({
      planet: p.name,
      sign: p.sign,
      house: houseOf(p.signIndex, ascSignIndex),
      degree: Number(p.degree.toFixed(4)),
      nakshatra: p.nakshatra,
      longitude: Number(p.longitude.toFixed(4)),
    }))

    const houses: Record<number, { sign: string; planets: string[] }> = {}
    for (let h = 1; h <= 12; h++) {
      const signIndex = (ascSignIndex + (h - 1)) % 12
      houses[h] = {
        sign: SIGNS[signIndex],
        planets: planetsWithHouse
          .filter((p) => p.house === h)
          .map((p) => p.planet),
      }
    }

    // --- vimshottari dashas from the Moon's nakshatra -----------------------
    const moon = planets.find((p) => p.name === "moon")!
    const dashas = computeDashas(moon.longitude, utcDate, new Date())

    return NextResponse.json({
      meta: {
        utc: utcDate.toISOString(),
        julianDay: Number(jd.toFixed(6)),
        ayanamsa: Number(ayanamsa.toFixed(6)),
        ayanamsaName: "lahiri",
        houseSystem: "whole-sign",
        zodiac: "sidereal",
      },
      planets: planetsWithHouse,
      ascendant: {
        sign: ascPlacement.sign,
        degree: Number(ascPlacement.degree.toFixed(4)),
        nakshatra: ascPlacement.nakshatra,
        longitude: Number(ascPlacement.longitude.toFixed(4)),
      },
      houses,
      dashas,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "calculation failed"
    return bad(`calculation error: ${message}`, 500)
  }
}
