"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { ArrowLeft, RotateCcw, Check, X, Undo2, Heart } from "lucide-react"
import { cn } from "@/lib/utils"
import { Starfield } from "@/components/starfield"
import { useSpiral } from "@/components/spiral/spiral-provider"
import type { DisagreedRead, Read } from "@/lib/spiral/reads"

type Stance = "all" | "kept" | "released" | "bonds"

// A unified history row — a read plus whether it was kept (agreed) or released
// (disagreed). Released rows carry the disagree reason.
type Entry =
  | { stance: "kept"; read: Read }
  | { stance: "released"; read: DisagreedRead }

const TABS: { id: Stance; label: string }[] = [
  { id: "all", label: "All" },
  { id: "kept", label: "Kept" },
  { id: "released", label: "Released" },
  { id: "bonds", label: "Bonds" },
]

export function HistoryView() {
  const { agreed, disagreed, restore, disagree } = useSpiral()
  const [tab, setTab] = useState<Stance>("all")
  const [leaving, setLeaving] = useState<string | null>(null)

  // Kept first (most recently agreed at the top), then released. Both lists are
  // already stored newest-first by the provider.
  const entries = useMemo<Entry[]>(() => {
    const kept: Entry[] = agreed.map((read) => ({ stance: "kept", read }))
    const released: Entry[] = disagreed.map((read) => ({ stance: "released", read }))
    if (tab === "kept") return kept
    if (tab === "released") return released
    const all = [...kept, ...released]
    if (tab === "bonds") return all.filter((e) => e.read.category === "bond")
    return all
  }, [agreed, disagreed, tab])

  const counts = useMemo(
    () => ({
      all: agreed.length + disagreed.length,
      kept: agreed.length,
      released: disagreed.length,
      bonds: [...agreed, ...disagreed].filter((r) => r.category === "bond").length,
    }),
    [agreed, disagreed],
  )

  // Move a kept read back out onto the "released" side.
  function handleRelease(read: Read) {
    setLeaving(read.id)
    toast("Released — moved to what you let go")
    window.setTimeout(() => {
      disagree(read, "used to be")
      setLeaving(null)
    }, 400)
  }

  // Pull a released read back onto the spiral / into what you keep.
  function handleRestore(read: DisagreedRead) {
    setLeaving(read.id)
    toast("Pulled back onto your spiral")
    window.setTimeout(() => {
      restore(read.id)
      setLeaving(null)
    }, 400)
  }

  return (
    <main className="relative flex min-h-[100dvh] flex-col overflow-hidden">
      <Starfield count={70} />

      <header className="relative z-20 mx-auto w-full max-w-md px-5 pt-6">
        <Link
          href="/circle"
          className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Spiral
        </Link>
        <h1 className="mt-4 font-serif text-3xl font-light md:text-4xl">History</h1>
        <p className="mt-2 max-w-sm text-pretty font-serif text-sm italic leading-relaxed text-muted-foreground md:max-w-md md:text-base">
          A portrait drawn in what you claimed and what you let go — every read
          you kept, every one you released, and the bonds between. Nothing here
          is deleted, and nothing is final: keep or release, anytime.
        </p>
      </header>

      {/* Stance filter */}
      <div className="relative z-20 mt-5 flex flex-wrap gap-2 px-5">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-widest transition-colors",
              tab === t.id
                ? "border-foreground/40 bg-secondary text-foreground"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {t.id === "bonds" && <Heart className="size-3" />}
            {t.label}
            <span className="text-muted-foreground/70">{counts[t.id]}</span>
          </button>
        ))}
      </div>

      {/* List */}
      <div className="relative z-10 flex-1 px-5 py-6">
        {entries.length === 0 ? (
          <p className="mx-auto mt-10 max-w-xs text-pretty text-center font-serif text-sm italic text-muted-foreground">
            {tab === "kept"
              ? "Nothing kept yet. What resonates with you will gather here."
              : tab === "released"
                ? "Nothing released yet. What you let go of will be filed here."
                : tab === "bonds"
                  ? "No bonds yet. Reads about the people in your orbit will gather here."
                  : "Your history is empty. Answer the reads on your spiral and they'll gather here."}
          </p>
        ) : (
          <ul className="mx-auto flex max-w-md flex-col gap-3">
            {entries.map((entry) => {
              const { read, stance } = entry
              const kept = stance === "kept"
              const isBond = read.category === "bond"
              return (
                <li
                  key={`${stance}-${read.id}`}
                  className={cn(
                    "rounded-2xl border bg-popover/70 p-4 backdrop-blur-sm",
                    kept ? "border-primary/40" : "border-border",
                    leaving === read.id && "animate-card-fade-out",
                  )}
                >
                  {/* Stance marker + read text */}
                  <div className="flex items-start gap-2.5">
                    <span
                      className={cn(
                        "mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full border",
                        kept
                          ? "border-primary/50 text-primary"
                          : "border-muted-foreground/40 text-muted-foreground",
                      )}
                      aria-hidden
                    >
                      {kept ? <Check className="size-3" /> : <X className="size-3" />}
                    </span>
                    <p className="text-pretty font-serif text-base italic leading-relaxed text-foreground/90">
                      {read.text}
                    </p>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2 pl-[30px]">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-mono text-[10px] lowercase tracking-wide",
                        kept
                          ? "bg-primary/10 text-primary/90"
                          : "bg-secondary/70 text-muted-foreground",
                      )}
                    >
                      {isBond && <Heart className="size-2.5" />}
                      {kept
                        ? `kept · ${isBond ? "bond" : "about you"}`
                        : `${(read as DisagreedRead).reason}`}
                      {read.subjectName ? ` · ${read.subjectName}` : ""}
                    </span>

                    {/* Every row can flip its stance: kept → release,
                        released → bring back. */}
                    {kept ? (
                      <button
                        onClick={() => handleRelease(read)}
                        className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <Undo2 className="size-3.5" />
                        Release
                      </button>
                    ) : (
                      <button
                        onClick={() => handleRestore(read as DisagreedRead)}
                        className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <RotateCcw className="size-3.5" />
                        Bring back
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </main>
  )
}
