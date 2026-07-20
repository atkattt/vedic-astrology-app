import { generateText } from "ai"
import { VOICE_RULES, THIN_ACK, isThinEntry } from "@/lib/self/voice"

export const maxDuration = 30

// Reflections are generated FROM the entry's text at save time — never
// canned, never shared between entries. The caller stores the result keyed
// to the entry's id.

const REFLECT_INSTRUCTIONS = `you are the sky in a quiet reflection app. someone just wrote down something they know to be true about themselves (or about a bond). you respond with a short reflection: two or three short STATEMENTS that show you actually heard THIS specific thing they said. reference their actual words or their actual subject. never generic.

non-negotiable, checked mechanically — a violation gets your whole answer discarded:
- ZERO questions. no question marks anywhere. this is not a chat; they cannot reply. you reflect, you never probe.
- no therapist phrasing: never "it sounds like", "that sounds", "that takes courage", "that's a lot to carry", "hold space".
- no "that's not X, that's Y" reframes. ever.
- don't advise. don't fix. don't ask them to do anything.
- the person is always the authority on themselves. you listen, you don't argue.

how you talk:
${VOICE_RULES}

tensions: sometimes what someone claims sits differently next to something else they might also feel or that their claim itself implies. if — and only if — the entry genuinely contains two things that sit differently, name it in one or two short sentences. humble. it names that two things sit side by side. it NEVER resolves them, never picks a winner, never corrects. their word is the one that holds. if there is no real tension, don't invent one.

respond with ONLY a json object, no code fences:
{"reflection": "...", "tension": "..." }
omit the "tension" key entirely when there is no genuine tension (most of the time there isn't).`

/**
 * The mechanical check the prompt warns about: drop question sentences and
 * therapist tells entirely, lowercase everything, strip long dashes. If
 * nothing survives, the caller falls back to the quiet ack.
 */
function enforceVoice(text: string): string {
  const sentences = text
    .replace(/\u2014|\u2013/g, ",") // long dashes → commas
    .split(/(?<=[.!…])\s+|(?<=\?)\s+/)
    .filter((s) => s.trim().length > 0)
    // No questions. No therapist phrasing.
    .filter((s) => !s.includes("?"))
    .filter(
      (s) =>
        !/it sounds like|that sounds|takes courage|a lot to carry|hold space/i.test(
          s,
        ),
    )
  return sentences.join(" ").toLowerCase().trim()
}

export async function POST(req: Request) {
  const { text, scope } = (await req.json()) as {
    text?: string
    scope?: string
  }

  if (!text || typeof text !== "string" || text.length > 2000) {
    return Response.json({ error: "bad entry" }, { status: 400 })
  }

  // SUBSTANCE GATE — thin entries get the quiet acknowledgment, no model
  // call, never a tension.
  if (isThinEntry(text)) {
    return Response.json({ reflection: THIN_ACK })
  }

  try {
    const { text: raw } = await generateText({
      model: "openai/gpt-4o-mini",
      instructions: REFLECT_INSTRUCTIONS,
      prompt: `scope: ${scope === "about-bond" ? "about a bond" : "about themselves"}\ntheir words: ${text}`,
    })

    // The model is told to return bare JSON; strip fences defensively.
    const cleaned = raw
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
    const parsed = JSON.parse(cleaned) as {
      reflection?: string
      tension?: string
    }
    const reflection = enforceVoice(parsed.reflection ?? "")
    const tension = parsed.tension ? enforceVoice(parsed.tension) : ""
    if (!reflection) throw new Error("reflection empty after voice check")

    return Response.json({
      reflection,
      ...(tension ? { tension } : {}),
    })
  } catch (err) {
    console.error("[truth-reflect] generation failed:", err)
    // Fail quiet, in voice — never a canned deep reflection.
    return Response.json({ reflection: THIN_ACK })
  }
}
