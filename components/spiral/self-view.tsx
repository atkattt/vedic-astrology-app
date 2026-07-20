"use client"

import { useMemo, useRef, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { ArrowLeft, Paperclip } from "lucide-react"
import { Starfield } from "@/components/starfield"
import { useSpiral } from "@/components/spiral/spiral-provider"
import type { TruthScope } from "@/lib/spiral/reads"

// The circle page's visual language: Geist Pixel, pure-black sky, dim greys,
// "›" prefixes, ●/○ text toggles and pill outline buttons — no boxed shadcn
// chrome, no serif type.
const PIXEL = '"Geist Pixel", sans-serif'

const TABS: { id: TruthScope; label: string }[] = [
  { id: "about-me", label: "about me" },
  { id: "about-bond", label: "about a bond" },
]

const panelStyle: React.CSSProperties = {
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.16)",
  background: "rgba(0,0,0,0.35)",
  padding: 16,
}

const kickerStyle: React.CSSProperties = {
  fontFamily: PIXEL,
  fontSize: 10,
  letterSpacing: 3,
  textTransform: "uppercase",
  color: "rgba(255,255,255,0.45)",
}

export function SelfView() {
  const { truths, addTruth } = useSpiral()
  const [scope, setScope] = useState<TruthScope>("about-me")
  const [text, setText] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)

  const visible = useMemo(
    () => truths.filter((t) => t.scope === scope),
    [truths, scope],
  )

  function handleSubmit() {
    const trimmed = text.trim()
    if (!trimmed) return
    addTruth(trimmed, scope)
    setText("")
    toast.success("your words are now part of you")
  }

  function handleAttach(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) toast(`attached ${file.name} — we'll read it in later`)
    e.target.value = ""
  }

  return (
    <main
      className="relative flex min-h-[100dvh] flex-col overflow-hidden"
      style={{ background: "#000" }}
    >
      <Starfield count={70} />

      <header className="relative z-20 mx-auto w-full max-w-md px-5 pt-6">
        <Link
          href="/circle"
          className="inline-flex items-center gap-1.5 transition-colors"
          style={{
            fontFamily: PIXEL,
            fontSize: 10,
            letterSpacing: 3,
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.5)",
          }}
        >
          <ArrowLeft className="size-3.5" />
          spiral
        </Link>
        <h1
          className="mt-5 text-balance"
          style={{
            fontFamily: PIXEL,
            fontWeight: 500,
            fontSize: 22,
            letterSpacing: 1.5,
            color: "#f0f0f0",
          }}
        >
          what you know about yourself
        </h1>
        <p
          className="mt-3 max-w-sm text-pretty leading-relaxed"
          style={{
            fontFamily: PIXEL,
            fontSize: 12.5,
            letterSpacing: 0.4,
            color: "#6a6a6a",
          }}
        >
          <span style={{ color: "#555" }}>{"› "}</span>
          your own words, unprompted. you are always the authority here — the
          sky listens, it never argues.
        </p>
      </header>

      <div className="relative z-10 mx-auto w-full max-w-md flex-1 px-5 py-6">
        {/* Scope toggles — ●/○ text idiom, same as onboarding + add person */}
        <div className="mb-5 flex gap-5">
          {TABS.map((t) => {
            const selected = scope === t.id
            return (
              <button
                key={t.id}
                onClick={() => setScope(t.id)}
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  fontFamily: PIXEL,
                  fontSize: 11,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  color: selected ? "#f0f0f0" : "rgba(255,255,255,0.4)",
                }}
              >
                {(selected ? "● " : "○ ") + t.label}
              </button>
            )
          })}
        </div>

        {/* Free-text truth — the primary input */}
        <div style={panelStyle}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            placeholder={
              scope === "about-me"
                ? "something you know to be true about yourself…"
                : "something you know to be true about a bond…"
            }
            className="w-full resize-none bg-transparent outline-none"
            style={{
              fontFamily: PIXEL,
              fontWeight: 500,
              fontSize: 15,
              letterSpacing: 0.5,
              lineHeight: 1.6,
              color: "#fff",
              caretColor: "#fff",
            }}
          />
          <div
            className="mt-3 flex items-center justify-between gap-3 pt-3"
            style={{ borderTop: "1px solid rgba(255,255,255,0.16)" }}
          >
            <button
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-1.5 transition-colors"
              style={{
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
                fontFamily: PIXEL,
                fontSize: 10,
                letterSpacing: 2,
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.5)",
              }}
            >
              <Paperclip className="size-3.5" />
              attach a test
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.txt,.csv,.json,image/*"
              onChange={handleAttach}
              className="hidden"
            />
            <button
              onClick={handleSubmit}
              disabled={!text.trim()}
              style={{
                background: "transparent",
                border: `1px solid ${text.trim() ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.2)"}`,
                color: text.trim() ? "#f0f0f0" : "rgba(255,255,255,0.3)",
                fontFamily: PIXEL,
                fontSize: 11,
                letterSpacing: 2,
                padding: "9px 18px",
                borderRadius: 30,
                cursor: text.trim() ? "pointer" : "default",
              }}
            >
              {"add to your spiral ⏎"}
            </button>
          </div>
        </div>

        {/* Reflections on submitted truths.
            The stagger IS the differentiator: you speak (brightest, solid),
            the sky takes a beat and reflects (✦, dimmer, fades in ~600ms
            later), the tension surfaces last (~, dashed, dimmest). */}
        {visible.length > 0 && (
          <ul className="mt-8 flex flex-col gap-6">
            {visible.map((t) => (
              <li key={t.id} className="flex flex-col gap-3">
                {/* your words — the primary object. no symbol. */}
                <div
                  style={{
                    ...panelStyle,
                    border: "1px solid rgba(255,255,255,0.3)",
                  }}
                >
                  <p className="mb-2" style={kickerStyle}>
                    your words · now part of you
                  </p>
                  <p
                    className="text-pretty leading-relaxed"
                    style={{
                      fontFamily: PIXEL,
                      fontWeight: 500,
                      fontSize: 15,
                      letterSpacing: 0.5,
                      color: "#f0f0f0",
                    }}
                  >
                    {t.text}
                  </p>
                </div>

                {/* the sky reflects — appears a beat after your words. */}
                {t.reflection !== null && (
                  <div
                    className="animate-sky-beat"
                    style={{ ...panelStyle, animationDelay: "600ms" }}
                  >
                    <p className="mb-2" style={kickerStyle}>
                      {"✦ the sky reflects"}
                    </p>
                    <p
                      className="text-pretty leading-relaxed"
                      style={{
                        fontFamily: PIXEL,
                        fontSize: 13.5,
                        letterSpacing: 0.4,
                        color: "#b8b8b8",
                      }}
                    >
                      {t.reflection}
                    </p>
                  </div>
                )}

                {/* tension — surfaces last, kept not corrected. */}
                {t.tension && (
                  <div
                    className="animate-sky-beat"
                    style={{
                      ...panelStyle,
                      border: "1px dashed rgba(255,255,255,0.2)",
                      background: "transparent",
                      animationDelay: "1400ms",
                    }}
                  >
                    <p className="mb-2" style={kickerStyle}>
                      {"~ tension, kept — not corrected"}
                    </p>
                    <p
                      className="text-pretty leading-relaxed"
                      style={{
                        fontFamily: PIXEL,
                        fontSize: 12.5,
                        letterSpacing: 0.4,
                        color: "#6a6a6a",
                      }}
                    >
                      {t.tension}
                    </p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}
