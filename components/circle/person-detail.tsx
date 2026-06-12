"use client"

import { useState, useTransition } from "react"
import type { Person, Relationship } from "@/lib/db/schema"
import { deletePerson, deleteRelationship } from "@/app/actions/circle"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { Star, MapPin, Calendar, Clock, Link2, Trash2, X } from "lucide-react"

function formatDate(value: string | null) {
  if (!value) return "Unknown"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

function formatTime(value: string | null) {
  if (!value) return null
  const [h, m] = value.split(":")
  if (h === undefined || m === undefined) return value
  const hour = Number(h)
  const suffix = hour >= 12 ? "PM" : "AM"
  const display = hour % 12 === 0 ? 12 : hour % 12
  return `${display}:${m} ${suffix}`
}

type Bond = {
  relationship: Relationship
  other: Person
  label: string
}

export function PersonDetail({
  person,
  bonds,
  onClose,
  onConnect,
}: {
  person: Person | null
  bonds: Bond[]
  onClose: () => void
  onConnect: (person: Person) => void
}) {
  const [isPending, startTransition] = useTransition()
  const [confirmDelete, setConfirmDelete] = useState(false)

  const open = person !== null

  function handleDeletePerson() {
    if (!person) return
    startTransition(async () => {
      try {
        await deletePerson(person.id)
        toast(`${person.name} has left your sky`)
        setConfirmDelete(false)
        onClose()
      } catch {
        toast("Could not remove this person.")
      }
    })
  }

  function handleRemoveBond(relationshipId: number, label: string) {
    startTransition(async () => {
      try {
        await deleteRelationship(relationshipId)
        toast(`${label} bond released`)
      } catch {
        toast("Could not remove this bond.")
      }
    })
  }

  const time = person ? formatTime(person.birthTime) : null

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setConfirmDelete(false)
          onClose()
        }
      }}
    >
      <DialogContent className="max-w-sm border-border bg-popover" showCloseButton={false}>
        {person && (
          <>
            <DialogHeader>
              <div className="mb-2 flex items-center justify-between">
                <span className="flex size-10 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <Star className="size-5 fill-primary" />
                </span>
                <button
                  onClick={onClose}
                  className="text-muted-foreground transition-colors hover:text-foreground"
                  aria-label="Close"
                >
                  <X className="size-5" />
                </button>
              </div>
              <DialogTitle className="text-balance font-serif text-3xl font-light">
                {person.name}
              </DialogTitle>
            </DialogHeader>

            <dl className="flex flex-col gap-3 border-t border-border pt-4">
              <Detail
                icon={<Calendar className="size-4" />}
                label="Born"
                value={formatDate(person.birthDate)}
              />
              <Detail
                icon={<Clock className="size-4" />}
                label="Time"
                value={
                  person.birthTimeUnknown
                    ? "Unknown"
                    : time ?? "Unknown"
                }
              />
              <Detail
                icon={<MapPin className="size-4" />}
                label="Place"
                value={person.birthPlace || "Unknown"}
              />
            </dl>

            <div className="border-t border-border pt-4">
              <p className="mb-3 font-mono text-xs uppercase tracking-widest text-muted-foreground">
                Bonds
              </p>
              {bonds.length === 0 ? (
                <p className="font-serif text-sm italic text-muted-foreground">
                  No bonds yet — connect {person.name} to someone in your circle.
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {bonds.map((b) => (
                    <li
                      key={b.relationship.id}
                      className="flex items-center justify-between gap-2 rounded-md bg-secondary/50 px-3 py-2"
                    >
                      <span className="font-serif text-sm text-foreground">
                        {b.label}
                        <span className="text-muted-foreground"> · </span>
                        {b.other.name}
                      </span>
                      <button
                        onClick={() =>
                          handleRemoveBond(b.relationship.id, b.label)
                        }
                        disabled={isPending}
                        className="text-muted-foreground transition-colors hover:text-destructive"
                        aria-label={`Remove bond with ${b.other.name}`}
                      >
                        <X className="size-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mt-2 flex flex-col gap-2">
              <Button
                onClick={() => onConnect(person)}
                className="w-full rounded-full font-mono text-xs uppercase tracking-widest"
              >
                <Link2 className="size-4" />
                Connect to someone
              </Button>

              {confirmDelete ? (
                <div className="flex flex-col gap-2 rounded-md border border-destructive/40 p-3">
                  <p className="text-center font-serif text-sm text-muted-foreground">
                    Remove {person.name} and all their bonds?
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      onClick={() => setConfirmDelete(false)}
                      className="flex-1 rounded-full font-mono text-xs uppercase tracking-widest"
                    >
                      Keep
                    </Button>
                    <Button
                      variant="destructive"
                      disabled={isPending}
                      onClick={handleDeletePerson}
                      className="flex-1 rounded-full font-mono text-xs uppercase tracking-widest"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="flex items-center justify-center gap-1.5 py-1 font-mono text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                  Remove from circle
                </button>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function Detail({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-primary/70">{icon}</span>
      <dt className="w-14 font-mono text-xs uppercase tracking-widest text-muted-foreground">
        {label}
      </dt>
      <dd className="font-serif text-sm text-foreground">{value}</dd>
    </div>
  )
}

export type { Bond }
