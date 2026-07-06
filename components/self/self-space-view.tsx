"use client"

import Link from "next/link"
import { ArrowLeft, Lock } from "lucide-react"
import SelfAvatar from "@/components/circle/SelfAvatar"
import { Starfield } from "@/components/starfield"
import { SelfChat } from "@/components/self/self-chat"
import { SelfReads } from "@/components/self/self-reads"
import { CHAT_UNLOCK_RADIUS, unlockProgress } from "@/lib/self/unlock"
import type { SelfReadsData } from "@/lib/self/reads-data"

const MONO =
  "var(--font-space-mono), 'Space Mono', ui-monospace, SFMono-Regular, Menlo, monospace"

export function SelfSpaceView({
  revealRadius,
  reads,
}: {
  revealRadius: number
  reads: SelfReadsData | null
}) {
  const progress = unlockProgress(revealRadius)
  const unlocked = revealRadius >= CHAT_UNLOCK_RADIUS
  // The self grows more defined as the frontier expands.
  const growth = Math.min(1, 0.32 + progress * 0.68)

  return (
    <main className="relative flex min-h-[100dvh] flex-col bg-background">
      <Starfield count={70} />

      <header className="relative z-20 flex items-center px-5 pt-6">
        <Link
          href="/circle"
          className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          back
        </Link>
      </header>

      <div className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col gap-10 px-5 pb-24 pt-6">
        {/* 1 — The self avatar. Rendered identically to the spiral center in
            the circle: same neutral tint (#e8e4da) and same size (230) so the
            face + glow read exactly the same. */}
        <section className="flex flex-col items-center gap-3">
          <SelfAvatar mood="idle" color="#e8e4da" growth={growth} size={230} />
          <p
            className="text-center font-serif text-base font-light lowercase text-foreground"
            style={{ textWrap: "balance" }}
          >
            this is you, still taking shape
          </p>
        </section>

        {/* 2 — Talk to your self (gated) */}
        <section className="flex flex-col gap-3">
          <SectionLabel>talk to your self</SectionLabel>
          {unlocked ? <SelfChat /> : <LockedChat progress={progress} />}
        </section>

        {/* 3 — Full personality read: authored fragments matched to the chart */}
        <section className="flex flex-col gap-5">
          <SectionLabel>your chart, read in full</SectionLabel>
          {reads ? (
            <SelfReads data={reads} />
          ) : (
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
              sign in to see your chart read in full.
            </p>
          )}
        </section>
      </div>
    </main>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontSize: 10,
        letterSpacing: 2,
        textTransform: "uppercase",
        color: "#4a4a4a",
        fontFamily: MONO,
      }}
    >
      {children}
    </span>
  )
}

/** Locked state: explains the conversation opens as more reads are unlocked. */
function LockedChat({ progress }: { progress: number }) {
  const pct = Math.round(progress * 100)
  return (
    <div
      className="flex flex-col items-center gap-4 rounded-2xl px-6 py-9 text-center"
      style={{ background: "#070707", border: "1px solid #1a1a1a" }}
    >
      <div
        className="flex size-10 items-center justify-center rounded-full"
        style={{ border: "1px solid #2a2a2a", color: "#6a6a6a" }}
      >
        <Lock className="size-4" />
      </div>
      <p
        style={{
          fontSize: 13.5,
          lineHeight: 1.65,
          letterSpacing: 0.3,
          color: "#8a8a8a",
          fontFamily: MONO,
          maxWidth: 260,
        }}
      >
        your self doesn&apos;t have enough to say yet. keep exploring the spiral
        and unlocking reads — this conversation opens as you go deeper.
      </p>

      {/* Progress toward unlock */}
      <div className="mt-1 flex w-full max-w-[220px] flex-col gap-2">
        <div
          className="h-px w-full overflow-hidden"
          style={{ background: "#1c1c1c" }}
        >
          <div
            className="h-full"
            style={{
              width: `${Math.max(4, pct)}%`,
              background: "#f5f5f5",
              boxShadow: "0 0 8px rgba(255,255,255,0.5)",
              transition: "width .5s ease-out",
            }}
          />
        </div>
        <span
          style={{
            fontSize: 9,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: "#4a4a4a",
            fontFamily: MONO,
          }}
        >
          {pct}% toward opening
        </span>
      </div>
    </div>
  )
}
