"use client"

import { useState, useTransition } from "react"
import { saveReadResponse, saveSelfAnswer } from "@/app/actions/self-reads"
import {
  toQuestions,
  type FragmentRow,
  type ReadResponse,
  type SelfReadsData,
} from "@/lib/self/reads-data"

const MONO =
  "var(--font-space-mono), 'Space Mono', ui-monospace, SFMono-Regular, Menlo, monospace"
const GLOW = { color: "#f5f5f5", textShadow: "0 0 10px rgba(255,255,255,0.45)" }

export function SelfReads({
  data,
  onResponse,
  onAnswer,
}: {
  data: SelfReadsData
  /** fired when the user judges a fragment (drives the creature reaction) */
  onResponse?: (fragmentId: string, response: ReadResponse) => void
  /** fired when the user saves an answer (drives the creature reaction) */
  onAnswer?: (fragmentId: string) => void
}) {
  if (data.matched.length === 0) {
    return (
      <p
        style={{
          fontSize: 13.5,
          lineHeight: 1.65,
          letterSpacing: 0.3,
          color: "#6a6a6a",
          fontFamily: MONO,
        }}
      >
        <span style={{ color: "#555" }}>{"› "}</span>
        no reads have surfaced from your chart yet.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-10">
      {data.matched.map((f) => (
        <FragmentCard
          key={String(f.id)}
          fragment={f}
          initialResponse={data.responses[String(f.id)] ?? null}
          initialAnswer={data.answers[String(f.id)] ?? ""}
          onResponse={onResponse}
          onAnswer={onAnswer}
        />
      ))}
    </div>
  )
}

function FragmentCard({
  fragment,
  initialResponse,
  initialAnswer,
  onResponse,
  onAnswer,
}: {
  fragment: FragmentRow
  initialResponse: ReadResponse | null
  initialAnswer: string
  onResponse?: (fragmentId: string, response: ReadResponse) => void
  onAnswer?: (fragmentId: string) => void
}) {
  const [response, setResponse] = useState<ReadResponse | null>(initialResponse)
  const [pending, startTransition] = useTransition()
  const questions = toQuestions(fragment.self_questions)

  function choose(next: ReadResponse) {
    if (pending) return
    const previous = response
    setResponse(next) // optimistic
    onResponse?.(String(fragment.id), next) // animate the creature
    startTransition(async () => {
      const res = await saveReadResponse(String(fragment.id), next)
      if (!res.ok) setResponse(previous) // roll back on failure
    })
  }

  return (
    <article className="flex flex-col gap-4">
      {fragment.title && (
        <h3
          style={{
            ...GLOW,
            fontSize: 15,
            lineHeight: 1.5,
            letterSpacing: 0.4,
            fontFamily: MONO,
          }}
        >
          {fragment.title}
        </h3>
      )}
      {fragment.body && (
        <p
          style={{
            fontSize: 13.5,
            lineHeight: 1.7,
            letterSpacing: 0.3,
            color: "#9a9a9a",
            fontFamily: MONO,
          }}
        >
          <span style={{ color: "#555" }}>{"› "}</span>
          {fragment.body}
        </p>
      )}

      {/* agree / disagree */}
      <div className="flex items-center gap-5">
        <ResponseButton
          label="this fits"
          active={response === "agree"}
          activeColor="#f5f5f5"
          onClick={() => choose("agree")}
        />
        <ResponseButton
          label="not me"
          active={response === "disagree"}
          activeColor="#8a8a8a"
          onClick={() => choose("disagree")}
        />
      </div>

      {/* self-questions + answer — only after they agree */}
      {response === "agree" && questions.length > 0 && (
        <AnswerBlock
          fragmentId={String(fragment.id)}
          questions={questions}
          initialAnswer={initialAnswer}
          onAnswer={onAnswer}
        />
      )}
    </article>
  )
}

function ResponseButton({
  label,
  active,
  activeColor,
  onClick,
}: {
  label: string
  active: boolean
  activeColor: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        fontFamily: MONO,
        fontSize: 10,
        letterSpacing: 1.5,
        textTransform: "uppercase",
        color: active ? activeColor : "#3f3f3f",
        textShadow: active && activeColor === "#f5f5f5"
          ? "0 0 8px rgba(255,255,255,0.4)"
          : "none",
        background: "transparent",
        border: "none",
        padding: 0,
        cursor: "pointer",
        transition: "color .16s",
      }}
    >
      {active ? `· ${label}` : label}
    </button>
  )
}

function AnswerBlock({
  fragmentId,
  questions,
  initialAnswer,
  onAnswer,
}: {
  fragmentId: string
  questions: string[]
  initialAnswer: string
  onAnswer?: (fragmentId: string) => void
}) {
  const [answer, setAnswer] = useState(initialAnswer)
  const [editing, setEditing] = useState(initialAnswer.length === 0)
  const [draft, setDraft] = useState(initialAnswer)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function save() {
    const text = draft.trim()
    if (!text || pending) return
    setError(null)
    startTransition(async () => {
      const res = await saveSelfAnswer(fragmentId, text)
      if (res.ok) {
        setAnswer(text)
        setEditing(false)
        onAnswer?.(fragmentId) // animate the creature (soft shimmer)
      } else {
        setError(res.error)
      }
    })
  }

  return (
    <div
      className="mt-1 flex flex-col gap-3 pl-4"
      style={{ borderLeft: "1px solid #1a1a1a" }}
    >
      <ul className="flex flex-col gap-1.5">
        {questions.map((q, i) => (
          <li
            key={i}
            style={{
              fontSize: 12.5,
              lineHeight: 1.6,
              letterSpacing: 0.3,
              color: "#7a7a7a",
              fontFamily: MONO,
            }}
          >
            {q}
          </li>
        ))}
      </ul>

      {editing ? (
        <div className="flex flex-col gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            placeholder="say it in your own words…"
            className="w-full resize-none rounded-md bg-transparent px-3 py-2 outline-none"
            style={{
              fontFamily: MONO,
              fontSize: 13,
              lineHeight: 1.6,
              letterSpacing: 0.3,
              color: "#dcdcdc",
              border: "1px solid #1f1f1f",
            }}
          />
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={save}
              disabled={!draft.trim() || pending}
              style={{
                fontFamily: MONO,
                fontSize: 10,
                letterSpacing: 1.5,
                textTransform: "uppercase",
                color: draft.trim() && !pending ? "#cfcfcf" : "#3a3a3a",
                background: "transparent",
                border: "none",
                padding: 0,
                cursor: draft.trim() && !pending ? "pointer" : "default",
              }}
            >
              {pending ? "saving…" : "save"}
            </button>
            {answer.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setDraft(answer)
                  setEditing(false)
                  setError(null)
                }}
                style={{
                  fontFamily: MONO,
                  fontSize: 10,
                  letterSpacing: 1.5,
                  textTransform: "uppercase",
                  color: "#3f3f3f",
                  background: "transparent",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                }}
              >
                cancel
              </button>
            )}
          </div>
          {error && (
            <p style={{ fontSize: 11, color: "#d98a9a", fontFamily: MONO }}>
              {error}
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <p
            style={{
              fontSize: 13,
              lineHeight: 1.65,
              letterSpacing: 0.3,
              color: "#c4c4c4",
              fontFamily: MONO,
              whiteSpace: "pre-wrap",
            }}
          >
            {answer}
          </p>
          <button
            type="button"
            onClick={() => {
              setDraft(answer)
              setEditing(true)
            }}
            style={{
              fontFamily: MONO,
              fontSize: 10,
              letterSpacing: 1.5,
              textTransform: "uppercase",
              color: "#3f3f3f",
              background: "transparent",
              border: "none",
              padding: 0,
              alignSelf: "flex-start",
              cursor: "pointer",
            }}
          >
            edit
          </button>
        </div>
      )}
    </div>
  )
}
