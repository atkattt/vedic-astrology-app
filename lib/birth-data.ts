// Shared shapes + parsing for the onboarding birth-data ritual.
//
// TerminalOnboarding stores raw, human-formatted answers in sessionStorage:
//   date: "MM / DD / YYYY"   time: "HH : MM AM"|"(time unknown)"|""   place: "city, country"
// The chart engine (/api/chart) needs an ISO date, a 24h time, and lat/lng/tz.
// These helpers bridge the two.

export const BIRTH_DATA_KEY = "spiral_birth_data"
export const BIRTH_NORMALIZED_KEY = "spiral_birth_normalized"
export const CHART_KEY = "spiral_chart"

export type RawBirthData = {
  date?: string
  time?: string
  place?: string
  timeUnknown?: boolean
}

export type NormalizedBirthData = {
  // ISO date, e.g. "1990-01-01"
  date: string
  // 24h wall-clock time, e.g. "13:45". Defaults to noon when unknown.
  time: string
  timeUnknown: boolean
  place: string
}

// "MM / DD / YYYY" (possibly partial) -> "YYYY-MM-DD". Throws if incomplete.
export function parseDate(raw: string | undefined): string {
  const digits = (raw ?? "").replace(/\D/g, "")
  if (digits.length < 8) throw new Error("please enter a full birth date")
  const mm = digits.slice(0, 2)
  const dd = digits.slice(2, 4)
  const yyyy = digits.slice(4, 8)

  const month = Number(mm)
  const day = Number(dd)
  const year = Number(yyyy)
  if (month < 1 || month > 12) throw new Error("that month looks off")
  if (day < 1 || day > 31) throw new Error("that day looks off")
  if (year < 1900 || year > 2100) throw new Error("that year looks off")

  return `${yyyy}-${mm}-${dd}`
}

// "HH : MM AM" -> "HH:MM" (24h). When the time is unknown we use noon, a
// standard convention that keeps the planets accurate even if the ascendant
// (which needs an exact time) is approximate.
export function parseTime(
  raw: string | undefined,
  timeUnknown: boolean | undefined,
): string {
  if (timeUnknown || !raw || raw.includes("unknown")) return "12:00"

  const meridiemMatch = raw.toUpperCase().match(/\b(AM|PM)\b/)
  const meridiem = meridiemMatch ? meridiemMatch[1] : null

  const digits = raw.replace(/[^\d]/g, "")
  if (digits.length < 3) return "12:00"
  const hh = digits.slice(0, 2)
  const mm = digits.slice(2, 4).padEnd(2, "0")

  let hour = Number(hh)
  const minute = Number(mm)
  if (meridiem === "AM") {
    if (hour === 12) hour = 0
  } else if (meridiem === "PM") {
    if (hour !== 12) hour += 12
  }
  if (hour > 23 || minute > 59) return "12:00"

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
}

export function normalizeBirthData(raw: RawBirthData): NormalizedBirthData {
  return {
    date: parseDate(raw.date),
    time: parseTime(raw.time, raw.timeUnknown),
    timeUnknown: Boolean(raw.timeUnknown),
    place: (raw.place ?? "").trim(),
  }
}
