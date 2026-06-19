"use client"

import { useMemo, useState } from "react"
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
import { buildColorMap } from "@/lib/circle/colors"
import { useCircleData } from "@/components/circle/circle-data-provider"
import { ReadStack } from "@/components/spiral/read-stack"
import { Button } from "@/components/ui/button"
import { Plus, LogOut, Sparkles, Clock, PenLine } from "lucide-react"

export function CircleView({ userName }: { userName: string }) {
  const router = useRouter()
  const { guest, people, relationships } = useCircleData()
  const [addOpen, setAddOpen] = useState(false)
  const [selected, setSelected] = useState<Person | null>(null)
  const [connectFrom, setConnectFrom] = useState<Person | null>(null)

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

      {/* Header */}
      <header className="relative z-20 flex items-center justify-between px-5 pt-6">
        <div>
          <p className="-mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {guest
              ? "Exploring as a guest"
              : userName
                ? `${userName}'s circle`
                : "Your circle"}
          </p>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
        >
          <LogOut className="size-3.5" />
          {guest ? "Exit" : "Leave"}
        </button>
      </header>

      {/* Entry points: add a person, history, what you know about yourself */}
      <nav className="relative z-20 mt-5 flex items-center justify-center gap-2 px-5">
        <ToolbarButton
          icon={<Plus className="size-4" />}
          label="Add person"
          onClick={() => setAddOpen(true)}
        />
        <ToolbarButton
          icon={<Clock className="size-4" />}
          label="History"
          href="/history"
        />
        <ToolbarButton
          icon={<PenLine className="size-4" />}
          label="What you know"
          href="/self"
        />
      </nav>

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
          />
        )}
      </div>

      {/* Core loop: a read about you, surfaced over the constellation */}
      <div className="relative z-20 mx-auto w-full max-w-md px-5 pb-8 pt-4">
        <ReadStack />
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

function ToolbarButton({
  icon,
  label,
  onClick,
  href,
}: {
  icon: React.ReactNode
  label: string
  onClick?: () => void
  href?: string
}) {
  const className =
    "flex items-center gap-1.5 rounded-full border border-border bg-popover/50 px-3.5 py-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground backdrop-blur-sm transition-colors hover:border-foreground/40 hover:text-foreground"

  if (href) {
    return (
      <Link href={href} className={className}>
        {icon}
        {label}
      </Link>
    )
  }
  return (
    <button onClick={onClick} className={className}>
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
