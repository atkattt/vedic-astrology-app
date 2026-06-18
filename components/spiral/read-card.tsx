"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Check, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useSpiral } from "@/components/spiral/spiral-provider"
import { REASON_TAGS, type Read, type ReasonTag } from "@/lib/spiral/reads"

type Phase = "idle" | "agreeing" | "reasons" | "leaving"

export function ReadCard({
  read,
  onResolved,
  className,
  label,
}: {
  read: Read
  // Called once the read has been filed (agree or disagree) and the
  // exit animation has finished, so the parent can advance to the next read.
  onResolved?: () => void
  className?: string
  label?: string
}) {
  const { agree, disagree } = useSpiral()
  const [phase, setPhase] = useState<Phase>("idle")

  function handleAgree() {
    if (phase !== "idle") return
    setPhase("agreeing")
    toast.success("Filed to your spiral")
    window.setTimeout(() => {
      agree(read)
      onResolved?.()
    }, 850)
  }

  function handleDisagree() {
    if (phase !== "idle") return
    setPhase("reasons")
  }

  function handleReason(reason: ReasonTag) {
    disagree(read, reason)
    setPhase("leaving")
    toast(reason === "skip" ? "Filed to your history" : `Filed · ${reason}`)
    window.setTimeout(() => {
      onResolved?.()
    }, 400)
  }

  return (
    <div
      className={cn(
        "relative rounded-2xl border border-border bg-popover/80 p-6 backdrop-blur-sm transition-colors",
        phase === "agreeing" && "animate-agree-glow border-[oklch(0.72_0.14_155_/_0.6)]",
        phase === "leaving" && "animate-card-fade-out",
        className,
      )}
    >
      {label && (
        <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          {label}
        </p>
      )}

      <p
        className={cn(
          "text-balance font-serif text-xl font-light italic leading-relaxed text-foreground transition-opacity",
          phase === "reasons" && "opacity-40",
        )}
      >
        {read.text}
      </p>

      {phase === "reasons" ? (
        <div className="mt-5">
          <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            What made it wrong?
          </p>
          <div className="flex flex-wrap gap-2">
            {REASON_TAGS.map((tag) => (
              <button
                key={tag}
                onClick={() => handleReason(tag)}
                className="rounded-full border border-border px-3 py-1.5 font-mono text-xs lowercase tracking-wide text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-6 flex gap-3">
          <button
            onClick={handleAgree}
            disabled={phase !== "idle"}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-primary py-2.5 font-mono text-xs uppercase tracking-widest text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            <Check className="size-4" />
            Agree
          </button>
          <button
            onClick={handleDisagree}
            disabled={phase !== "idle"}
            className="flex flex-1 items-center justify-center gap-2 rounded-full border border-border py-2.5 font-mono text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground disabled:opacity-60"
          >
            <X className="size-4" />
            Disagree
          </button>
        </div>
      )}
    </div>
  )
}
