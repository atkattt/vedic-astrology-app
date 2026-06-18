"use client"

import { useMemo, useRef, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { ArrowLeft, Paperclip, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { Starfield } from "@/components/starfield"
import { Button } from "@/components/ui/button"
import { useSpiral } from "@/components/spiral/spiral-provider"
import type { TruthScope } from "@/lib/spiral/reads"

const TABS: { id: TruthScope; label: string }[] = [
  { id: "about-me", label: "About me" },
  { id: "about-bond", label: "About a bond" },
]

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
    toast.success("Your words are now part of you")
  }

  function handleAttach(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) toast(`Attached ${file.name} — we'll read it in later`)
    e.target.value = ""
  }

  return (
    <main className="relative flex min-h-[100dvh] flex-col overflow-hidden">
      <Starfield count={70} />

      <header className="relative z-20 px-5 pt-6">
        <Link
          href="/circle"
          className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Spiral
        </Link>
        <h1 className="mt-4 text-balance font-serif text-3xl font-light">
          What you know about yourself
        </h1>
        <p className="mt-2 max-w-sm text-pretty font-serif text-sm italic leading-relaxed text-muted-foreground">
          Your own words, unprompted. You are always the authority here — the
          sky listens, it never argues.
        </p>
      </header>

      <div className="relative z-10 mx-auto w-full max-w-md flex-1 px-5 py-6">
        {/* Scope tabs */}
        <div className="mb-4 flex gap-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setScope(t.id)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-widest transition-colors",
                scope === t.id
                  ? "border-foreground/40 bg-secondary text-foreground"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Free-text truth — the primary input */}
        <div className="rounded-2xl border border-border bg-popover/70 p-4 backdrop-blur-sm">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            placeholder={
              scope === "about-me"
                ? "Something you know to be true about yourself…"
                : "Something you know to be true about a bond…"
            }
            className="w-full resize-none bg-transparent font-serif text-base leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/60"
          />
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3">
            <button
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
            >
              <Paperclip className="size-3.5" />
              Attach a test
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.txt,.csv,.json,image/*"
              onChange={handleAttach}
              className="hidden"
            />
            <Button
              onClick={handleSubmit}
              disabled={!text.trim()}
              className="rounded-full px-6 font-mono text-xs uppercase tracking-widest"
            >
              Add to your spiral
            </Button>
          </div>
        </div>

        {/* Reflections on submitted truths */}
        {visible.length > 0 && (
          <ul className="mt-8 flex flex-col gap-6">
            {visible.map((t) => (
              <li key={t.id} className="flex flex-col gap-3">
                <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
                  <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.3em] text-primary/80">
                    Your words · now part of you
                  </p>
                  <p className="text-pretty font-serif text-lg font-light leading-relaxed text-foreground">
                    {t.text}
                  </p>
                </div>

                <div className="rounded-2xl border border-border bg-popover/70 p-4 backdrop-blur-sm">
                  <p className="mb-2 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                    <Sparkles className="size-3" />
                    The sky reflects
                  </p>
                  <p className="text-pretty font-serif text-base italic leading-relaxed text-foreground/90">
                    {t.reflection}
                  </p>
                </div>

                {t.tension && (
                  <div className="rounded-2xl border border-dashed border-border bg-secondary/30 p-4">
                    <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                      Tension, kept — not corrected
                    </p>
                    <p className="text-pretty font-serif text-sm italic leading-relaxed text-muted-foreground">
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
