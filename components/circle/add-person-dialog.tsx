"use client"

import { useState, useTransition } from "react"
import { useCircleData } from "@/components/circle/circle-data-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"

export function AddPersonDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [name, setName] = useState("")
  const [birthDate, setBirthDate] = useState("")
  const [birthTime, setBirthTime] = useState("")
  const [timeUnknown, setTimeUnknown] = useState(false)
  const [birthPlace, setBirthPlace] = useState("")
  const [isPending, startTransition] = useTransition()
  const { addPerson } = useCircleData()

  function reset() {
    setName("")
    setBirthDate("")
    setBirthTime("")
    setTimeUnknown(false)
    setBirthPlace("")
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    startTransition(async () => {
      try {
        await addPerson({
          name,
          birthDate: birthDate || null,
          birthTime: timeUnknown ? null : birthTime || null,
          birthTimeUnknown: timeUnknown,
          birthPlace: birthPlace || null,
        })
        toast(`${name.trim()} has joined your sky`)
        reset()
        onOpenChange(false)
      } catch {
        toast("Could not add this person. Please try again.")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm border-border bg-popover">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl font-light">
            Add a person
          </DialogTitle>
          <DialogDescription className="font-mono text-xs uppercase tracking-widest">
            A new star for your circle
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label
              htmlFor="p-name"
              className="font-mono text-xs uppercase tracking-widest text-muted-foreground"
            >
              Name
            </Label>
            <Input
              id="p-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Who is this?"
              autoFocus
              required
              className="bg-input/40"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label
              htmlFor="p-date"
              className="font-mono text-xs uppercase tracking-widest text-muted-foreground"
            >
              Birth date
            </Label>
            <Input
              id="p-date"
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="bg-input/40"
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="p-time"
                className="font-mono text-xs uppercase tracking-widest text-muted-foreground"
              >
                Birth time
              </Label>
              <label className="flex cursor-pointer items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Unknown
                </span>
                <Switch
                  checked={timeUnknown}
                  onCheckedChange={setTimeUnknown}
                  aria-label="I don't know the birth time"
                />
              </label>
            </div>
            <Input
              id="p-time"
              type="time"
              value={birthTime}
              onChange={(e) => setBirthTime(e.target.value)}
              disabled={timeUnknown}
              className="bg-input/40 disabled:opacity-40"
            />
            {timeUnknown && (
              <p className="font-mono text-[10px] text-muted-foreground">
                Time of birth will be left unknown.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label
              htmlFor="p-place"
              className="font-mono text-xs uppercase tracking-widest text-muted-foreground"
            >
              Birth place
            </Label>
            <Input
              id="p-place"
              value={birthPlace}
              onChange={(e) => setBirthPlace(e.target.value)}
              placeholder="City"
              className="bg-input/40"
            />
          </div>

          <DialogFooter className="mt-2">
            <Button
              type="submit"
              disabled={isPending || !name.trim()}
              className="w-full rounded-full font-mono text-sm uppercase tracking-widest"
            >
              {isPending ? "Placing star…" : "Add to circle"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
