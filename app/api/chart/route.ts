import { NextResponse } from "next/server"
import { ChartInputError, computeChart } from "@/lib/vedic/compute"

// Node runtime (the ephemeris package is CommonJS and does heavy math).
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type ChartRequest = {
  date?: string
  time?: string
  lat?: number
  lng?: number
  timezone?: string
}

export async function POST(req: Request) {
  let body: ChartRequest
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "invalid json body" }, { status: 400 })
  }

  try {
    const chart = computeChart(body)
    return NextResponse.json(chart)
  } catch (err) {
    if (err instanceof ChartInputError) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    const message = err instanceof Error ? err.message : "calculation failed"
    return NextResponse.json(
      { error: `calculation error: ${message}` },
      { status: 500 },
    )
  }
}
