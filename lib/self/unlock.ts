// Shared gate for the "talk to your self" conversation.
//
// The reveal frontier starts at BASE_REVEAL_RADIUS (240) and only grows as the
// user explores their spiral and unlocks more reads. Talking to your self opens
// once that frontier has expanded well past the starting ring — i.e. once
// enough reads have accumulated for the voice to have something to say.
export const BASE_REVEAL_RADIUS = 240
export const CHAT_UNLOCK_RADIUS = 480

/** 0..1 progress toward unlocking the conversation. */
export function unlockProgress(revealRadius: number): number {
  const span = CHAT_UNLOCK_RADIUS - BASE_REVEAL_RADIUS
  const done = revealRadius - BASE_REVEAL_RADIUS
  return Math.max(0, Math.min(1, done / span))
}
