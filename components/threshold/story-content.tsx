const fraunces = "var(--font-fraunces), Georgia, serif"

/**
 * Shared "what this is / where it's going" story copy. The words live here in
 * exactly one place, expressed as segment arrays so multiple presentations can
 * render them:
 *   - <StoryContent />     : static serif reading text (Threshold loader)
 *   - <StoryReadCards />   : animated terminal cards (the /about page)
 */

export type StorySegment = {
  text: string
  /** render as glowing white emphasis */
  glow?: boolean
  /** render dim + italic (used for the editable origin-story placeholder) */
  dim?: boolean
  /** optional font size override */
  fontSize?: number | string
  /** optional line height override */
  lineHeight?: number | string
}

export type StorySection = {
  title: string
  body: StorySegment[]
}

export const STORY_SECTIONS: StorySection[] = [
  {
    title: "What this is",
    body: [
      {
        text: "Spiral Inward begins with the exact moment you arrived, and draws a first sketch of who that made you — through the Vedic lens, and a few others layered quietly beneath it.\n\nIt does not tell you who you are. It ",
        fontSize: 13,
        lineHeight: "0.3em",
      },
      { text: "proposes", glow: true, fontSize: 12 },
      {
        text: ", and waits for you to answer. Everything you agree with sharpens the picture. Everything you reject becomes a portrait drawn in negative space.",
        fontSize: 12,
      },
    ],
  },
  {
    title: "Where it's going",
    body: [
      {
        text: "You'll add the people who matter, and see the shape of each bond. You'll tell the sky things no chart could know, and watch them sit beside what the stars suggested — kept as tension when they disagree, never corrected.\n\nOver time the spiral becomes less the sky's guess and more ",
        fontSize: 12,
      },
      { text: "yours", glow: true, fontSize: 12 },
      { text: "." },
    ],
  },
  {
    title: "How it came to be",
    body: [
      // EDITABLE — replace this segment with your origin story.
      { text: "[ this paragraph is a placeholder — your origin story goes here ]", dim: true },
      { text: "\n\nFor now: it was made by someone who wanted a mirror that " },
      { text: "listens", glow: true },
      { text: " before it speaks." },
    ],
  },
]

/**
 * Static serif rendering of the story — used by the Threshold loading screen,
 * where the copy sits quietly beneath the loader as reading material.
 */
export function StoryContent() {
  return (
    <>
      {STORY_SECTIONS.map((section) => (
        <section key={section.title} className="mt-12">
          <h2
            className="text-2xl italic leading-tight"
            style={{ fontFamily: fraunces, color: "#e8e4da" }}
          >
            {section.title}
          </h2>
          <p className="mt-4 whitespace-pre-line text-pretty font-sans text-[15px] leading-relaxed text-muted-foreground">
            {section.body.map((seg, i) => (
              <Segment key={i} seg={seg} />
            ))}
          </p>
        </section>
      ))}
    </>
  )
}

function Segment({ seg }: { seg: StorySegment }) {
  if (seg.glow) {
    return (
      <span style={{ color: "#f5f5f5", textShadow: "0 0 10px rgba(255,255,255,0.45)" }}>
        {seg.text}
      </span>
    )
  }
  if (seg.dim) {
    return <span className="italic text-muted-foreground/60">{seg.text}</span>
  }
  return <>{seg.text}</>
}
