"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import {
  SEED_SELF_READS,
  type DisagreedRead,
  type Read,
  type ReasonTag,
  type Truth,
  type TruthScope,
} from "@/lib/spiral/reads"
import {
  addTruthEntry,
  deleteTruthEntry,
  listTruths,
  markTruthSent,
  updateTruthEntry,
} from "@/app/actions/truths"

type SpiralState = {
  // Active "about you" reads waiting to be acted on.
  queue: Read[]
  agreed: Read[]
  disagreed: DisagreedRead[]
  truths: Truth[]
  currentRead: Read | null
  agree: (read: Read) => void
  disagree: (read: Read, reason: ReasonTag) => void
  restore: (id: string) => void
  hasActed: (id: string) => boolean
  addTruth: (text: string, scope: TruthScope) => Truth
  editTruth: (id: string, text: string) => void
  deleteTruth: (id: string) => void
  sendTruth: (id: string) => void
  // Live count of reflection acts (kept + released). This is what the SAVE
  // button in History commits, feeding growth to the self creature.
  reflectionPoints: number
  // The count captured at the last save — the creature reflects this.
  savedReflectionPoints: number
  hasUnsavedReflection: boolean
  saveReflection: () => number
}

const SpiralContext = createContext<SpiralState | null>(null)

let truthSeq = 0

export function SpiralProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<Read[]>(SEED_SELF_READS)
  const [agreed, setAgreed] = useState<Read[]>([])
  const [disagreed, setDisagreed] = useState<DisagreedRead[]>([])
  const [truths, setTruths] = useState<Truth[]>([])
  const [savedReflectionPoints, setSavedReflectionPoints] = useState(0)

  const actedIds = useMemo(() => {
    const s = new Set<string>()
    for (const r of agreed) s.add(r.id)
    for (const r of disagreed) s.add(r.id)
    return s
  }, [agreed, disagreed])

  const agree = useCallback((read: Read) => {
    setQueue((q) => q.filter((r) => r.id !== read.id))
    setDisagreed((d) => d.filter((r) => r.id !== read.id))
    setAgreed((a) => (a.some((r) => r.id === read.id) ? a : [read, ...a]))
  }, [])

  const disagree = useCallback((read: Read, reason: ReasonTag) => {
    setQueue((q) => q.filter((r) => r.id !== read.id))
    setAgreed((a) => a.filter((r) => r.id !== read.id))
    setDisagreed((d) => [
      { ...read, reason, filedAt: Date.now() },
      ...d.filter((r) => r.id !== read.id),
    ])
  }, [])

  const restore = useCallback((id: string) => {
    setDisagreed((d) => {
      const found = d.find((r) => r.id === id)
      if (found) {
        const { reason: _reason, filedAt: _filedAt, ...read } = found
        // Only self reads return to the active queue; bond reads simply
        // un-file (they regenerate from the bond when next opened).
        if (read.category === "about-you") {
          setQueue((q) => (q.some((r) => r.id === id) ? q : [read, ...q]))
        }
      }
      return d.filter((r) => r.id !== id)
    })
  }, [])

  const hasActed = useCallback((id: string) => actedIds.has(id), [actedIds])

  // Every read you've kept or released is a decision about who you are — the
  // raw material the self creature grows from.
  const reflectionPoints = agreed.length + disagreed.length
  const hasUnsavedReflection = reflectionPoints !== savedReflectionPoints

  // Commit the current reflection so the self creature takes it in.
  const saveReflection = useCallback(() => {
    setSavedReflectionPoints(reflectionPoints)
    return reflectionPoints
  }, [reflectionPoints])

  // Hydrate saved entries for signed-in users. Guests get an empty list and
  // their in-session entries simply stay client-side.
  useEffect(() => {
    let cancelled = false
    void listTruths().then((rows) => {
      if (cancelled || rows.length === 0) return
      setTruths((local) => {
        // Keep any locally-added entries that raced ahead of hydration.
        const seen = new Set(rows.map((r) => r.id))
        return [...local.filter((t) => !seen.has(t.id)), ...rows]
      })
    })
    return () => {
      cancelled = true
    }
  }, [])

  // Saving quietly adds the entry to the list — no reflections, no tensions,
  // no generation. The settle-in animation is the whole acknowledgment.
  const addTruth = useCallback((text: string, scope: TruthScope) => {
    const localId = `truth-${Date.now()}-${truthSeq++}`
    const truth: Truth = { id: localId, text, scope, createdAt: Date.now() }
    setTruths((t) => [truth, ...t])

    // Persist for signed-in users; swap the optimistic id for the DB row id
    // so edit/delete target the real self_entries row.
    void addTruthEntry(text, scope).then((res) => {
      if (res.ok) {
        setTruths((all) =>
          all.map((t) => (t.id === localId ? { ...t, id: res.data.id } : t)),
        )
      }
      // Not signed in / offline: the entry stays client-side, quietly.
    })

    return truth
  }, [])

  const editTruth = useCallback((id: string, text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return
    setTruths((all) =>
      all.map((t) => (t.id === id ? { ...t, text: trimmed } : t)),
    )
    // DB rows have uuid ids; locally-only entries keep the "truth-" prefix.
    if (!id.startsWith("truth-")) void updateTruthEntry(id, trimmed)
  }, [])

  const deleteTruth = useCallback((id: string) => {
    // Deleting a sent entry also removes it from the self's grounding —
    // the chat reads entries live from self_entries, so a hard delete is all
    // it takes.
    setTruths((all) => all.filter((t) => t.id !== id))
    if (!id.startsWith("truth-")) void deleteTruthEntry(id)
  }, [])

  // Hand an entry to the self. The entry stays in the list, permanently
  // wearing the small creature-face mark; the self chat elevates it.
  const sendTruth = useCallback((id: string) => {
    setTruths((all) =>
      all.map((t) => (t.id === id ? { ...t, sentToSelf: true } : t)),
    )
    if (!id.startsWith("truth-")) void markTruthSent(id)
  }, [])

  const value = useMemo<SpiralState>(
    () => ({
      queue,
      agreed,
      disagreed,
      truths,
      currentRead: queue[0] ?? null,
      agree,
      disagree,
      restore,
      hasActed,
      addTruth,
      editTruth,
      deleteTruth,
      sendTruth,
      reflectionPoints,
      savedReflectionPoints,
      hasUnsavedReflection,
      saveReflection,
    }),
    [
      queue,
      agreed,
      disagreed,
      truths,
      agree,
      disagree,
      restore,
      hasActed,
      addTruth,
      editTruth,
      deleteTruth,
      sendTruth,
      reflectionPoints,
      savedReflectionPoints,
      hasUnsavedReflection,
      saveReflection,
    ],
  )

  return <SpiralContext.Provider value={value}>{children}</SpiralContext.Provider>
}

export function useSpiral() {
  const ctx = useContext(SpiralContext)
  if (!ctx) throw new Error("useSpiral must be used within SpiralProvider")
  return ctx
}
