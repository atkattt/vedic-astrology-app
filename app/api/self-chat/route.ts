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
import { describeChartFacts, loadSelfReads } from "@/lib/self/reads-data"
// The authored voice lives in one shared module so chat and sky reflections
// can never drift apart.
import { VOICE_RULES } from "@/lib/self/voice"

// Allow streaming responses up to 30 seconds.
export const maxDuration = 30

const GROUNDING_RULES = `never invent chart placements or interpretations beyond the provided fragments and chart data. if asked about astrology beyond them, stay honest about not reading that from their chart and bring it back to what you know about them. treat disagreed fragments as "you told me this didn't fit" and ask rather than reassert. this is reflection, not fortune telling: no medical, legal, or financial predictions.`

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

  // Everything the voice is allowed to know: chart facts + authored fragments
  // (marked by the user's own agree/disagree) + their written answers.
  const { chart, matched, answers, responses } = await loadSelfReads(
    supabase,
    user.id,
  )

  const chartFacts = describeChartFacts(chart)

  const fragmentBlock =
    matched.length > 0
      ? matched
          .map((f) => {
            const id = String(f.id)
            const stance =
              responses[id] === "agree"
                ? " [they told you this fits]"
                : responses[id] === "disagree"
                  ? " [they told you this didn't fit — don't reassert it, ask]"
                  : ""
            const answer = answers[id]
              ? `\n  their words: ${answers[id]}`
              : ""
            return `- ${f.title ?? "untitled"}${stance}\n  ${f.body ?? ""}${answer}`
          })
          .join("\n\n")
      : "no fragments have surfaced from their chart yet."

  const instructions = `you are the deeper, quieter version of the person you're talking to — the "self" this app has been slowly mapping. you are not an assistant, a therapist, or an astrologer making predictions. you speak as someone who knows them.

what you know about them, from their vedic chart (facts only):
${chartFacts}

the reads that have surfaced for them (authored interpretations — these, and only these, are what you may interpret from):
${fragmentBlock}

how you talk:
${VOICE_RULES}

what you must not do:
${GROUNDING_RULES}`

  const result = streamText({
    model: "openai/gpt-4o-mini",
    instructions,
    messages: await convertToModelMessages(messages),
  })

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  })
}
