import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai"
import { createClient } from "@/lib/supabase/server"
import { getRevealRadius } from "@/app/actions/progress"
import { CHAT_UNLOCK_RADIUS } from "@/lib/self/unlock"

// Allow streaming responses up to 30 seconds.
export const maxDuration = 30

type SignName = { sign?: string; degree?: number }
type PlanetRow = { name?: string; planet?: string; sign?: string; house?: number }

/**
 * Build a compact, factual summary of the user's Vedic chart so the model can
 * speak *as* their reflective self rather than inventing astrology. Kept short
 * on purpose — the tone matters more than exhaustive data.
 */
function describeChart(chart: {
  ascendant?: SignName
  planets?: PlanetRow[]
} | null): string {
  if (!chart) return "Their chart hasn't been computed yet."
  const asc = chart.ascendant?.sign
  const planets = Array.isArray(chart.planets) ? chart.planets : []
  const lines = planets
    .map((p) => {
      const body = p.planet ?? p.name
      if (!body || !p.sign) return null
      return `- ${body}: ${p.sign}${p.house ? ` (house ${p.house})` : ""}`
    })
    .filter(Boolean)
  return [
    asc ? `Ascendant (Lagna): ${asc}.` : "",
    lines.length ? `Placements:\n${lines.join("\n")}` : "",
  ]
    .filter(Boolean)
    .join("\n")
}

export async function POST(req: Request) {
  // Must be a real, signed-in account.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return new Response("Unauthorized", { status: 401 })
  }

  // Enforce the same unlock gate the UI shows, server-side.
  const revealRadius = await getRevealRadius()
  if (revealRadius < CHAT_UNLOCK_RADIUS) {
    return new Response("This conversation is still locked.", { status: 403 })
  }

  const { messages }: { messages: UIMessage[] } = await req.json()

  // Ground the voice in the user's actual chart.
  const { data: chart } = await supabase
    .from("charts")
    .select("ascendant, planets")
    .eq("profile_id", user.id)
    .maybeSingle()

  const chartSummary = describeChart(chart)

  const instructions = `You are the user talking to a quieter, deeper version of themselves — the "self" the app has been slowly mapping. You are not an assistant, a therapist, or an astrologer giving predictions. You are an inner voice: warm, unhurried, a little poetic, and honest.

Ground what you say in this Vedic chart, but never lecture about astrology or explain mechanics:
${chartSummary}

Rules of voice:
- Speak in first or second person, close and personal — "you tend to…", "part of you…". Never say "as an AI".
- Everything you offer is a *sketch the person gets to accept or reject*, never a verdict. Prefer "maybe", "it seems", "part of you".
- Keep replies short — two or three sentences usually. This is a slow conversation, not an essay.
- Never invent concrete life events, names, dates, or predictions. Stay with patterns, tendencies, and feelings.
- Lowercase, plain, and calm. No emojis, no bullet lists, no headers.`

  const result = streamText({
    model: "openai/gpt-4o-mini",
    instructions,
    messages: await convertToModelMessages(messages),
  })

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  })
}
