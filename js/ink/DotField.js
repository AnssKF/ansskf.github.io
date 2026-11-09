import { TAU, clamp, easeOutCubic } from '../lib/math.js';
import { reducedMotion } from '../lib/motion.js';
import { inkColors } from './colors.js';

const PEN_RADIUS = 80;       // dots within this distance of the pen tip darken
const POINTER_RADIUS = 80;   // dots within this distance of the cursor are pushed away
const INTRO_MS = 1700;
const IDLE_MS = 1500;        // stop redrawing this long after the last activity

/**
 * Fixed full-viewport <canvas> of dots: a background grid plus the hero subject.
 * Behaviours: fly-in intro, dissolve on scroll, pointer repel, darkening near the pen tip.
 * Redraws only while something is active.
 */
export class DotField {
  /** Set by InkLine: { x, y } of the pen tip in viewport px, or null. */
  penHead = null;

  #canvas; #ctx; #subject = null; #dots = null; #grid = null;
  #pointer = { x: -1e4, y: -1e4 };
  #startedAt = 0; #lastActive = 0; #painted = false;
  #W = 0; #H = 0; #spacing = 14; #radius = 1.05;

  start(canvas) {
    if (this.#canvas) return;
    this.#canvas = canvas;
    this.#ctx = canvas.getContext('2d');
    this.#startedAt = this.#lastActive = performance.now();
    this.#bindEvents();
    inkColors.read();
    this.#resize();
    requestAnimationFrame(this.#loop);
  }

  /** Wake the render loop (something changed). */
  poke = () => { this.#lastActive = performance.now(); };

  /** Re-read theme colours and repaint immediately (used inside view transitions). */
  refresh() {
    if (!this.#canvas) return;
    inkColors.read();
    this.poke();
    this.#painted = false;
    this.#frame(performance.now());
  }

  /** @param {import('./HeroSubject.js').HeroSubject} subject */
  async setSubject(subject) {
    this.#subject = subject;
    await this.#rasterize();
    this.#startedAt = performance.now();
    this.poke();
  }

  #bindEvents() {
    const away = () => { this.#pointer.x = this.#pointer.y = -1e4; this.poke(); };
    addEventListener('resize', () => { this.#resize(); this.poke(); });
    addEventListener('scroll', this.poke, { passive: true });
    addEventListener('pointermove', e => { this.#pointer.x = e.clientX; this.#pointer.y = e.clientY; this.poke(); }, { passive: true });
    addEventListener('pointerup', e => { if (e.pointerType !== 'mouse') away(); }, { passive: true });
    addEventListener('pointercancel', away);
    document.addEventListener('mouseleave', away);
    new MutationObserver(() => this.refresh()).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  }

  #resize() {
    const W = innerWidth, H = innerHeight, dpr = Math.min(2, devicePixelRatio || 1);
    const spacing = W < 700 ? 18 : 14;
    this.#W = W; this.#H = H; this.#spacing = spacing; this.#radius = W < 700 ? 0.95 : 1.05;
    this.#canvas.width = Math.round(W * dpr);
    this.#canvas.height = Math.round(H * dpr);
    this.#ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cols = Math.ceil(W / spacing) + 1, rows = Math.ceil(H / spacing) + 2, n = cols * rows;
    const left = (W - (cols - 1) * spacing) / 2;
    const grid = { n, hx: new Float32Array(n), hy: new Float32Array(n), dx: new Float32Array(n), dy: new Float32Array(n) };
    for (let row = 0, i = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++, i++) {
        grid.hx[i] = left + col * spacing;
        grid.hy[i] = spacing / 2 + row * spacing;
      }
    }
    this.#grid = grid;
    if (this.#subject) this.#rasterize();
  }

  async #rasterize() {
    this.#dots = await this.#subject.rasterize(this.#W, this.#H);
  }

  #loop = now => {
    requestAnimationFrame(this.#loop);
    this.#frame(now);
  };

  /** Ease a dot's offset toward its target push-away vector. */
  #repel(x, y, offX, offY, i) {
    const ex = x + offX[i] - this.#pointer.x, ey = y + offY[i] - this.#pointer.y, d2 = ex * ex + ey * ey;
    let tx = 0, ty = 0;
    if (d2 < POINTER_RADIUS ** 2 && d2 > 0.01) {
      const d = Math.sqrt(d2), strength = (POINTER_RADIUS - d) / POINTER_RADIUS;
      tx = ex / d * strength * 22; ty = ey / d * strength * 22;
    }
    offX[i] += (tx - offX[i]) * 0.14;
    offY[i] += (ty - offY[i]) * 0.14;
  }

  #frame(now) {
    const intro = reducedMotion ? 1 : easeOutCubic(clamp((now - this.#startedAt) / INTRO_MS));
    if (now - this.#lastActive > IDLE_MS && intro >= 1 && this.#painted) return;
    this.#painted = true;

    const scroll = scrollY, dissolve = clamp(scroll / (this.#H * 0.45));
    const { faint, mid, subject } = this.#buildPaths(scroll, dissolve, intro);
    const ctx = this.#ctx;
    ctx.clearRect(0, 0, this.#W, this.#H);
    ctx.fillStyle = inkColors.faint; ctx.fill(faint);
    ctx.fillStyle = inkColors.mid; ctx.fill(mid);
    if (subject) {
      ctx.globalAlpha = (1 - dissolve) * clamp(intro * 1.5);
      ctx.fillStyle = inkColors.ink; ctx.fill(subject);
      ctx.globalAlpha = 1;
    }
  }

  #buildPaths(scroll, dissolve, intro) {
    const { n, hx, hy, dx, dy } = this.#grid;
    const faint = new Path2D(), mid = new Path2D(), subject = new Path2D();
    const parallax = (reducedMotion ? 0 : scroll * 0.12) % this.#spacing;
    const pen = this.penHead;

    for (let i = 0; i < n; i++) {
      let x = hx[i], y = hy[i] - parallax;
      if (!reducedMotion) { this.#repel(x, y, dx, dy, i); x += dx[i]; y += dy[i]; }
      let r = this.#radius, path = faint;
      if (pen) {
        const ax = x - pen.x, ay = y - pen.y, d2 = ax * ax + ay * ay;
        if (d2 < PEN_RADIUS ** 2) { r += 1.3 * (1 - Math.sqrt(d2) / PEN_RADIUS); path = mid; }
      }
      path.moveTo(x + r, y); path.arc(x, y, r, 0, TAU);
    }

    const dots = this.#dots;
    if (!dots || !dots.m || dissolve >= 1) return { faint, mid, subject: null };
    const fly = (1 - intro) * 110, maxR = dots.step * 0.44, spread = fly + 46 * dissolve;
    for (let i = 0; i < dots.m; i++) {
      let x = dots.x[i] + dots.jx[i] * spread;
      let y = dots.y[i] - scroll + dots.jy[i] * spread + dissolve * 30 * dots.jz[i];
      if (!reducedMotion) { this.#repel(x, y, dots.dx, dots.dy, i); x += dots.dx[i]; y += dots.dy[i]; }
      const r = Math.max(0.5, maxR * dots.w[i] * (1 - 0.5 * dissolve));
      subject.moveTo(x + r, y); subject.arc(x, y, r, 0, TAU);
    }
    return { faint, mid, subject };
  }
}
