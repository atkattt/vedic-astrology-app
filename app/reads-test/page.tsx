"use client"

import { useState } from "react"
import { getSupabase } from "@/lib/supabase"
import { matchFragments, type Chart, type Fragment } from "@/lib/matcher"

// Same small set of IANA timezones as the chart-test form.
const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "America/Sao_Paulo",
  "America/Mexico_City",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Moscow",
  "Africa/Cairo",
  "Africa/Johannesburg",
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Karachi",
  "Asia/Bangkok",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Asia/Singapore",
  "Australia/Sydney",
  "Pacific/Auckland",
  "UTC",
]

type FragmentRow = Fragment & {
  id: string | number
  title: string | null
  body: string | null
  archetype: string | null
  tone: string | null
  life_domain: string | null
  self_questions: string[] | string | null
  weight: number | null
  trigger_type: string | null
  condition: unknown
}

function toQuestions(value: FragmentRow["self_questions"]): string[] {
  if (Array.isArray(value)) return value.filter(Boolean).map(String)
  if (typeof value === "string" && value.trim().length > 0) {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) return parsed.filter(Boolean).map(String)
    } catch {
      return [value]
    }
    return [value]
  }
  return []
}

export default function ReadsTestPage() {
  const [date, setDate] = useState("1990-01-01")
  const [time, setTime] = useState("12:00")
  const [lat, setLat] = useState("40.7128")
  const [lng, setLng] = useState("-74.0060")
  const [timezone, setTimezone] = useState("America/New_York")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [matches, setMatches] = useState<FragmentRow[] | null>(null)
  const [totalFragments, setTotalFragments] = useState(0)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMatches(null)
    try {
      // 1) compute the chart
      const res = await fetch("/api/chart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          time,
          lat: Number(lat),
          lng: Number(lng),
          timezone,
        }),
      })
      const chartData = await res.json()
      if (!res.ok) {
        setError(chartData?.error ?? `chart request failed (${res.status})`)
        return
      }

      // 2) fetch the interpretation fragments
      const { client, error: clientError } = getSupabase()
      if (!client) {
        setError(clientError ?? "supabase client unavailable")
        return
      }
      const { data, error: dbError } = await client
        .from("fragments")
        .select("*")
      if (dbError) {
        setError(dbError.message)
        return
      }

      const fragments = (data ?? []) as FragmentRow[]
      setTotalFragments(fragments.length)

      // 3) match chart -> fragments, sorted by weight desc (the matcher sorts)
      const matched = matchFragments(chartData as Chart, fragments)
      setMatches(matched)
    } catch (err) {
      setError(err instanceof Error ? err.message : "network error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-[100dvh] bg-neutral-950 px-6 py-20 text-neutral-200 lowercase">
      <div className="mx-auto flex max-w-xl flex-col gap-16">
        <header className="flex flex-col gap-2">
          <h1 className="text-sm tracking-widest text-neutral-500">
            reads test
          </h1>
          <p className="text-xs text-neutral-600">
            chart → matched fragments · sorted by weight
          </p>
        </header>

        <form onSubmit={onSubmit} className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Field label="date">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={inputClass}
                required
              />
            </Field>
            <Field label="time">
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className={inputClass}
                required
              />
            </Field>
            <Field label="latitude">
              <input
                type="number"
                step="any"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                placeholder="40.7128"
                className={inputClass}
                required
              />
            </Field>
            <Field label="longitude">
              <input
                type="number"
                step="any"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                placeholder="-74.0060"
                className={inputClass}
                required
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="timezone">
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className={inputClass}
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz} className="bg-neutral-900">
                      {tz.toLowerCase()}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-fit rounded-md border border-neutral-700 px-6 py-2 text-sm text-neutral-200 transition-colors hover:bg-neutral-800 disabled:opacity-50"
          >
            {loading ? "reading…" : "find reads"}
          </button>
        </form>

        {error && (
          <pre className="whitespace-pre-wrap rounded-md border border-red-900/50 bg-red-950/30 p-4 text-sm text-red-400">
            {error}
          </pre>
        )}

        {matches && (
          <section className="flex flex-col gap-14">
            <p className="text-xs text-neutral-600">
              {matches.length} of {totalFragments} fragments matched
            </p>

            {matches.length === 0 && (
              <p className="text-sm text-neutral-600">
                no fragments matched this chart.
              </p>
            )}

            {matches.map((f) => {
              const questions = toQuestions(f.self_questions)
              return (
                <article key={f.id} className="flex flex-col gap-5">
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                      {f.trigger_type && (
                        <span className="text-xs tracking-widest text-neutral-600">
                          {f.trigger_type.replace(/_/g, " ")}
                        </span>
                      )}
                      {typeof f.weight === "number" && (
                        <span className="text-xs text-neutral-700">
                          weight {f.weight}
                        </span>
                      )}
                    </div>
                    {f.title && (
                      <h2 className="text-lg leading-relaxed text-neutral-100">
                        {f.title}
                      </h2>
                    )}
                    {f.body && (
                      <p className="text-base leading-relaxed text-neutral-400">
                        {f.body}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-neutral-600">
                    {f.archetype && <span>archetype · {f.archetype}</span>}
                    {f.tone && <span>tone · {f.tone}</span>}
                    {f.life_domain && <span>domain · {f.life_domain}</span>}
                  </div>

                  {questions.length > 0 && (
                    <ul className="flex flex-col gap-2 border-l border-neutral-800 pl-4">
                      {questions.map((q, i) => (
                        <li
                          key={i}
                          className="text-sm leading-relaxed text-neutral-500"
                        >
                          {q}
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              )
            })}
          </section>
        )}
      </div>
    </main>
  )
}

const inputClass =
  "w-full rounded-md border border-neutral-800 bg-neutral-900/40 px-3 py-2 text-sm text-neutral-200 outline-none focus:border-neutral-600"

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-xs text-neutral-600">{label}</span>
      {children}
    </label>
  )
}
