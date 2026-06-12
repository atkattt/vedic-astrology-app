'use client'

import { useTransition } from 'react'
import {
  deletePerson,
  deleteRelationship,
  type Person,
  type Relationship,
} from '@/app/actions/circle'
import { formatBirth, initials, RELATIONSHIP_LABELS, type RelationshipKind } from '@/lib/constellation'
import { Button } from '@/components/ui/button'

type BondView = {
  relationship: Relationship
  other: Person
  // Label describing the other person's role relative to the selected person.
  roleLabel: string
}

export function PersonPanel({
  person,
  bonds,
  onClose,
  onAddBond,
}: {
  person: Person
  bonds: BondView[]
  onClose: () => void
  onAddBond: () => void
}) {
  const [isPending, startTransition] = useTransition()

  return (
    <>
      {/* Scrim */}
      <button
        type="button"
        aria-label="Close panel"
        onClick={onClose}
        className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm"
      />

      <aside
        role="dialog"
        aria-label={`${person.name} details`}
        className="fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[85svh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-border bg-card p-6 pb-10 shadow-2xl sm:bottom-6 sm:rounded-3xl"
      >
        <div className="mx-auto mb-6 h-1 w-10 rounded-full bg-border sm:hidden" />

        <div className="flex items-start gap-4">
          <div
            className="flex size-14 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-primary/10 font-mono text-sm tracking-wide text-primary"
            style={{ animation: 'star-glow 5s ease-in-out infinite' }}
          >
            {initials(person.name)}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-pretty font-serif text-2xl font-light italic text-foreground">
              {person.name}
            </h2>
            <p className="mt-1 font-mono text-xs leading-relaxed text-muted-foreground">
              {formatBirth(person)}
            </p>
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-border bg-border">
          <DetailRow label="Birth date" value={person.birthDate ?? '—'} />
          <DetailRow
            label="Birth time"
            value={
              person.birthTimeUnknown
                ? 'Unknown'
                : (person.birthTime ?? '—')
            }
          />
          <DetailRow label="Birth place" value={person.birthPlace ?? '—'} />
        </dl>

        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Bonds
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={onAddBond}
              className="h-8 font-mono text-xs uppercase tracking-[0.15em] text-primary hover:text-primary"
            >
              + Connect
            </Button>
          </div>

          {bonds.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
              No bonds yet. Connect {person.name} to someone.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {bonds.map((b) => (
                <li
                  key={b.relationship.id}
                  className="flex items-center justify-between rounded-xl border border-border bg-secondary/40 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-serif text-base text-foreground">
                      {b.other.name}
                    </p>
                    <p className="font-mono text-[0.7rem] uppercase tracking-[0.15em] text-primary">
                      {b.roleLabel}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      startTransition(() =>
                        deleteRelationship(b.relationship.id),
                      )
                    }
                    disabled={isPending}
                    className="font-mono text-[0.7rem] uppercase tracking-[0.15em] text-muted-foreground transition-colors hover:text-destructive"
                  >
                    Sever
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-8 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() =>
              startTransition(async () => {
                await deletePerson(person.id)
                onClose()
              })
            }
            disabled={isPending}
            className="font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground transition-colors hover:text-destructive"
          >
            Remove star
          </button>
          <Button
            variant="secondary"
            onClick={onClose}
            className="rounded-full font-mono text-xs uppercase tracking-[0.15em]"
          >
            Close
          </Button>
        </div>
      </aside>
    </>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 bg-card px-4 py-3">
      <dt className="font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground">
        {label}
      </dt>
      <dd className="text-right font-mono text-sm text-foreground">{value}</dd>
    </div>
  )
}

export type { BondView }
export { RELATIONSHIP_LABELS }
export type { RelationshipKind }
