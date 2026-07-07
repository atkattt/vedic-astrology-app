"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { Person } from "@/lib/db/schema"
import { createClient } from "@/lib/supabase/client"
import { RELATIONSHIP_LABELS, type RelationshipKind } from "@/lib/relationships"
import { AddPersonDialog } from "@/components/circle/add-person-dialog"
import { ConnectDialog } from "@/components/circle/connect-dialog"
import { PersonDetail, type Bond } from "@/components/circle/person-detail"
import { SpiralUniverse } from "@/components/circle/spiral-universe"

import type { Mood } from "@/components/circle/SelfAvatar"
import { buildColorMap } from "@/lib/circle/colors"
import { useCircleData } from "@/components/circle/circle-data-provider"

import { Plus, LogOut, Clock, PenLine, Menu, X, Info, Star, User } from "lucide-react"

export function CircleView({
  userName,
  initialRevealRadius,
  engagementScore = 0,
  userId,
}: {
  userName: string
  initialRevealRadius: number
  /** drives the evolving self creature's stage at the universe center */
  engagementScore?: number
  /** stable per-user seed so the creature regrows the exact same being */
  userId?: string
}) {
  const router = useRouter()
  const { guest, people, relationships } = useCircleData()
  const [addOpen, setAddOpen] = useState(false)
  const [selected, setSelected] = useState<Person | null>(null)
  const [connectFrom, setConnectFrom] = useState<Person | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  // The central avatar's resting expression. Per-read reactions (agree /
  // disagree / curious + color) are now driven inside SpiralUniverse itself
  // when an object is tapped, so the base mood here just stays idle.
  const mood: Mood = "idle"

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
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
    router.refresh()
  }

  return (
    <main className="relative flex min-h-[100dvh] flex-col overflow-hidden">
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
                className="absolute right-0 top-full z-10 mt-3 flex w-56 flex-col overflow-hidden rounded-lg shadow-xl"
                style={{
                  backgroundColor: "#070707",
                  border: "1px solid #1a1a1a",
                  fontFamily:
                    "'Geist Pixel', ui-monospace, monospace",
                }}
              >
                {/* Terminal meta line, mirroring the read cards' header */}
                <div className="px-3 pb-2 pt-2.5 text-[9px] uppercase tracking-[0.3em] text-muted-foreground/60">
                  Menu
                </div>
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
                  href="/what-you-know"
                  onNavigate={() => setMenuOpen(false)}
                />
                <MenuItem
                  icon={<Star className="size-4" />}
                  label="Self"
                  href="/self"
                  onNavigate={() => setMenuOpen(false)}
                />
                <MenuItem
                  icon={<Info className="size-4" />}
                  label="What this is"
                  href="/about"
                  onNavigate={() => setMenuOpen(false)}
                />
                <MenuItem
                  icon={<User className="size-4" />}
                  label="Profile"
                  href="/profile"
                  onNavigate={() => setMenuOpen(false)}
                />
              </div>
            </>
          )}
        </div>
      </header>

      {/* Constellation canvas — always rendered so the self creature and its
          circle are visible from the very first visit, even before anyone has
          been added to the circle. */}
      <div className="relative z-10 flex-1">
        <SpiralUniverse
          people={people}
          relationships={relationships}
          colorById={colorById}
          mood={mood}
          engagementScore={engagementScore}
          userId={userId}
          guest={guest}
          initialRevealRadius={initialRevealRadius}
        />
        {/* Hint overlay when the circle is still empty — shown on top of the
            universe so the creature is always visible in the background. */}
        {people.length === 0 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-16 flex flex-col items-center gap-3">
            <button
              className="pointer-events-auto rounded-full border border-foreground/20 bg-background/60 px-6 py-2.5 font-mono text-[10px] uppercase tracking-widest text-foreground/70 backdrop-blur-sm transition-colors hover:bg-background/80 hover:text-foreground"
              onClick={() => setAddOpen(true)}
            >
              + Add someone to your circle
            </button>
          </div>
        )}
      </div>

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
    "flex w-full items-center gap-2 px-3 py-3 text-left font-mono text-[11px] uppercase tracking-widest text-muted-foreground transition-colors hover:bg-foreground/[0.04] hover:text-foreground"
  const style = { borderTop: "1px solid #1a1a1a" }

  const inner = (
    <>
      <span className="text-muted-foreground/40">{">"}</span>
      <span className="text-muted-foreground/70">{icon}</span>
      <span>{label}</span>
    </>
  )

  if (href) {
    return (
      <Link
        role="menuitem"
        href={href}
        onClick={onNavigate}
        className={className}
        style={style}
      >
        {inner}
      </Link>
    )
  }
  return (
    <button role="menuitem" onClick={onClick} className={className} style={style}>
      {inner}
    </button>
  )
}


