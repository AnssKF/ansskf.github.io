/* Small pure math helpers shared by the ink engine. */
export const TAU = Math.PI * 2;
export const clamp = (v, min = 0, max = 1) => Math.max(min, Math.min(max, v));
export const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
/** Format to one decimal: keeps generated SVG path strings short. */
export const f1 = n => n.toFixed(1);

/** Deterministic PRNG (mulberry32): same seed, same "hand-drawn" wobble on every visit. */
export const seededRandom = seed => () => {
  seed |= 0; seed = seed + 0x6D2B79F5 | 0;
  let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
};
