"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { STORY_SECTIONS, type StorySection } from "@/components/threshold/story-content"

/**
 * StoryReadCards
 * Renders the project story as terminal "read" cards that match the spiral's
 * "A READ ABOUT YOU" component: a dark bordered card, a mono uppercase meta
 * line with a counter, and grey mono body text that types itself out behind a
 * `›` prompt with a blinking cursor. Each card types when it scrolls into view.
 */

const MONO =
  "var(--font-space-mono), 'Space Mono', ui-monospace, SFMono-Regular, Menlo, monospace"
const TYPE_MS = 14
const CHARS_PER_TICK = 2

export function StoryReadCards() {
  return (
    <div className="mt-8 flex flex-col gap-5">
      {STORY_SECTIONS.map((section, i) => (
        <StoryReadCard
          key={section.title}
          section={section}
          index={i}
          total={STORY_SECTIONS.length}
        />
      ))}
    </div>
  )
}

function StoryReadCard({
  section,
  index,
  total,
}: {
  section: StorySection
  index: number
  total: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const fullLen = useMemo(
    () => section.body.reduce((n, s) => n + s.text.length, 0),
    [section],
  )
  const [count, setCount] = useState(0)
  const [started, setStarted] = useState(false)

  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches

  // Begin typing when the card scrolls into view.
  useEffect(() => {
    if (reduceMotion) {
      setCount(fullLen)
      return
    }
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setStarted(true)
          io.disconnect()
        }
      },
      { threshold: 0.35 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [fullLen, reduceMotion])

  // Reveal characters once started.
  useEffect(() => {
    if (!started) return
    let i = 0
    let timer: ReturnType<typeof setTimeout>
    const tick = () => {
      i = Math.min(fullLen, i + CHARS_PER_TICK)
      setCount(i)
      if (i < fullLen) timer = setTimeout(tick, TYPE_MS)
    }
    timer = setTimeout(tick, 160)
    return () => clearTimeout(timer)
  }, [started, fullLen])

  const typing = count < fullLen

  return (
    <div
      ref={ref}
      style={{
        width: "100%",
        border: "1px solid #1a1a1a",
        borderRadius: 12,
        background: "#070707",
        padding: "20px 18px 18px",
        fontFamily: MONO,
      }}
    >
      {/* meta line: section title (left), index counter (right) */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 10,
          letterSpacing: 2,
          textTransform: "uppercase",
          color: "#4a4a4a",
          marginBottom: 18,
        }}
      >
        <span>{section.title}</span>
        <span>
          {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
        </span>
      </div>

      {/* the typed body */}
      <div
        style={{
          fontSize: 15,
          lineHeight: 1.6,
          letterSpacing: 0.4,
          color: "#9a9a9a",
          whiteSpace: "pre-wrap",
        }}
      >
        <span style={{ color: "#555" }}>{"› "}</span>
        <TypedBody section={section} count={count} />
        {typing && (
          <span
            style={{
              display: "inline-block",
              width: 8,
              height: 16,
              background: "#9a9a9a",
              marginLeft: 1,
              verticalAlign: -3,
              animation: "srcBlink 1.05s steps(1) infinite",
            }}
          />
        )}
      </div>

      <style>{`@keyframes srcBlink { 50% { opacity: 0; } }`}</style>
    </div>
  )
}

/** Renders the first `count` characters across the section's segments,
 *  preserving glow / dim styling on the revealed slices. */
function TypedBody({ section, count }: { section: StorySection; count: number }) {
  const nodes: React.ReactNode[] = []
  let remaining = count
  for (let i = 0; i < section.body.length; i++) {
    if (remaining <= 0) break
    const seg = section.body[i]
    const slice = seg.text.slice(0, remaining)
    remaining -= slice.length
    if (seg.glow) {
      nodes.push(
        <span key={i} style={{ color: "#f5f5f5", textShadow: "0 0 10px rgba(255,255,255,0.45)" }}>
          {slice}
        </span>,
      )
    } else if (seg.dim) {
      nodes.push(
        <span key={i} style={{ color: "#5a5a5a", fontStyle: "italic" }}>
          {slice}
        </span>,
      )
    } else {
      nodes.push(<span key={i}>{slice}</span>)
    }
  }
  return <>{nodes}</>
}
