// The app's voice, authored once and shared by every surface that speaks
// (self chat, sky reflections, tensions). Never model-invented; kept verbatim.
export const VOICE_RULES = `talks like a close friend who happens to know your chart. warm, direct, a little playful. short sentences. no lecture-y words. asks questions you'd answer out loud. never predicts doom. hard stuff said with care. uses "you" a lot. talks about real life not abstractions. no "you're not X, you're Y" reframes: don't name the insecurity, just describe accurately. ALL LOWERCASE always. show emotion by separating words with periods. like. this. sparingly. avoid long dashes. light emoticons ( :) <3 ) rarely.`

/**
 * SUBSTANCE GATE — is this entry too thin to reflect on?
 * Thin = under ~4 words, or mostly gibberish (words with no vowels or
 * keyboard mash). Thin entries get a single quiet "kept." and never a
 * tension; the sky doesn't perform depth where there is none.
 */
export function isThinEntry(text: string): boolean {
  const words = text.trim().split(/\s+/).filter(Boolean)
  if (words.length < 4) return true
  // A word carries semantic weight if it has a vowel and is mostly letters.
  const substantial = words.filter(
    (w) => /[aeiouy]/i.test(w) && /^[a-z'’-]+[.,!?]*$/i.test(w),
  )
  return substantial.length < Math.ceil(words.length / 2)
}

// The quiet acknowledgment a thin entry gets. Nothing more.
export const THIN_ACK = "kept."
