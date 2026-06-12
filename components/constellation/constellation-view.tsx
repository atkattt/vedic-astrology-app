'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'
import {
  type Person,
  type Relationship,
} from '@/app/actions/circle'
import {
  RELATIONSHIP_LABELS,
  initials,
  type RelationshipKind,
} from '@/lib/constellation'
import { Starfield } from '@/components/starfield'
import { Button } from '@/components/ui/button'
import { AddPersonDialog } from './add-person-dialog'
import { RelationshipDialog } from './relationship-dialog'
import { PersonPanel, type BondView } from './person-panel'

export function ConstellationView({
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
  const [bondOpen, setBondOpen] = useState(false)
  const [bondFrom, setBondFrom] = useState<Person | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const peopleById = useMemo(() => {
    const map = new Map<number, Person>()
    people.forEach((p) => map.set(p.id, p))
    return map
  }, [people])

  const selected = selectedId ? (peopleById.get(selectedId) ?? null) : null

  // Lines we can actually draw (both endpoints still exist).
  const lines = useMemo(
    () =>
      relationships
        .map((r) => {
          const from = peopleById.get(r.fromPersonId)
          const to = peopleById.get(r.toPersonId)
          if (!from || !to) return null
          return { r, from, to }
        })
        .filter(Boolean) as { r: Relationship; from: Person; to: Person }[],
    [relationships, peopleById],
  )

  const bondsFor = (person: Person): BondView[] =>
    relationships
      .map((r) => {
        const otherId =
          r.fromPersonId === person.id
            ? r.toPersonId
            : r.toPersonId === person.id
              ? r.fromPersonId
              : null
        if (otherId === null) return null
        const other = peopleById.get(otherId)
        if (!other) return null
        return {
          relationship: r,
          other,
          roleLabel: RELATIONSHIP_LABELS[r.kind as RelationshipKind],
        }
      })
      .filter(Boolean) as BondView[]

  const openBondFor = (person: Person) => {
    setBondFrom(person)
    setSelectedId(null)
    setBondOpen(true)
  }

  const handleSignOut = async () => {
    await authClient.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <main className="relative flex min-h-svh flex-col overflow-hidden">
      <Starfield count={80} />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-5 pt-6">
        <div>
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.35em] text-primary">
            Spiral Inward
          </p>
          <h1 className="mt-1 font-serif text-xl font-light italic text-foreground">
            {userName}&apos;s circle
          </h1>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground"
        >
          Sign out
        </button>
      </header>

      {/* Constellation canvas */}
      <div className="relative z-10 flex-1">
        {people.length === 0 ? (
          <EmptyState onAdd={() => setAddOpen(true)} />
        ) : (
          <div className="absolute inset-0">
            {/* Bond lines */}
            <svg
              className="absolute inset-0 h-full w-full"
              aria-hidden="true"
              preserveAspectRatio="none"
            >
              {lines.map(({ r, from, to }) => (
                <line
                  key={r.id}
                  x1={`${from.posX}%`}
                  y1={`${from.posY}%`}
                  x2={`${to.posX}%`}
                  y2={`${to.posY}%`}
                  stroke="var(--primary)"
                  strokeWidth={1}
                  strokeOpacity={0.35}
                  strokeDasharray="2 4"
                />
              ))}
            </svg>

            {/* Star nodes */}
            {people.map((person) => (
              <button
                key={person.id}
                type="button"
                onClick={() => setSelectedId(person.id)}
                className="group absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2 focus:outline-none"
                style={{ left: `${person.posX}%`, top: `${person.posY}%` }}
                aria-label={`Open ${person.name}`}
              >
                <span
                  className="flex size-11 items-center justify-center rounded-full border border-primary/40 bg-primary/10 font-mono text-xs tracking-wide text-primary transition-all duration-300 group-hover:border-primary group-hover:bg-primary/20"
                  style={{ animation: 'star-glow 6s ease-in-out infinite' }}
                >
                  {initials(person.name)}
                </span>
                <span className="max-w-24 truncate font-serif text-sm italic text-foreground/90">
                  {person.name}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Add button */}
      {people.length > 0 && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center pb-8">
          <Button
            onClick={() => setAddOpen(true)}
            size="lg"
            className="pointer-events-auto rounded-full px-8 font-mono text-xs uppercase tracking-[0.2em] shadow-lg"
          >
            + Add a person
          </Button>
        </div>
      )}

      <AddPersonDialog open={addOpen} onOpenChange={setAddOpen} />
      <RelationshipDialog
        open={bondOpen}
        onOpenChange={setBondOpen}
        people={people}
        fromPerson={bondFrom}
      />
      {selected && (
        <PersonPanel
          person={selected}
          bonds={bondsFor(selected)}
          onClose={() => setSelectedId(null)}
          onAddBond={() => openBondFor(selected)}
        />
      )}
    </main>
  )
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-8 text-center">
      <div
        className="mb-8 flex size-16 items-center justify-center rounded-full border border-primary/30 bg-primary/5"
        style={{ animation: 'star-glow 5s ease-in-out infinite' }}
      >
        <span className="size-2 rounded-full bg-primary" />
      </div>
      <h2 className="text-pretty font-serif text-2xl font-light italic text-foreground">
        Your sky is empty
      </h2>
      <p className="mt-3 max-w-xs text-pretty text-sm leading-relaxed text-muted-foreground">
        Begin by placing the first person in your constellation — a parent, a
        partner, a friend.
      </p>
      <Button
        onClick={onAdd}
        size="lg"
        className="mt-8 rounded-full px-8 font-mono text-xs uppercase tracking-[0.2em]"
      >
        + Add your first person
      </Button>
    </div>
  )
}
