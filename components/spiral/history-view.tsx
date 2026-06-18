"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { ArrowLeft, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"
import { Starfield } from "@/components/starfield"
import { useSpiral } from "@/components/spiral/spiral-provider"
import type { DisagreedRead } from "@/lib/spiral/reads"

type Tab = "all" | "about-you" | "bond"

const TABS: { id: Tab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "about-you", label: "About you" },
  { id: "bond", label: "Bonds" },
]

export function HistoryView() {
  const { disagreed, restore } = useSpiral()
  const [tab, setTab] = useState<Tab>("all")
  const [leaving, setLeaving] = useState<string | null>(null)

  const filtered = useMemo(() => {
    if (tab === "all") return disagreed
    return disagreed.filter((r) => r.category === tab)
  }, [disagreed, tab])

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
          A portrait in negative space — everything you said no to. Nothing here
          is deleted, only filed.
        </p>
      </header>

      {/* Tabs */}
      <div className="relative z-20 mt-5 flex gap-2 px-5">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-widest transition-colors",
              tab === t.id
                ? "border-foreground/40 bg-secondary text-foreground"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="relative z-10 flex-1 px-5 py-6">
        {filtered.length === 0 ? (
          <p className="mx-auto mt-10 max-w-xs text-pretty text-center font-serif text-sm italic text-muted-foreground">
            Nothing filed here yet. What you disagree with will gather in this
            place.
          </p>
        ) : (
          <ul className="mx-auto flex max-w-md flex-col gap-3">
            {filtered.map((read) => (
              <li
                key={read.id}
                className={cn(
                  "rounded-2xl border border-border bg-popover/70 p-4 backdrop-blur-sm",
                  leaving === read.id && "animate-card-fade-out",
                )}
              >
                <p className="text-pretty font-serif text-base italic leading-relaxed text-foreground/90">
                  {read.text}
                </p>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="rounded-full bg-secondary/70 px-2.5 py-1 font-mono text-[10px] lowercase tracking-wide text-muted-foreground">
                    {read.reason}
                    {read.subjectName ? ` · ${read.subjectName}` : ""}
                  </span>
                  <button
                    onClick={() => handleRestore(read)}
                    className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <RotateCcw className="size-3.5" />
                    Restore
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}
