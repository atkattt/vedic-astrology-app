'use client'

import { useState, useTransition } from 'react'
import { addRelationship, type Person } from '@/app/actions/circle'
import {
  RELATIONSHIP_KINDS,
  RELATIONSHIP_LABELS,
  type RelationshipKind,
} from '@/lib/constellation'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export function RelationshipDialog({
  open,
  onOpenChange,
  people,
  fromPerson,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  people: Person[]
  fromPerson: Person | null
}) {
  const [toId, setToId] = useState<string>('')
  const [kind, setKind] = useState<RelationshipKind>('friend')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const others = people.filter((p) => p.id !== fromPerson?.id)

  const reset = () => {
    setToId('')
    setKind('friend')
    setError(null)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!fromPerson || !toId) {
      setError('Choose someone to connect to.')
      return
    }
    setError(null)
    startTransition(async () => {
      try {
        await addRelationship({
          fromPersonId: fromPerson.id,
          toPersonId: Number(toId),
          kind,
        })
        reset()
        onOpenChange(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      }
    })
  }

  const labelClass =
    'font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground'

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset()
        onOpenChange(o)
      }}
    >
      <DialogContent className="border-border bg-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl font-light italic">
            Draw a bond
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {fromPerson
              ? `Connect ${fromPerson.name} to someone else in your circle.`
              : 'Connect two people in your circle.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 pt-2">
          <div className="flex flex-col gap-2">
            <Label className={labelClass}>Connect to</Label>
            <Select value={toId} onValueChange={setToId}>
              <SelectTrigger className="bg-input/40">
                <SelectValue placeholder="Choose a person" />
              </SelectTrigger>
              <SelectContent>
                {others.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label className={labelClass}>Relationship</Label>
            <Select
              value={kind}
              onValueChange={(v) => setKind(v as RelationshipKind)}
            >
              <SelectTrigger className="bg-input/40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RELATIONSHIP_KINDS.map((k) => (
                  <SelectItem key={k} value={k}>
                    {RELATIONSHIP_LABELS[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {fromPerson?.name ?? 'This person'} is the{' '}
              {RELATIONSHIP_LABELS[kind].toLowerCase()}
              {kind === 'mother' || kind === 'father'
                ? ' in this bond.'
                : '.'}
            </p>
          </div>

          {others.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Add another person first to draw a bond.
            </p>
          )}

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="submit"
              disabled={isPending || others.length === 0}
              className="w-full rounded-full font-mono text-xs uppercase tracking-[0.2em]"
            >
              {isPending ? 'Connecting...' : 'Create bond'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
