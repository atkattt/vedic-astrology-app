"use client"

import { useRef, useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import SelfAvatar, { type Mood } from "@/components/circle/SelfAvatar"
import { chartRead } from "@/lib/spiral/chart-read"

const fraunces = "var(--font-fraunces), Georgia, serif"
// Glowing-white accent — never gold.
const glow = { color: "#f5f5f5", textShadow: "0 0 10px rgba(255,255,255,0.45)" }

/**
 * A bottom sheet that opens when the SelfAvatar at the center of the spiral is
 * tapped. Shows a poetic chart "read" that PROPOSES rather than pronounces.
 * Always mounted so it can animate both in and out; visibility is driven by
 * `open`. Closes on scrim tap or a downward swipe on the panel.
 */
export function AvatarReadSheet({
  open,
  onClose,
  mood = "idle",
  growth = 0.5,
}: {
  open: boolean
  onClose: () => void
  mood?: Mood
  growth?: number
}) {
  const [expanded, setExpanded] = useState(false)

  // Lightweight swipe-down-to-close. Tracks the drag offset and either snaps
  // back or closes past a threshold.
  const startY = useRef<number | null>(null)
  const [dragY, setDragY] = useState(0)

  function onTouchStart(e: React.TouchEvent) {
    startY.current = e.touches[0].clientY
  }
  function onTouchMove(e: React.TouchEvent) {
    if (startY.current == null) return
    const delta = e.touches[0].clientY - startY.current
    setDragY(Math.max(0, delta))
  }
  function onTouchEnd() {
    if (dragY > 110) onClose()
    setDragY(0)
    startY.current = null
  }

  return (
    <div
      className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      {/* Scrim: dim + blur, closes on tap */}
      <button
        aria-label="Close"
        onClick={onClose}
        className={`absolute inset-0 h-full w-full bg-background/70 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Your chart"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className="absolute inset-x-0 bottom-0 mx-auto flex max-h-[88dvh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl border border-border bg-popover/95 backdrop-blur-md"
        style={{
          transform: open
            ? `translateY(${dragY}px)`
            : "translateY(100%)",
          transition: dragY > 0 ? "none" : "transform 0.35s cubic-bezier(0.22,1,0.36,1)",
        }}
      >
        {/* Drag handle */}
        <div className="flex shrink-0 justify-center pb-1 pt-3">
          <span className="h-1 w-10 rounded-full bg-foreground/25" />
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-10 pt-3">
          {/* Mini avatar */}
          <div className="flex justify-center">
            <SelfAvatar mood={mood} growth={growth} size={84} />
          </div>

          {/* Eyebrow */}
          <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            {chartRead.eyebrow}
          </p>

          {/* Poetic summary, with the key phrase glowing white */}
          <p
            className="mx-auto mt-5 max-w-sm text-balance text-center italic leading-relaxed"
            style={{ fontFamily: fraunces, fontSize: 21, color: "#d9d5cb" }}
          >
            <EmphasisText
              text={chartRead.summary.text}
              emphasis={chartRead.summary.emphasis}
            />
          </p>

          {/* Go deeper toggle */}
          <div className="mt-7 flex justify-center">
            <button
              onClick={() => setExpanded((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-5 py-2 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground transition-colors hover:text-foreground"
            >
              {expanded ? (
                <>
                  show less <ChevronUp className="size-3.5" />
                </>
              ) : (
                <>
                  go deeper <ChevronDown className="size-3.5" />
                </>
              )}
            </button>
          </div>

          {/* Full structured read — animates open via max-height */}
          <div
            className="overflow-hidden transition-[max-height,opacity] duration-500 ease-out"
            style={{
              maxHeight: expanded ? 1600 : 0,
              opacity: expanded ? 1 : 0,
            }}
          >
            <div className="mt-8 flex flex-col gap-7">
              {chartRead.sections.map((s) => (
                <section key={s.label}>
                  <div className="flex items-baseline justify-between gap-3 border-b border-border/60 pb-1.5">
                    <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                      {s.label}
                    </span>
                    <span
                      className="text-right font-mono text-[11px] tracking-wide"
                      style={glow}
                    >
                      {s.value}
                    </span>
                  </div>
                  <p
                    className="mt-2.5 text-pretty italic leading-relaxed text-muted-foreground"
                    style={{ fontFamily: fraunces, fontSize: 15 }}
                  >
                    {s.body}
                  </p>
                </section>
              ))}
            </div>
          </div>

          {/* Closing guardrail line */}
          <p className="mx-auto mt-9 max-w-xs text-center font-mono text-[10px] leading-relaxed tracking-wide text-muted-foreground/70">
            {chartRead.closing}
          </p>
        </div>
      </div>
    </div>
  )
}

/** Renders `text` with the `emphasis` substring wrapped in a glowing-white span. */
function EmphasisText({ text, emphasis }: { text: string; emphasis: string }) {
  const idx = text.indexOf(emphasis)
  if (idx === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <span style={glow}>{emphasis}</span>
      {text.slice(idx + emphasis.length)}
    </>
  )
}
