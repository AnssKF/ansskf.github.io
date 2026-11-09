import { clamp, f1, seededRandom } from '../lib/math.js';
import { reducedMotion } from '../lib/motion.js';
import { blotPath, lengthNear, outlinePath, penWidths, sampleAlong, smoothPath } from './geometry.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const SAMPLE_STEP = 3;      // px between samples along the curve
const MIN_GAP = 28;         // anchors closer than this (vertically) are skipped
const EASE = 0.12;          // how quickly the pen chases the scroll position

/** Offset of `el` inside `root`, ignoring CSS transforms (reveal animations must not shift anchors). */
function offsetWithin(el, root) {
  let x = 0, y = 0;
  while (el && el !== root) { x += el.offsetLeft; y += el.offsetTop; el = el.offsetParent; }
  return { x, y };
}

/**
 * One organic ink-pen stroke through every `[data-ink]` element, in DOM order (`data-ink="start"` is the hero origin).
 * A variable-width outline is revealed by a dash-offset mask that follows scroll; blots appear at each node.
 * Rebuilds itself whenever the page layout changes.
 */
export class InkLine {
  #page; #svg; #mask; #maskBox; #measure; #body; #blotGroup; #nib;
  #total = 0; #drawn = 0; #prevDrawn = -1;
  #samples = []; #blots = [];
  #rebuildTimer = 0;
  #arrived = false; #onArrive = null;

  /** @param {import('./DotField.js').DotField} field  receives the pen-tip position and wake-ups */
  constructor(field) { this.field = field; }

  mount(page, svg) {
    this.#page = page; this.#svg = svg;
    this.#maskBox = svg.querySelector('mask');
    this.#mask = svg.querySelector('.ink-mask');
    this.#measure = svg.querySelector('.ink-measure');
    this.#body = svg.querySelector('.ink-body');
    this.#blotGroup = svg.querySelector('.ink-blots');
    this.#nib = svg.querySelector('.ink-nib');
    new ResizeObserver(() => this.rebuildSoon()).observe(page);
    addEventListener('resize', () => this.rebuildSoon());
    this.#build();
    requestAnimationFrame(this.#tick);
  }

  /** True once the line has at least two nodes to run through. */
  get hasPath() { return this.#total > 0; }

  /** Run `callback` each time the pen reaches the end of the line (the signature starts writing there). Set before mount(). */
  onArrive(callback) { this.#onArrive = callback; }

  /** Debounced rebuild: call after anything that changes layout. */
  rebuildSoon() {
    clearTimeout(this.#rebuildTimer);
    this.#rebuildTimer = setTimeout(() => this.#build(), 60);
  }

  #build() {
    const W = this.#page.offsetWidth, H = this.#page.offsetHeight;
    this.#sizeSvg(W, H);
    const gutter = (parseFloat(getComputedStyle(this.#page).paddingLeft) || 64);
    const anchors = this.#collectAnchors(gutter * 0.45);
    if (anchors.length < 2) { this.#total = 0; return; }

    const d = smoothPath(this.#route(anchors, gutter * 0.45, gutter * 0.26));
    this.#measure.setAttribute('d', d);
    this.#mask.setAttribute('d', d);
    const { samples, total } = sampleAlong(this.#measure, SAMPLE_STEP);
    const nodeLengths = anchors.map(a => lengthNear(samples, a));
    this.#body.setAttribute('d', outlinePath(samples, penWidths(samples, total, nodeLengths)));
    this.#mask.style.strokeDasharray = `${f1(total)} ${f1(total + 40)}`;

    this.#renderBlots(anchors, nodeLengths);
    this.#total = total; this.#samples = samples;
    if (reducedMotion) this.#drawn = total;
    this.#drawn = Math.min(this.#drawn, total);
    this.#apply(true);
  }

  #sizeSvg(W, H) {
    this.#svg.setAttribute('width', W);
    this.#svg.setAttribute('height', H);
    this.#svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    for (const [attr, v] of [['x', 0], ['y', 0], ['width', W], ['height', H]]) this.#maskBox.setAttribute(attr, v);
  }

  /**
   * Points the pen must touch, one per [data-ink] element:
   *   data-ink="start"      the hero origin (centre top)
   *   data-ink="signature"  where the signature's first stroke begins, so the line flows into the handwriting
   *   data-ink              the gutter beside the element
   */
  #collectAnchors(gutterX) {
    const anchors = [];
    this.#page.querySelectorAll('[data-ink]').forEach(el => {
      if (!el.offsetParent) return;
      const o = offsetWithin(el, this.#page);
      const kind = el.dataset.ink;
      const p = (kind === 'start' && { x: o.x + el.offsetWidth / 2, y: o.y })
        || (kind === 'signature' && this.#signatureStart(el))
        || { x: gutterX, y: o.y + 14 };
      if (anchors.length && p.y - anchors[anchors.length - 1].y < MIN_GAP) return;
      anchors.push(p);
    });
    return anchors;
  }

  /** Page coordinates of the first point of the signature's first stroke (SVG user units -> page px). */
  #signatureStart(el) {
    const svg = el.querySelector('svg'), stroke = svg?.querySelector('path');
    if (!stroke) return null;
    const view = svg.viewBox.baseVal, box = svg.getBoundingClientRect(), page = this.#page.getBoundingClientRect();
    const start = stroke.getPointAtLength(0);
    return {
      x: box.left - page.left + (start.x - view.x) * box.width / view.width,
      y: box.top - page.top + (start.y - view.y) * box.height / view.height
    };
  }

  /** Anchors plus hand-wobble points in the gutter between far-apart anchors. */
  #route(anchors, gutterX, amplitude) {
    const rand = seededRandom(7);
    const route = [anchors[0], { x: anchors[0].x, y: anchors[0].y + 36 }];
    for (let i = 1; i < anchors.length; i++) {
      const prev = route[route.length - 1], next = anchors[i];
      if (next.y - prev.y > 90) {
        route.push({ x: gutterX + amplitude * (i % 2 ? 1 : -1) * (0.55 + 0.45 * rand()), y: (prev.y + next.y) / 2 });
      }
      route.push(next);
    }
    return route;
  }

  #renderBlots(anchors, nodeLengths) {
    const rand = seededRandom(3);
    this.#blotGroup.textContent = '';
    this.#blots = anchors.slice(1).map((a, j) => {
      const el = document.createElementNS(SVG_NS, 'path');
      el.setAttribute('class', 'blot no-t');
      el.setAttribute('d', blotPath(a.x, a.y, 5 + rand() * 1.6, rand));
      this.#blotGroup.appendChild(el);
      const blot = { el, at: nodeLengths[j + 1], on: false };
      if (this.#drawn >= blot.at - 2 || reducedMotion) { blot.on = true; el.classList.add('on'); }
      return blot;
    });
    /* enable blot transitions only after the first paint so rebuilt blots don't animate in */
    requestAnimationFrame(() => requestAnimationFrame(() => this.#blots.forEach(b => b.el.classList.remove('no-t'))));
  }

  /** Curve length the pen should have reached for the current scroll position. */
  #targetLength() {
    if (reducedMotion) return this.#total;
    const samples = this.#samples;
    if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) return this.#total;
    const y = innerHeight * 0.62 - this.#page.getBoundingClientRect().top;
    if (y <= samples[0].y) return 0;
    let lo = 0, hi = samples.length - 1;
    if (y >= samples[hi].y) return this.#total;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (samples[mid].y < y) lo = mid; else hi = mid; }
    return samples[hi].l;
  }

  #tick = () => {
    requestAnimationFrame(this.#tick);
    if (!this.#total) return;
    const target = this.#targetLength();
    this.#drawn += (target - this.#drawn) * EASE;
    if (Math.abs(target - this.#drawn) < 0.3) this.#drawn = target;
    this.#apply(false);
  };

  #apply(force) {
    const drawn = this.#drawn, total = this.#total, samples = this.#samples;
    const tip = samples[Math.min(samples.length - 1, Math.round(drawn / SAMPLE_STEP))];
    if (force || Math.abs(drawn - this.#prevDrawn) > 0.05) {
      this.#mask.style.strokeDashoffset = f1(total - drawn);
      this.#nib.setAttribute('cx', f1(tip.x));
      this.#nib.setAttribute('cy', f1(tip.y));
      this.#nib.style.opacity = drawn >= total - 1 ? 0 : 1;
      for (const blot of this.#blots) {
        const on = drawn >= blot.at - 2;
        if (on !== blot.on) { blot.on = on; blot.el.classList.toggle('on', on); }
      }
      this.#prevDrawn = drawn;
      this.field.poke();
    }
    const arrived = drawn >= total - 1;
    if (arrived && !this.#arrived) this.#onArrive?.();
    this.#arrived = arrived;
    const box = this.#page.getBoundingClientRect(), x = box.left + tip.x, y = box.top + tip.y;
    const visible = drawn > 2 && drawn < total - 1 && y > -60 && y < innerHeight + 60;
    this.field.penHead = visible ? { x, y } : null;
  }
}
