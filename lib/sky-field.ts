/**
 * The shared wave field for the landing-page sky.
 *
 * Both the ASCII ripple (AsciiRippleSky) and the rendered clouds
 * (SwirlCloudSky) read from THIS module so they are literally the same wave,
 * drawn two ways: cloud density peaks exactly where the ASCII glyphs brighten,
 * so they gather, pulse, and drift as one field.
 *
 * Do not fork these values — changing them in one place only would break the
 * match between the two layers.
 */
export const SKY_SOURCES = [
  { x: 0.3, y: 0.35, freq: 0.45, speed: 1.1 },
  { x: 0.72, y: 0.62, freq: 0.32, speed: -0.8 },
  { x: 0.5, y: 0.5, freq: 0.6, speed: 0.55 },
] as const

/** Grid cell size (px) the ripple samples on; the clouds mirror this spacing. */
export const SKY_CELL = 14

/**
 * The shared field value in 0..1 at grid coords (c, r) at time t (seconds),
 * using `cols`/`rows` as the grid dimensions. Identical formula on both layers.
 */
export function skyField(
  c: number,
  r: number,
  cols: number,
  rows: number,
  t: number,
): number {
  let v = 0
  for (const s of SKY_SOURCES) {
    const dx = c - s.x * cols
    const dy = r - s.y * rows
    const dist = Math.sqrt(dx * dx + dy * dy)
    v += Math.sin(dist * s.freq - t * s.speed)
  }
  const n = v / SKY_SOURCES.length / 2 + 0.5
  return n < 0 ? 0 : n > 1 ? 1 : n
}
