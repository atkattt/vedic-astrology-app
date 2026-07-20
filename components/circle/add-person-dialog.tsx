"use client"

import { useState, useTransition } from "react"
import { useCircleData } from "@/components/circle/circle-data-provider"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"

// The onboarding terminal's visual language, mirrored here so adding a
// person feels like the same ritual as entering your own details:
// Geist Pixel, transparent underline inputs, pill outline buttons,
// ●/○ text toggles — no boxed form chrome.
const PIXEL = '"Geist Pixel", sans-serif'

const labelStyle: React.CSSProperties = {
  fontFamily: PIXEL,
  fontSize: 11,
  letterSpacing: 2,
  textTransform: "uppercase",
  color: "rgba(255,255,255,0.6)",
}

const fieldWrapStyle: React.CSSProperties = {
  borderBottom: "1px solid rgba(255, 255, 255, 0.55)",
  padding: "9px 2px",
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "transparent",
  border: "none",
  color: "#fff",
  fontFamily: PIXEL,
  fontWeight: 500,
  fontSize: 16,
  letterSpacing: 1,
  padding: 0,
  outline: "none",
  caretColor: "#fff",
  // Native date/time pickers render dark to match.
  colorScheme: "dark",
}

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
      <DialogContent
        className="max-w-sm border-border bg-popover"
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle
            style={{
              fontFamily: PIXEL,
              fontSize: 18,
              fontWeight: 500,
              letterSpacing: 1,
              color: "#fff",
            }}
          >
            add a person
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <label htmlFor="p-name" style={labelStyle}>
              name
            </label>
            <div style={fieldWrapStyle}>
              <input
                id="p-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="who is this?"
                autoFocus
                required
                style={inputStyle}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="p-date" style={labelStyle}>
              birth date
            </label>
            <div style={fieldWrapStyle}>
              <input
                id="p-date"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="p-time" style={labelStyle}>
              birth time
            </label>
            {!timeUnknown && (
              <div style={fieldWrapStyle}>
                <input
                  id="p-time"
                  type="time"
                  value={birthTime}
                  onChange={(e) => setBirthTime(e.target.value)}
                  style={inputStyle}
                />
              </div>
            )}
            <button
              type="button"
              onClick={() => setTimeUnknown((u) => !u)}
              style={{
                marginTop: 8,
                alignSelf: "flex-start",
                background: "transparent",
                border: "none",
                padding: 0,
                fontFamily: PIXEL,
                fontSize: 11,
                letterSpacing: 1,
                color: "#e0e0e0",
                cursor: "pointer",
              }}
            >
              {(timeUnknown ? "● " : "○ ") + "i don't know the time"}
            </button>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="p-place" style={labelStyle}>
              birth place
            </label>
            <div style={fieldWrapStyle}>
              <input
                id="p-place"
                value={birthPlace}
                onChange={(e) => setBirthPlace(e.target.value)}
                placeholder="city"
                style={inputStyle}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending || !name.trim()}
            style={{
              marginTop: 6,
              background: "transparent",
              border: "1px solid #fff",
              color: "#fff",
              fontFamily: PIXEL,
              fontSize: 11,
              letterSpacing: 2,
              textTransform: "uppercase",
              padding: "11px 20px",
              borderRadius: 30,
              cursor: "pointer",
              opacity: isPending || !name.trim() ? 0.4 : 1,
            }}
          >
            {isPending ? "placing star…" : "add to circle ⏎"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
