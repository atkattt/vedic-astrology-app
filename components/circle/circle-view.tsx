"use client"

import { useCallback, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { Person } from "@/lib/db/schema"
import { authClient } from "@/lib/auth-client"
import { RELATIONSHIP_LABELS, type RelationshipKind } from "@/lib/relationships"
import { Starfield } from "@/components/starfield"
import { AddPersonDialog } from "@/components/circle/add-person-dialog"
import { ConnectDialog } from "@/components/circle/connect-dialog"
import { PersonDetail, type Bond } from "@/components/circle/person-detail"
import { SpiralConstellation } from "@/components/circle/spiral-constellation"
import { AvatarReadSheet } from "@/components/circle/avatar-read-sheet"
import type { Mood } from "@/components/circle/SelfAvatar"
import { buildColorMap } from "@/lib/circle/colors"
import { useCircleData } from "@/components/circle/circle-data-provider"
import { useSpiral } from "@/components/spiral/spiral-provider"
import ReadHub from "@/components/spiral/read-hub"
import { type ReasonTag } from "@/lib/spiral/reads"
import { Button } from "@/components/ui/button"
import { Plus, LogOut, Sparkles, Clock, PenLine, Menu, X } from "lucide-react"

export function CircleView({ userName }: { userName: string }) {
  const router = useRouter()
  const { guest, people, relationships } = useCircleData()
  const { currentRead, queue, agree, disagree } = useSpiral()
  const [addOpen, setAddOpen] = useState(false)
  const [selected, setSelected] = useState<Person | null>(null)
  const [connectFrom, setConnectFrom] = useState<Person | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [readSheetOpen, setReadSheetOpen] = useState(false)

  // The central avatar's expression. Agree/disagree flash a transient mood that
  // auto-returns to "idle" so it can be re-triggered on the next read.
  const [mood, setMood] = useState<Mood>("idle")
  const moodTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const flashMood = useCallback((m: Mood) => {
    if (moodTimer.current) clearTimeout(moodTimer.current)
    // Snap to idle first so re-picking the same answer twice in a row still
    // re-triggers the expression (prop must actually change), then flash it.
    setMood("idle")
    requestAnimationFrame(() => setMood(m))
    moodTimer.current = setTimeout(() => setMood("idle"), 1400)
  }, [])

  const handleAgree = useCallback(() => {
    if (!currentRead) return
    flashMood("agree")
    agree(currentRead)
  }, [currentRead, agree, flashMood])

  const handleDisagree = useCallback(
    (reason?: string) => {
      if (!currentRead) return
      flashMood("disagree")
      disagree(currentRead, (reason ?? "skip") as ReasonTag)
    },
    [currentRead, disagree, flashMood],
  )

  const peopleById = useMemo(() => {
    const map = new Map<number, Person>()
    for (const p of people) map.set(p.id, p)
    return map
  }, [people])

  // Stable per-person accent color, assigned in the order people were added.
  const colorById = useMemo(() => buildColorMap(people), [people])

  // Bonds for the currently selected person.
  const selectedBonds = useMemo<Bond[]>(() => {
    if (!selected) return []
    return relationships
      .filter(
        (r) => r.fromPersonId === selected.id || r.toPersonId === selected.id,
      )
      .map((r) => {
        const otherId =
          r.fromPersonId === selected.id ? r.toPersonId : r.fromPersonId
        const other = peopleById.get(otherId)
        if (!other) return null
        return {
          relationship: r,
          other,
          label: RELATIONSHIP_LABELS[r.kind as RelationshipKind] ?? r.kind,
        }
      })
      .filter((x): x is Bond => x !== null)
  }, [selected, relationships, peopleById])

  async function handleSignOut() {
    if (guest) {
      document.cookie = "spiral_guest=; Max-Age=0; path=/"
      router.push("/")
      router.refresh()
      return
    }
    await authClient.signOut()
    router.push("/")
    router.refresh()
  }

  return (
    <main className="relative flex min-h-[100dvh] flex-col overflow-hidden">
      <Starfield count={90} />

      {/* Header: exit on the left, burger menu on the top-right corner */}
      <header className="relative z-30 flex items-center justify-between px-5 pt-6">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
        >
          <LogOut className="size-3.5" />
          {guest ? "Exit" : "Leave"}
        </button>

        {/* Entry points collapsed into a burger menu that drops down */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
          >
            {menuOpen ? <X className="size-3.5" /> : <Menu className="size-3.5" />}
            Menu
          </button>

          {menuOpen && (
            <>
              {/* Click-away layer so tapping outside closes the menu */}
              <button
                aria-hidden="true"
                tabIndex={-1}
                onClick={() => setMenuOpen(false)}
                className="fixed inset-0 z-0 cursor-default"
              />
              <div
                role="menu"
                className="absolute right-0 top-full z-10 mt-3 flex w-52 flex-col gap-1 rounded-2xl border border-border bg-popover/90 p-2 shadow-xl backdrop-blur-md"
              >
                <MenuItem
                  icon={<Plus className="size-4" />}
                  label="Add person"
                  onClick={() => {
                    setMenuOpen(false)
                    setAddOpen(true)
                  }}
                />
                <MenuItem
                  icon={<Clock className="size-4" />}
                  label="History"
                  href="/history"
                  onNavigate={() => setMenuOpen(false)}
                />
                <MenuItem
                  icon={<PenLine className="size-4" />}
                  label="What you know"
                  href="/self"
                  onNavigate={() => setMenuOpen(false)}
                />
              </div>
            </>
          )}
        </div>
      </header>

      {/* Constellation canvas — a drawn spiral with "You" at its center */}
      <div className="relative z-10 flex-1">
        {people.length === 0 ? (
          <EmptyState onAdd={() => setAddOpen(true)} />
        ) : (
          <SpiralConstellation
            people={people}
            relationships={relationships}
            colorById={colorById}
            onSelect={setSelected}
            onSelectSelf={() => setReadSheetOpen(true)}
            mood={mood}
          />
        )}
      </div>

      {/* Core loop: a read about you, surfaced over the constellation */}
      <div className="relative z-20 mx-auto flex w-full max-w-md justify-center px-5 pb-8 pt-4">
        {currentRead ? (
          <ReadHub
            read={currentRead.text}
            remaining={queue.length}
            onAgree={handleAgree}
            onDisagree={handleDisagree}
          />
        ) : (
          <div className="w-full rounded-2xl border border-border bg-popover/60 p-6 text-center backdrop-blur-sm">
            <span className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Sparkles className="size-5" />
            </span>
            <p className="text-pretty font-serif text-base italic leading-relaxed text-muted-foreground">
              You&apos;ve read everything the sky has for now. Add a truth of
              your own, or revisit your history.
            </p>
          </div>
        )}
      </div>

      <AvatarReadSheet
        open={readSheetOpen}
        onClose={() => setReadSheetOpen(false)}
        mood={mood}
        growth={Math.min(1, 0.35 + people.length * 0.1)}
      />

      <AddPersonDialog open={addOpen} onOpenChange={setAddOpen} />
      <PersonDetail
        person={selected}
        bonds={selectedBonds}
        accentColor={selected ? colorById.get(selected.id) : undefined}
        onClose={() => setSelected(null)}
        onConnect={(p) => {
          setSelected(null)
          setConnectFrom(p)
        }}
      />
      <ConnectDialog
        from={connectFrom}
        people={people}
        onClose={() => setConnectFrom(null)}
      />
    </main>
  )
}

function MenuItem({
  icon,
  label,
  onClick,
  href,
  onNavigate,
}: {
  icon: React.ReactNode
  label: string
  onClick?: () => void
  href?: string
  onNavigate?: () => void
}) {
  const className =
    "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left font-mono text-[11px] uppercase tracking-widest text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"

  if (href) {
    return (
      <Link
        role="menuitem"
        href={href}
        onClick={onNavigate}
        className={className}
      >
        {icon}
        {label}
      </Link>
    )
  }
  return (
    <button role="menuitem" onClick={onClick} className={className}>
      {icon}
      {label}
    </button>
  )
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-8 text-center">
      <span className="mb-5 flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Sparkles className="size-6" />
      </span>
      <h2 className="text-balance font-serif text-2xl font-light">
        Your sky is empty
      </h2>
      <p className="mt-3 max-w-xs text-pretty font-serif text-sm leading-relaxed text-muted-foreground">
        Add the first person to your circle and watch your constellation begin
        to take shape.
      </p>
      <Button
        onClick={onAdd}
        className="mt-7 rounded-full px-8 font-mono text-xs uppercase tracking-widest"
      >
        <Plus className="size-4" />
        Add your first person
      </Button>
    </div>
  )
}
