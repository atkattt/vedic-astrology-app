const fraunces = "var(--font-fraunces), Georgia, serif"

/**
 * The "what this is / where it's going" story copy. Shared between the
 * Threshold loading screen and the standalone /about page so the words live
 * in exactly one place.
 */
export function StoryContent() {
  return (
    <>
      <Section title="What this is">
        {
          "Spiral Inward begins with the exact moment you arrived, and draws a first sketch of who that made you — through the Vedic lens, and a few others layered quietly beneath it."
        }
        {"\n\n"}
        {"It does not tell you who you are. It "}
        <Glow>proposes</Glow>
        {
          ", and waits for you to answer. Everything you agree with sharpens the picture. Everything you reject becomes a portrait drawn in negative space."
        }
      </Section>

      <Section title="Where it's going">
        {
          "You'll add the people who matter, and see the shape of each bond. You'll tell the sky things no chart could know, and watch them sit beside what the stars suggested — kept as tension when they disagree, never corrected."
        }
        {"\n\n"}
        {"Over time the spiral becomes less the sky's guess and more "}
        <Glow>yours</Glow>
        {"."}
      </Section>

      <Section title="How it came to be">
        {/* EDITABLE — replace this paragraph with your origin story. */}
        <span className="italic text-muted-foreground/60">
          {"[ this paragraph is a placeholder — your origin story goes here ]"}
        </span>
        {"\n\n"}
        {"For now: it was made by someone who wanted a mirror that "}
        <Glow>listens</Glow>
        {" before it speaks."}
      </Section>
    </>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="mt-12">
      <h2
        className="text-2xl italic leading-tight"
        style={{ fontFamily: fraunces, color: "#e8e4da" }}
      >
        {title}
      </h2>
      <p className="mt-4 whitespace-pre-line text-pretty font-sans text-[15px] leading-relaxed text-muted-foreground">
        {children}
      </p>
    </section>
  )
}

function Glow({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ color: "#f5f5f5", textShadow: "0 0 10px rgba(255,255,255,0.45)" }}>
      {children}
    </span>
  )
}
