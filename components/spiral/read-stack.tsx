"use client"

import { Sparkles } from "lucide-react"
import { useSpiral } from "@/components/spiral/spiral-provider"
import { ReadCard } from "@/components/spiral/read-card"

export function ReadStack() {
  const { currentRead, queue } = useSpiral()

  if (!currentRead) {
    return (
      <div className="rounded-2xl border border-border bg-popover/60 p-6 text-center backdrop-blur-sm">
        <span className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Sparkles className="size-5" />
        </span>
        <p className="text-balance font-serif text-base italic leading-relaxed text-muted-foreground">
          You&apos;ve read everything the sky has for now. Add a truth of your
          own, or revisit your history.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between px-1">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          A read about you
        </p>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          {queue.length} left
        </p>
      </div>
      {/* key forces a fresh card (and fresh phase state) for each read */}
      <ReadCard key={currentRead.id} read={currentRead} />
    </div>
  )
}
