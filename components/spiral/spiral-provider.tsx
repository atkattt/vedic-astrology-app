"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react"
import {
  SEED_SELF_READS,
  reflectOnTruth,
  type DisagreedRead,
  type Read,
  type ReasonTag,
  type Truth,
  type TruthScope,
} from "@/lib/spiral/reads"

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
}

const SpiralContext = createContext<SpiralState | null>(null)

let truthSeq = 0

export function SpiralProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<Read[]>(SEED_SELF_READS)
  const [agreed, setAgreed] = useState<Read[]>([])
  const [disagreed, setDisagreed] = useState<DisagreedRead[]>([])
  const [truths, setTruths] = useState<Truth[]>([])

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

  const addTruth = useCallback((text: string, scope: TruthScope) => {
    const { reflection, tension } = reflectOnTruth(text, scope)
    const truth: Truth = {
      id: `truth-${Date.now()}-${truthSeq++}`,
      text,
      scope,
      createdAt: Date.now(),
      reflection,
      tension,
    }
    setTruths((t) => [truth, ...t])
    return truth
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
    }),
    [queue, agreed, disagreed, truths, agree, disagree, restore, hasActed, addTruth],
  )

  return <SpiralContext.Provider value={value}>{children}</SpiralContext.Provider>
}

export function useSpiral() {
  const ctx = useContext(SpiralContext)
  if (!ctx) throw new Error("useSpiral must be used within SpiralProvider")
  return ctx
}
