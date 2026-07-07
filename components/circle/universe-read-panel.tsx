"use client"

import { useCallback, useEffect, useRef, useState } from "react"

/**
 * UniverseReadPanel
 *
 * A terminal-styled panel that slides up from the bottom when an object in the
 * SpiralUniverse is tapped. Mirrors the ReadHub voice: a small uppercase source
 * line, a spaced title, the read text TYPES OUT, then [ ✓ yes ] / [ ✕ no ]
 * commands fade in. Closes on scrim tap or swipe-down.
 *
 * The yes/no handlers are wired by the parent to the SAME spiral agree/disagree
 * persistence used by the bottom ReadHub — this is not a parallel system.
 */

export type PanelData = {
  /** Small uppercase source line, e.g. "capricorn · makara". */
  src: string
  /** Spaced uppercase title, e.g. "THE ASCENDANT" or "MARA × YOU". */
  title: string
  /** The body that types out. */
  body: string
  /** The tapped marker's color — tints the panel border + heading. */
  accent?: string
}

const TYPE_MS = 18
const START_DELAY = 180

const mono =
  "'Geist Pixel', ui-monospace, monospace"

export function UniverseReadPanel({
  data,
  onJudge,
  onClose,
}: {
  data: PanelData | null
  onJudge: (agree: boolean) => void
  onClose: () => void
}) {
  const [typed, setTyped] = useState("")
  const [done, setDone] = useState(false)
  const [dragY, setDragY] = useState(0)
  const cancelled = useRef(false)
  const dragStart = useRef<number | null>(null)

  const open = data !== null
  // The tapped marker's color, translated into the panel chrome. Falls back to
  // the neutral grey when no accent is provided.
  const accent = data?.accent ?? "#9a9a9a"

  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches

  // Type the body out whenever the panel content changes.
  useEffect(() => {
    if (!data) return
    cancelled.current = false
    setDone(false)
    setTyped("")
    setDragY(0)

    if (reduceMotion) {
      setTyped(data.body)
      setDone(true)
      return
    }

    let i = 0
    let timer: ReturnType<typeof setTimeout>
    const tick = () => {
      if (cancelled.current) return
      if (i < data.body.length) {
        i++
        setTyped(data.body.slice(0, i))
        timer = setTimeout(tick, TYPE_MS)
      } else {
        setDone(true)
      }
    }
    timer = setTimeout(tick, START_DELAY)
    return () => {
      cancelled.current = true
      clearTimeout(timer)
    }
  }, [data, reduceMotion])

  // ----- swipe-down to dismiss (on the grab handle) -----
  const onGrabDown = useCallback((e: React.PointerEvent) => {
    dragStart.current = e.clientY
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [])
  const onGrabMove = useCallback((e: React.PointerEvent) => {
    if (dragStart.current == null) return
    setDragY(Math.max(0, e.clientY - dragStart.current))
  }, [])
  const onGrabUp = useCallback(() => {
    if (dragStart.current == null) return
    setDragY((y) => {
      if (y > 70) onClose()
      return 0
    })
    dragStart.current = null
  }, [onClose])

  return (
    <>
      {/* Scrim */}
      <button
        aria-hidden={!open}
        tabIndex={-1}
        onClick={onClose}
        className="fixed inset-0 z-40 cursor-default transition-opacity duration-300"
        style={{
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(2px)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
        }}
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
        className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-[440px]"
        style={{
          background: "#070707",
          border: `1px solid ${accent}`,
          borderBottom: "none",
          borderRadius: "20px 20px 0 0",
          // A soft bloom of the marker's color along the panel's top edge.
          boxShadow: `0 -1px 24px ${accent}40`,
          transform: open ? `translateY(${dragY}px)` : "translateY(110%)",
          transition: dragStart.current
            ? "none"
            : "transform .38s cubic-bezier(.3,.8,.3,1)",
          // When closed, drop out of the a11y tree + pointer flow entirely so
          // the off-screen yes/no buttons aren't focusable or clickable.
          visibility: open ? "visible" : "hidden",
          pointerEvents: open ? "auto" : "none",
          fontFamily: mono,
        }}
      >
        {/* Grab handle (also the swipe-down target) */}
        <div
          onPointerDown={onGrabDown}
          onPointerMove={onGrabMove}
          onPointerUp={onGrabUp}
          onPointerCancel={onGrabUp}
          className="flex cursor-grab justify-center pb-1 pt-3 active:cursor-grabbing"
          style={{ touchAction: "none" }}
        >
          <span className="block h-1 w-9 rounded-full" style={{ background: accent, opacity: 0.7 }} />
        </div>

        <div className="px-6 pb-7 pt-2">
          {/* title — the facet name, in the marker's color, e.g. ASCENDANT */}
          <div
            className="mb-2 text-[13px] uppercase tracking-[3px]"
            style={{ color: accent, textShadow: `0 0 12px ${accent}55` }}
          >
            {data?.title}
          </div>
          {/* source line — the sign, e.g. CAPRICORN · MAKARA */}
          <div
            className="mb-3.5 text-[10px] uppercase tracking-[2px]"
            style={{ color: `${accent}b3` }}
          >
            {data?.src}
          </div>
          {/* typed body */}
          <div
            className="whitespace-pre-wrap text-[15px] leading-relaxed"
            style={{ color: "#cfcbc1", minHeight: 54 }}
          >
            {typed}
            {!done && (
              <span
                className="ml-0.5 inline-block align-[-3px] h-4 w-2"
                style={{
                  background: "#9a9a9a",
                  animation: "urpBlink 1.05s steps(1) infinite",
                }}
              />
            )}
          </div>

          {/* yes / no commands */}
          <div
            className="mt-6 flex gap-3"
            style={{
              opacity: done ? 1 : 0,
              transition: "opacity .35s",
              pointerEvents: done ? "auto" : "none",
            }}
          >
            <CmdButton variant="yes" onClick={() => onJudge(true)}>
              yes
            </CmdButton>
            <CmdButton variant="no" onClick={() => onJudge(false)}>
              no
            </CmdButton>
          </div>
        </div>

        <style>{`@keyframes urpBlink { 50% { opacity: 0; } }`}</style>
      </div>
    </>
  )
}

function CmdButton({
  variant,
  onClick,
  children,
}: {
  variant: "yes" | "no"
  onClick: () => void
  children: React.ReactNode
}) {
  const [hover, setHover] = useState(false)
  const palette =
    variant === "yes"
      ? {
          color: hover ? "#8fe0a3" : "#5fa873",
          border: hover ? "#3f8a55" : "#1f3a28",
          bg: hover ? "rgba(95,168,115,.1)" : "transparent",
          glyph: "✓",
        }
      : {
          color: hover ? "#e88f9c" : "#b0606e",
          border: hover ? "#8a3f4c" : "#3a1f24",
          bg: hover ? "rgba(176,96,110,.1)" : "transparent",
          glyph: "✕",
        }
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="flex-1 rounded-lg px-2.5 py-3 text-[13px] tracking-wide transition-all"
      style={{
        background: palette.bg,
        border: `1px solid ${palette.border}`,
        color: palette.color,
        fontFamily: "inherit",
      }}
    >
      <span style={{ opacity: 0.5 }}>[</span> {palette.glyph} {children}{" "}
      <span style={{ opacity: 0.5 }}>]</span>
    </button>
  )
}
