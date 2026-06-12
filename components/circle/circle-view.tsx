"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import type { Person, Relationship } from "@/lib/db/schema"
import { authClient } from "@/lib/auth-client"
import { RELATIONSHIP_LABELS, type RelationshipKind } from "@/lib/relationships"
import { Starfield } from "@/components/starfield"
import { AddPersonDialog } from "@/components/circle/add-person-dialog"
import { ConnectDialog } from "@/components/circle/connect-dialog"
import { PersonDetail, type Bond } from "@/components/circle/person-detail"
import { Button } from "@/components/ui/button"
import { Plus, LogOut, Sparkles } from "lucide-react"

export function CircleView({
  people,
  relationships,
  userName,
}: {
  people: Person[]
  relationships: Relationship[]
  userName: string
}) {
  const router = useRouter()
  const [addOpen, setAddOpen] = useState(false)
  const [selected, setSelected] = useState<Person | null>(null)
  const [connectFrom, setConnectFrom] = useState<Person | null>(null)

  const peopleById = useMemo(() => {
    const map = new Map<number, Person>()
    for (const p of people) map.set(p.id, p)
    return map
  }, [people])

  // Lines to draw between connected stars.
  const lines = useMemo(() => {
    return relationships
      .map((r) => {
        const from = peopleById.get(r.fromPersonId)
        const to = peopleById.get(r.toPersonId)
        if (!from || !to) return null
        return { id: r.id, from, to }
      })
      .filter((x): x is { id: number; from: Person; to: Person } => x !== null)
  }, [relationships, peopleById])

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
          <h1 className="font-serif text-xl font-light leading-none">
            Spiral <span className="italic text-primary">Inward</span>
          </h1>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {userName ? `${userName}'s circle` : "Your circle"}
          </p>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
        >
          <LogOut className="size-3.5" />
          Leave
        </button>
      </header>

      {/* Constellation canvas */}
      <div className="relative z-10 flex-1">
        {people.length === 0 ? (
          <EmptyState onAdd={() => setAddOpen(true)} />
        ) : (
          <div className="absolute inset-0">
            {/* Relationship lines */}
            <svg
              className="pointer-events-none absolute inset-0 h-full w-full"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              {lines.map((line) => (
                <line
                  key={line.id}
                  x1={`${line.from.posX}%`}
                  y1={`${line.from.posY}%`}
                  x2={`${line.to.posX}%`}
                  y2={`${line.to.posY}%`}
                  stroke="oklch(0.97 0 0)"
                  strokeWidth={1}
                  strokeOpacity={0.35}
                  strokeDasharray="2 4"
                />
              ))}
            </svg>

            {/* Stars */}
            {people.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelected(p)}
                className="group absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2"
                style={{ left: `${p.posX}%`, top: `${p.posY}%` }}
                aria-label={`View ${p.name}`}
              >
                <span className="relative flex items-center justify-center">
                  <span className="animate-star-glow absolute size-8 rounded-full bg-primary/20 blur-md" />
                  <span className="relative size-3 rounded-full bg-primary shadow-[0_0_12px_2px_oklch(0.97_0_0_/_60%)] transition-transform group-hover:scale-125" />
                </span>
                <span className="max-w-24 truncate font-serif text-sm text-foreground/90 transition-colors group-hover:text-foreground">
                  {p.name}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Add button */}
      <div className="pointer-events-none relative z-20 flex justify-center pb-8 pt-4">
        <Button
          onClick={() => setAddOpen(true)}
          size="lg"
          className="pointer-events-auto rounded-full px-8 font-mono text-sm uppercase tracking-widest shadow-lg"
        >
          <Plus className="size-4" />
          Add a person
        </Button>
      </div>

      <AddPersonDialog open={addOpen} onOpenChange={setAddOpen} />
      <PersonDetail
        person={selected}
        bonds={selectedBonds}
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
