'use client'

import { useState, useTransition } from 'react'
import { addPerson } from '@/app/actions/circle'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export function AddPersonDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [name, setName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [birthTime, setBirthTime] = useState('')
  const [timeUnknown, setTimeUnknown] = useState(false)
  const [birthPlace, setBirthPlace] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const reset = () => {
    setName('')
    setBirthDate('')
    setBirthTime('')
    setTimeUnknown(false)
    setBirthPlace('')
    setError(null)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Please give this person a name.')
      return
    }
    setError(null)
    startTransition(async () => {
      try {
        await addPerson({
          name,
          birthDate: birthDate || null,
          birthTime: birthTime || null,
          birthTimeUnknown: timeUnknown,
          birthPlace: birthPlace || null,
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
            Add a star
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Place someone from your life into the constellation.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 pt-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="person-name" className={labelClass}>
              Name
            </Label>
            <Input
              id="person-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Who is this?"
              autoFocus
              className="bg-input/40"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="person-date" className={labelClass}>
              Birth date
            </Label>
            <Input
              id="person-date"
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="bg-input/40"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="person-time" className={labelClass}>
              Birth time
            </Label>
            <Input
              id="person-time"
              type="time"
              value={birthTime}
              disabled={timeUnknown}
              onChange={(e) => setBirthTime(e.target.value)}
              className="bg-input/40 disabled:opacity-40"
            />
            <label className="mt-1 flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={timeUnknown}
                onChange={(e) => setTimeUnknown(e.target.checked)}
                className="size-4 accent-primary"
              />
              I don&apos;t know the time
            </label>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="person-place" className={labelClass}>
              Birth place
            </Label>
            <Input
              id="person-place"
              value={birthPlace}
              onChange={(e) => setBirthPlace(e.target.value)}
              placeholder="City"
              className="bg-input/40"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="submit"
              disabled={isPending}
              className="w-full rounded-full font-mono text-xs uppercase tracking-[0.2em]"
            >
              {isPending ? 'Placing...' : 'Place in the sky'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
