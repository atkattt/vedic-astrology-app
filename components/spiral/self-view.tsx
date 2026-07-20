"use client"

import { useMemo, useRef, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { ArrowLeft, Paperclip } from "lucide-react"
import { Starfield } from "@/components/starfield"
import { useSpiral } from "@/components/spiral/spiral-provider"
import type { Truth, TruthScope } from "@/lib/spiral/reads"

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

// The entry actions row: quiet lowercase, dim, letterspaced.
const actionStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  padding: 0,
  cursor: "pointer",
  fontFamily: PIXEL,
  fontSize: 10,
  letterSpacing: 2,
  textTransform: "lowercase",
  color: "rgba(255,255,255,0.5)",
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

        {/* Free-text entry — the primary input */}
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
              style={actionStyle}
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

        {/* Kept entries. Saving quietly settles the entry into the list —
            no sky commentary. Tap (mobile) or hover (desktop) an entry to
            reveal its three quiet actions. */}
        {visible.length > 0 && (
          <ul className="mt-8 flex flex-col gap-4">
            {visible.map((t) => (
              <EntryCard key={t.id} truth={t} />
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}

// The creature's minimal face, as a tiny inline glyph — its eyes ("o o" at
// full size) reduced to two dots. Used as the send action's icon and as the
// permanent dim mark a sent entry wears.
const FACE_GLYPH = "[..]"

/**
 * One kept entry. The card is the user's words alone; actions stay hidden
 * until hover (desktop) or tap (mobile — first tap reveals, actions then
 * work normally). "send to your self" hands the entry to the self — the
 * text briefly drifts toward the action, then the entry stays, wearing a
 * small dim creature-face mark. Edit swaps the text for an inline textarea
 * on the same card; delete asks "let this one go?" in place.
 */
function EntryCard({ truth }: { truth: Truth }) {
  const { editTruth, deleteTruth, sendTruth } = useSpiral()
  const [revealed, setRevealed] = useState(false)
  const [mode, setMode] = useState<"view" | "edit" | "confirm-delete">("view")
  const [draft, setDraft] = useState(truth.text)
  // "sending" plays the essence-travel animation before the mark settles in.
  const [sending, setSending] = useState(false)
  const [markLabel, setMarkLabel] = useState(false)

  function startSend() {
    if (truth.sentToSelf || sending) return
    setSending(true)
    // Let the drift + pulse play, then commit — the mark fades in with the
    // state change.
    setTimeout(() => {
      sendTruth(truth.id)
      setSending(false)
    }, 700)
  }

  function saveEdit() {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== truth.text) editTruth(truth.id, trimmed)
    setMode("view")
  }

  return (
    <li
      className="group animate-sky-beat"
      onMouseEnter={() => setRevealed(true)}
      onMouseLeave={() => mode === "view" && setRevealed(false)}
    >
      <div
        className="relative"
        style={{ ...panelStyle, border: "1px solid rgba(255,255,255,0.3)" }}
        onClick={() => !revealed && setRevealed(true)}
      >
        {/* Permanent mark on a sent entry: the tiny creature face, dim, in
            the corner. Tap it to see what it means. */}
        {truth.sentToSelf && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              setMarkLabel((v) => !v)
            }}
            aria-label="your self holds this"
            className="absolute right-3 top-2.5 flex items-center gap-2"
            style={{
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              fontFamily: PIXEL,
              fontSize: 10,
              letterSpacing: 1,
              color: "rgba(255,255,255,0.28)",
            }}
          >
            {markLabel && (
              <span style={{ color: "rgba(255,255,255,0.4)" }}>
                your self holds this
              </span>
            )}
            {FACE_GLYPH}
          </button>
        )}

        {mode === "edit" ? (
          <>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={3}
              autoFocus
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
            <div className="mt-2 flex gap-5">
              <button onClick={saveEdit} style={{ ...actionStyle, color: "#f0f0f0" }}>
                save
              </button>
              <button
                onClick={() => {
                  setDraft(truth.text)
                  setMode("view")
                }}
                style={actionStyle}
              >
                cancel
              </button>
            </div>
          </>
        ) : (
          <>
            <p
              className={`text-pretty leading-relaxed ${sending ? "animate-send-essence" : ""}`}
              style={{
                fontFamily: PIXEL,
                fontWeight: 500,
                fontSize: 15,
                letterSpacing: 0.5,
                color: "#f0f0f0",
                paddingRight: truth.sentToSelf ? 36 : undefined,
              }}
            >
              {truth.text}
            </p>

            {mode === "confirm-delete" ? (
              <div className="mt-3 flex items-center gap-5">
                <span
                  style={{
                    fontFamily: PIXEL,
                    fontSize: 11,
                    letterSpacing: 1,
                    color: "#8a8a8a",
                  }}
                >
                  let this one go?
                </span>
                <button
                  onClick={() => deleteTruth(truth.id)}
                  style={{ ...actionStyle, color: "#d98a9a" }}
                >
                  yes
                </button>
                <button onClick={() => setMode("view")} style={actionStyle}>
                  no
                </button>
              </div>
            ) : (
              <div
                className={`mt-3 flex items-center gap-5 transition-opacity duration-200 md:opacity-0 md:group-hover:opacity-100 ${
                  revealed ? "opacity-100" : "opacity-0"
                }`}
              >
                {!truth.sentToSelf && (
                  <button
                    onClick={startSend}
                    disabled={sending}
                    className="inline-flex items-center gap-1.5"
                    style={{
                      ...actionStyle,
                      color: sending ? "#f0f0f0" : "#c9c9c9",
                    }}
                  >
                    <span aria-hidden="true">{FACE_GLYPH}</span>
                    send to your self
                  </button>
                )}
                <button
                  onClick={() => {
                    setDraft(truth.text)
                    setMode("edit")
                  }}
                  style={actionStyle}
                >
                  edit
                </button>
                <button
                  onClick={() => setMode("confirm-delete")}
                  style={actionStyle}
                >
                  delete
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </li>
  )
}
