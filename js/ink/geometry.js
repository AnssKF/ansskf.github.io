/* Pure geometry for the ink line: smooth curves, pen-width profile, variable-width outline, ink blots. */
import { TAU, clamp, f1 } from '../lib/math.js';

/** Cubic-Bezier segment through p1 -> p2 using Catmull-Rom tangents from neighbours p0, p3. */
const segment = (p0, p1, p2, p3) =>
  `C${f1(p1.x + (p2.x - p0.x) / 6)} ${f1(p1.y + (p2.y - p0.y) / 6)} ${f1(p2.x - (p3.x - p1.x) / 6)} ${f1(p2.y - (p3.y - p1.y) / 6)} ${f1(p2.x)} ${f1(p2.y)}`;

/** SVG path `d` of a smooth open curve through every point. */
export function smoothPath(points) {
  let d = `M${f1(points[0].x)} ${f1(points[0].y)}`;
  for (let i = 0; i < points.length - 1; i++) {
    d += segment(points[i - 1] || points[i], points[i], points[i + 1], points[i + 2] || points[i + 1]);
  }
  return d;
}

/** Closed, slightly irregular blob (an ink blot) centred on (cx, cy). */
export function blotPath(cx, cy, radius, rand) {
  const k = 9, phase = rand() * TAU, pts = [];
  for (let i = 0; i < k; i++) {
    const a = i / k * TAU, r = radius * (1 + 0.16 * Math.sin(a * 2 + phase) + 0.14 * (rand() - 0.5));
    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  let d = `M${f1(pts[0].x)} ${f1(pts[0].y)}`;
  for (let i = 0; i < k; i++) d += segment(pts[(i - 1 + k) % k], pts[i], pts[(i + 1) % k], pts[(i + 2) % k]);
  return d + 'Z';
}

/** Evenly spaced samples { x, y, l } along an SVG path element, where l is the length so far. */
export function sampleAlong(pathEl, step) {
  const total = pathEl.getTotalLength(), n = Math.max(2, Math.ceil(total / step) + 1);
  const samples = new Array(n);
  for (let i = 0; i < n; i++) {
    const l = Math.min(total, i * step), p = pathEl.getPointAtLength(l);
    samples[i] = { x: p.x, y: p.y, l };
  }
  return { samples, total };
}

/** Length along the curve of the sample closest to `point`. */
export function lengthNear(samples, point) {
  let best = samples[0], bestD = Infinity;
  for (const s of samples) {
    const d = (s.x - point.x) ** 2 + (s.y - point.y) ** 2;
    if (d < bestD) { bestD = d; best = s; }
  }
  return best.l;
}

/** Pen pressure per sample: slow wobble + ink pooling where the pen pauses at each node, tapered ends. */
export function penWidths(samples, total, nodeLengths) {
  return samples.map(({ l }) => {
    let w = 1.9 + 0.55 * Math.sin(l * 0.019 + 1.3) + 0.35 * Math.sin(l * 0.061) + 0.2 * Math.sin(l * 0.17 + 2.1);
    for (let j = 1; j < nodeLengths.length; j++) { const t = (l - nodeLengths[j]) / 16; w += 1.3 * Math.exp(-t * t); }
    w *= Math.sqrt(clamp(l / 50)) * (0.35 + 0.65 * clamp((total - l) / 60));
    return Math.max(0.5, w);
  });
}

/** Closed polygon `d` that offsets the centre line by half the width on each side. */
export function outlinePath(samples, widths) {
  const n = samples.length, left = [], right = [];
  for (let i = 0; i < n; i++) {
    const a = samples[Math.max(0, i - 1)], b = samples[Math.min(n - 1, i + 1)];
    let tx = b.x - a.x, ty = b.y - a.y;
    const len = Math.hypot(tx, ty) || 1;
    tx /= len; ty /= len;
    const h = widths[i] / 2, s = samples[i];
    left.push(`${f1(s.x - ty * h)} ${f1(s.y + tx * h)}`);
    right.push(`${f1(s.x + ty * h)} ${f1(s.y - tx * h)}`);
  }
  return `M${left.join('L')}L${right.reverse().join('L')}Z`;
}
