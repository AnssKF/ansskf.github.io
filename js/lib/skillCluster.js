import { asArray } from './format.js';
import { seededRandom } from './math.js';

/** Phyllotaxis blob of dots for one skill group; size grows with keyword count. Returns SVG <circle> markup. */
export function skillCluster(skill, index) {
  const count = Math.min(64, 12 + asArray(skill.keywords).length * 6);
  const spacing = 54 / Math.sqrt(count);
  const rand = seededRandom(index + 1);
  let svg = '';
  for (let i = 0; i < count; i++) {
    const radius = spacing * Math.sqrt(i + 0.5), angle = i * 2.39996323 + index;
    const x = Math.cos(angle) * radius, y = Math.sin(angle) * radius;
    const dot = 2.7 - 1.1 * (i / count);
    const fromX = (rand() - 0.5) * 240, fromY = (rand() - 0.5) * 160 + 90;
    svg += `<circle r="${dot.toFixed(2)}" style="--x:${x.toFixed(1)}px;--y:${y.toFixed(1)}px;--fx:${fromX.toFixed(1)}px;--fy:${fromY.toFixed(1)}px;--d:${i * 9}ms"/>`;
  }
  return svg;
}
