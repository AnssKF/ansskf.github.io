import { reducedMotion } from '../lib/motion.js';

const TOTAL_MS = 2600;   // time to write the whole signature
const GAP_MS = 70;       // pen lift between strokes

/** Draws assets/signature.svg stroke by stroke (one <path> per stroke, in writing order). */
export class Signature {
  /** Hide every stroke so it can be drawn later. */
  prepare(svg) {
    if (!svg || reducedMotion) return;
    svg.querySelectorAll('path').forEach(path => {
      const length = path.getTotalLength();
      path.style.strokeDasharray = `${length} ${length}`;
      path.style.strokeDashoffset = length;
    });
  }

  /** Write it out. Safe to call more than once. */
  draw(svg) {
    if (!svg || svg.dataset.drawn) return;
    svg.dataset.drawn = '1';
    if (reducedMotion) return;
    const paths = [...svg.querySelectorAll('path')];
    const total = paths.reduce((sum, p) => sum + p.getTotalLength(), 0) || 1;
    const speed = total / TOTAL_MS;
    let delay = 200;
    for (const path of paths) {
      const length = path.getTotalLength(), duration = Math.max(70, length / speed);
      path.animate(
        [{ strokeDashoffset: length }, { strokeDashoffset: 0 }],
        { duration, delay, fill: 'forwards', easing: 'cubic-bezier(.3,.1,.3,1)' }
      );
      delay += duration + GAP_MS;
    }
  }
}
