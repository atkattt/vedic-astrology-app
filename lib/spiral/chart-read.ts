/**
 * Placeholder content for the Avatar Read sheet on /circle.
 *
 * This is intentionally isolated from the JSX so it can be swapped for real
 * engine output later without touching the component. Every value here is a
 * PROPOSAL the user gets to accept or reject — keep the "a sketch you decide
 * on" tone when editing copy. Never phrase a section as a verdict.
 */

export type ChartReadSection = {
  /** Mono uppercase label shown on the left, e.g. "ASCENDANT". */
  label: string
  /** Bright-white value shown on the right, e.g. "Capricorn · Makara". */
  value: string
  /** Serif/grey paragraph beneath the label row. */
  body: string
}

export type ChartRead = {
  /** Tiny grey eyebrow above the summary. */
  eyebrow: string
  /** Short poetic summary. `emphasis` is the substring rendered glowing-white. */
  summary: { text: string; emphasis: string }
  /** The expanded, structured read. */
  sections: ChartReadSection[]
  /** Small grey closing line — the epistemic guardrail. */
  closing: string
}

export const chartRead: ChartRead = {
  eyebrow: "YOUR CHART · VEDIC LENS",
  summary: {
    text: "You build your safety from the inside out — a depth-mapper, drawn to what lies beneath, quietly building something that lasts.",
    emphasis: "a depth-mapper",
  },
  sections: [
    {
      label: "ASCENDANT",
      value: "Capricorn · Makara",
      body: "You meet the world as a builder — patient, structured, reserved. Saturn sets your pace: slow, earned, enduring.",
    },
    {
      label: "THE CORE",
      value: "Sun · Mars · Mercury in the 8th",
      body: "A rare concentration of fierce intelligence pointed at what's hidden — research, depth, transformation. A depth-mastery chart, not a spotlight one.",
    },
    {
      label: "YOUR GIFT",
      value: "Mercury exalted · Moon strong",
      body: "Precision of mind, steadiness of feeling. You see structure others miss; you hold ground when others scatter.",
    },
    {
      label: "THE TURN",
      value: "Rahu → Jupiter · 2026",
      body: "An 18-year chapter of hunger closing; a 16-year chapter of meaning opening.",
    },
    {
      label: "THE SOFT SPOT",
      value: "Venus, debilitated",
      body: "Harmony in love is an area of tending, not an effortless gift. The one thing the chart asks you to actively cultivate.",
    },
  ],
  closing: "this is a sketch the sky offers — you decide what's true.",
}
