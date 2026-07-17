import { NextResponse } from "next/server"

// Free, keyless geocoding via Open-Meteo. Turns a free-text birth place like
// "brooklyn, usa" into the coordinates + IANA timezone the chart engine needs.
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type GeoResult = {
  name: string
  country?: string
  admin1?: string
  latitude: number
  longitude: number
  timezone: string
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q = (searchParams.get("q") || "").trim()
  // suggest=1 → typeahead mode: return several candidate places (canonical
  // "City, Region, Country" labels) instead of resolving to a single result.
  const suggest = searchParams.get("suggest") === "1"

  if (!q) {
    return NextResponse.json({ error: "missing place query" }, { status: 400 })
  }

  // Open-Meteo matches on the city name only, so send the first segment
  // (before any comma) as the search term and keep the rest as a country/region
  // hint used to disambiguate between same-named cities.
  const [cityPart, ...rest] = q.split(",")
  const city = cityPart.trim()
  const hint = rest.join(",").trim().toLowerCase()

  const url =
    "https://geocoding-api.open-meteo.com/v1/search?" +
    new URLSearchParams({
      name: city,
      count: "10",
      language: "en",
      format: "json",
    }).toString()

  let results: GeoResult[]
  try {
    const res = await fetch(url, { headers: { accept: "application/json" } })
    if (!res.ok) {
      return NextResponse.json(
        { error: `geocoding service error (${res.status})` },
        { status: 502 },
      )
    }
    const data = (await res.json()) as { results?: GeoResult[] }
    results = data.results ?? []
  } catch {
    return NextResponse.json(
      { error: "could not reach the geocoding service" },
      { status: 502 },
    )
  }

  if (suggest) {
    // Typeahead: hand back the top candidates with everything the chart
    // engine needs, so picking one requires NO second geocode round-trip.
    return NextResponse.json({
      suggestions: results.slice(0, 6).map((r) => ({
        label: [r.name, r.admin1, r.country].filter(Boolean).join(", "),
        name: r.name,
        admin1: r.admin1 ?? null,
        country: r.country ?? null,
        lat: r.latitude,
        lng: r.longitude,
        timezone: r.timezone,
      })),
    })
  }

  if (results.length === 0) {
    return NextResponse.json(
      { error: `couldn't find a place matching "${q}"` },
      { status: 404 },
    )
  }

  // If the visitor gave a country/region hint, prefer a result that matches it.
  let picked = results[0]
  if (hint) {
    const match = results.find((r) =>
      [r.country, r.admin1]
        .filter(Boolean)
        .some((field) => (field as string).toLowerCase().includes(hint)),
    )
    if (match) picked = match
  }

  return NextResponse.json({
    name: picked.name,
    country: picked.country ?? null,
    lat: picked.latitude,
    lng: picked.longitude,
    timezone: picked.timezone,
  })
}
