"use client"

import { useEffect, useRef, useState } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"

const MONO =
  "var(--font-space-mono), 'Space Mono', ui-monospace, SFMono-Regular, Menlo, monospace"

/**
 * The unlocked "talk to your self" conversation. A quiet terminal-style thread:
 * the self's replies are typed grey behind a `›` prompt; your own lines are
 * brighter and right-of-prompt. Grounded server-side in the real chart.
 */
export function SelfChat() {
  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/self-chat" }),
  })
  const [input, setInput] = useState("")
  const scrollRef = useRef<HTMLDivElement | null>(null)

  const busy = status === "submitted" || status === "streaming"

  // Keep the newest line in view as it streams.
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    })
  }, [messages, status])

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text || busy) return
    sendMessage({ text })
    setInput("")
  }

  return (
    <div
      className="flex flex-col overflow-hidden rounded-2xl"
      style={{
        background: "#070707",
        border: "1px solid #1a1a1a",
        fontFamily: MONO,
      }}
    >
      {/* Thread */}
      <div
        ref={scrollRef}
        className="flex flex-col gap-4 overflow-y-auto px-5 py-5"
        style={{ maxHeight: 340, minHeight: 200 }}
      >
        {messages.length === 0 && (
          <p
            style={{
              fontSize: 13,
              lineHeight: 1.6,
              letterSpacing: 0.3,
              color: "#6a6a6a",
            }}
          >
            <span style={{ color: "#555" }}>{"› "}</span>
            this is the part of you the spiral has been listening to. ask it
            anything — what you keep circling, what you're becoming.
          </p>
        )}

        {messages.map((m) => {
          const text = m.parts
            .map((p) => (p.type === "text" ? p.text : ""))
            .join("")
          if (m.role === "user") {
            return (
              <p
                key={m.id}
                className="self-end text-right"
                style={{
                  fontSize: 13.5,
                  lineHeight: 1.6,
                  letterSpacing: 0.3,
                  color: "#dcdcdc",
                  maxWidth: "85%",
                }}
              >
                {text}
              </p>
            )
          }
          return (
            <p
              key={m.id}
              style={{
                fontSize: 13.5,
                lineHeight: 1.65,
                letterSpacing: 0.3,
                color: "#9a9a9a",
                whiteSpace: "pre-wrap",
              }}
            >
              <span style={{ color: "#555" }}>{"› "}</span>
              {text}
            </p>
          )
        })}

        {status === "submitted" && (
          <p style={{ fontSize: 13.5, color: "#5a5a5a" }}>
            <span style={{ color: "#555" }}>{"› "}</span>
            <span
              style={{
                display: "inline-block",
                width: 8,
                height: 15,
                background: "#5a5a5a",
                verticalAlign: -2,
                animation: "selfBlink 1.05s steps(1) infinite",
              }}
            />
          </p>
        )}

        {error && (
          <p
            style={{
              fontSize: 12,
              lineHeight: 1.6,
              letterSpacing: 0.3,
              color: "#d98a9a",
            }}
          >
            the voice went quiet for a moment. try again.
          </p>
        )}
      </div>

      {/* Composer */}
      <form
        onSubmit={submit}
        className="flex items-center gap-2 px-4 py-3"
        style={{ borderTop: "1px solid #1a1a1a" }}
      >
        <span style={{ color: "#555", fontSize: 14 }}>{"›"}</span>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (
              e.key === "Enter" &&
              !e.nativeEvent.isComposing &&
              e.keyCode !== 229
            ) {
              submit(e)
            }
          }}
          disabled={busy}
          placeholder="say something to yourself…"
          className="flex-1 bg-transparent outline-none"
          style={{
            fontFamily: MONO,
            fontSize: 13.5,
            letterSpacing: 0.3,
            color: "#dcdcdc",
          }}
        />
        <button
          type="submit"
          disabled={!input.trim() || busy}
          style={{
            fontFamily: MONO,
            fontSize: 11,
            letterSpacing: 1,
            textTransform: "uppercase",
            color: input.trim() && !busy ? "#cfcfcf" : "#3a3a3a",
            background: "transparent",
            border: "none",
            cursor: input.trim() && !busy ? "pointer" : "default",
            transition: "color .16s",
          }}
        >
          send
        </button>
      </form>

      <style>{`@keyframes selfBlink { 50% { opacity: 0; } }`}</style>
    </div>
  )
}
