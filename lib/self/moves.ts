// Atomic moves + choreographer for the read-open scene.
//
// Each move is a short, self-contained animation that STARTS and ENDS in the
// neutral stance (translate 0 / rotate 0 / scale 1), so any move can chain
// into any other without popping. Transform moves run via the Web Animations
// API on the stage wrapper; behavioral moves (blinks, mutation bursts) fire
// through the creature's imperative handle; rests are simply timed waits.
//
// The choreographer composes endless variety: pick 2-4 moves weighted by the
// read's mood tone, play them with slightly randomized durations and small
// pauses, then compose the next sequence — never repeating the exact same
// sequence twice in a row.

import type { ReadMoodTone } from "@/lib/self/read-moods"

/** The subset of SelfCreatureHandle the choreographer needs. */
export type CreatureActor = {
  blink: (holdMs?: number) => void
  mutate: (swaps?: number) => void
}

export type MoveName =
  | "bounce"
  | "double-bounce"
  | "shuffle-left"
  | "shuffle-right"
  | "long-rest"
  | "quick-rest"
  | "lean-in"
  | "lean-back"
  | "slow-sway"
  | "wiggle"
  | "stretch-up"
  | "settle-down"
  | "blink-flurry"
  | "slow-blink"
  | "mutation-burst"
  | "stillness"

type Move = {
  name: MoveName
  /** transform keyframes (WAAPI). Omitted for rests / behavioral moves. */
  keyframes?: Keyframe[]
  /** base duration, ms — actual playback is jittered ±25% */
  duration: number
  easing?: string
  /** behavioral side-effects, fired at move start (may schedule more) */
  act?: (actor: CreatureActor) => void
}

const N = "translate(0px, 0px) rotate(0deg) scale(1, 1)"

const MOVES: Record<MoveName, Move> = {
  bounce: {
    name: "bounce",
    duration: 620,
    keyframes: [
      { transform: N },
      { transform: "translate(0px, -10px) rotate(0deg) scale(1, 1)", offset: 0.45 },
      { transform: N },
    ],
    easing: "cubic-bezier(.35,.1,.35,1)",
  },
  "double-bounce": {
    name: "double-bounce",
    duration: 950,
    keyframes: [
      { transform: N },
      { transform: "translate(0px, -9px) rotate(0deg) scale(1, 1)", offset: 0.25 },
      { transform: N, offset: 0.5 },
      { transform: "translate(0px, -6px) rotate(0deg) scale(1, 1)", offset: 0.72 },
      { transform: N },
    ],
    easing: "cubic-bezier(.35,.1,.35,1)",
  },
  "shuffle-left": {
    name: "shuffle-left",
    duration: 820,
    keyframes: [
      { transform: N },
      { transform: "translate(-7px, -3px) rotate(-1.5deg) scale(1, 1)", offset: 0.35 },
      { transform: "translate(-12px, 0px) rotate(0deg) scale(1, 1)", offset: 0.6 },
      { transform: N },
    ],
  },
  "shuffle-right": {
    name: "shuffle-right",
    duration: 820,
    keyframes: [
      { transform: N },
      { transform: "translate(7px, -3px) rotate(1.5deg) scale(1, 1)", offset: 0.35 },
      { transform: "translate(12px, 0px) rotate(0deg) scale(1, 1)", offset: 0.6 },
      { transform: N },
    ],
  },
  "long-rest": { name: "long-rest", duration: 2800 },
  "quick-rest": { name: "quick-rest", duration: 900 },
  "lean-in": {
    name: "lean-in",
    duration: 1700,
    keyframes: [
      { transform: N },
      { transform: "translate(0px, 2px) rotate(3.5deg) scale(1, 1)", offset: 0.3 },
      { transform: "translate(0px, 2px) rotate(3.5deg) scale(1, 1)", offset: 0.75 },
      { transform: N },
    ],
  },
  "lean-back": {
    name: "lean-back",
    duration: 1500,
    keyframes: [
      { transform: N },
      { transform: "translate(0px, -1px) rotate(-3deg) scale(1, 1)", offset: 0.35 },
      { transform: "translate(0px, -1px) rotate(-3deg) scale(1, 1)", offset: 0.7 },
      { transform: N },
    ],
  },
  "slow-sway": {
    name: "slow-sway",
    duration: 2600,
    keyframes: [
      { transform: N },
      { transform: "translate(5px, 0px) rotate(0.8deg) scale(1, 1)", offset: 0.28 },
      { transform: "translate(-5px, 0px) rotate(-0.8deg) scale(1, 1)", offset: 0.72 },
      { transform: N },
    ],
  },
  wiggle: {
    name: "wiggle",
    duration: 700,
    keyframes: [
      { transform: N },
      { transform: "translate(0px, 0px) rotate(-4deg) scale(1, 1)", offset: 0.25 },
      { transform: "translate(0px, 0px) rotate(4deg) scale(1, 1)", offset: 0.5 },
      { transform: "translate(0px, 0px) rotate(-3deg) scale(1, 1)", offset: 0.75 },
      { transform: N },
    ],
  },
  "stretch-up": {
    name: "stretch-up",
    duration: 1250,
    keyframes: [
      { transform: N },
      { transform: "translate(0px, -3px) rotate(0deg) scale(0.98, 1.06)", offset: 0.4 },
      { transform: "translate(0px, -3px) rotate(0deg) scale(0.98, 1.06)", offset: 0.65 },
      { transform: N },
    ],
  },
  "settle-down": {
    name: "settle-down",
    duration: 1400,
    keyframes: [
      { transform: N },
      { transform: "translate(0px, 2px) rotate(0deg) scale(1.03, 0.96)", offset: 0.4 },
      { transform: "translate(0px, 2px) rotate(0deg) scale(1.03, 0.96)", offset: 0.7 },
      { transform: N },
    ],
  },
  "blink-flurry": {
    name: "blink-flurry",
    duration: 750,
    act: (actor) => {
      actor.blink(90)
      setTimeout(() => actor.blink(90), 230)
      setTimeout(() => actor.blink(90), 470)
    },
  },
  "slow-blink": {
    name: "slow-blink",
    duration: 850,
    act: (actor) => actor.blink(430),
  },
  "mutation-burst": {
    name: "mutation-burst",
    duration: 800,
    act: (actor) => {
      actor.mutate(2)
      setTimeout(() => actor.mutate(2), 160)
      setTimeout(() => actor.mutate(3), 330)
      setTimeout(() => actor.mutate(2), 520)
    },
  },
  stillness: { name: "stillness", duration: 2000 },
}

// ---- mood weighting (tune freely) -------------------------------------------
// Unlisted moves default to weight 0.6 — present but uncommon.

const DEFAULT_WEIGHT = 0.6

const TONE_WEIGHTS: Record<ReadMoodTone, Partial<Record<MoveName, number>>> = {
  gentle: {
    "long-rest": 5,
    "slow-sway": 4,
    "slow-blink": 4,
    "quick-rest": 3,
    "settle-down": 3,
    stillness: 2,
    "lean-back": 1.5,
    bounce: 0.2,
    "double-bounce": 0.1,
    wiggle: 0.3,
    "blink-flurry": 0.2,
    "mutation-burst": 0.4,
  },
  confronting: {
    stillness: 5,
    "lean-in": 5,
    "long-rest": 4,
    "quick-rest": 2,
    "settle-down": 1.5,
    "slow-blink": 1,
    "mutation-burst": 1,
    bounce: 0.1,
    "double-bounce": 0.1,
    wiggle: 0.15,
    "shuffle-left": 0.3,
    "shuffle-right": 0.3,
    "blink-flurry": 0.2,
    "slow-sway": 0.5,
  },
  hopeful: {
    bounce: 4,
    wiggle: 4,
    "double-bounce": 3,
    "shuffle-left": 3,
    "shuffle-right": 3,
    "stretch-up": 3,
    "blink-flurry": 3,
    "quick-rest": 2,
    "mutation-burst": 2,
    "long-rest": 0.4,
    stillness: 0.3,
    "slow-blink": 0.4,
  },
  neutral: {
    "quick-rest": 2,
    "slow-sway": 2,
    "shuffle-left": 1.5,
    "shuffle-right": 1.5,
    "long-rest": 1.5,
    bounce: 1,
    "slow-blink": 1,
    wiggle: 1,
  },
}

// ---- sequence composition ---------------------------------------------------

const ALL_MOVES = Object.values(MOVES)

function pickWeighted(tone: ReadMoodTone, exclude?: MoveName): Move {
  const weights = TONE_WEIGHTS[tone]
  const pool = ALL_MOVES.filter((m) => m.name !== exclude)
  const total = pool.reduce((s, m) => s + (weights[m.name] ?? DEFAULT_WEIGHT), 0)
  let roll = Math.random() * total
  for (const m of pool) {
    roll -= weights[m.name] ?? DEFAULT_WEIGHT
    if (roll <= 0) return m
  }
  return pool[pool.length - 1]
}

/** 2-4 moves, no immediate same-move repeats within the sequence. */
function composeSequence(tone: ReadMoodTone, prevKey: string): Move[] {
  for (let attempt = 0; attempt < 8; attempt++) {
    const count = 2 + Math.floor(Math.random() * 3)
    const seq: Move[] = []
    for (let i = 0; i < count; i++) {
      seq.push(pickWeighted(tone, seq[i - 1]?.name))
    }
    const key = seq.map((m) => m.name).join(">")
    if (key !== prevKey) return seq
  }
  // pathological fallback: force a differing single move
  return [pickWeighted(tone), MOVES["quick-rest"]]
}

// ---- runtime ----------------------------------------------------------------

const jitter = (ms: number) => ms * (0.75 + Math.random() * 0.5)
const sleep = (ms: number) => new Promise<void>((res) => setTimeout(res, ms))

/**
 * Run the choreographer on a stage element + creature actor until cancelled.
 * Returns the cancel function. No-ops under prefers-reduced-motion.
 */
export function choreograph(
  el: HTMLElement,
  actor: CreatureActor,
  tone: ReadMoodTone,
): () => void {
  if (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  ) {
    return () => {}
  }

  let alive = true
  let anim: Animation | null = null
  let prevKey = ""

  const run = async () => {
    while (alive) {
      const seq = composeSequence(tone, prevKey)
      prevKey = seq.map((m) => m.name).join(">")
      for (const move of seq) {
        if (!alive) return
        const dur = jitter(move.duration)
        move.act?.(actor)
        if (move.keyframes && el.isConnected) {
          anim = el.animate(move.keyframes, {
            duration: dur,
            easing: move.easing ?? "ease-in-out",
          })
          try {
            await anim.finished
          } catch {
            return // cancelled mid-move
          }
        } else {
          await sleep(dur)
        }
        if (!alive) return
        // a small breath between moves so sequences don't feel mechanical
        await sleep(140 + Math.random() * 360)
      }
    }
  }
  void run()

  return () => {
    alive = false
    anim?.cancel()
  }
}
