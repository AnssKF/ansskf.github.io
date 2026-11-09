import { TAU, seededRandom } from '../lib/math.js';

/**
 * What the hero dots draw: the visitor's name, or a halftone portrait when `basics.image` is set.
 * Rasterised onto its own fine lattice, independent of the background grid, so it stays legible on small screens.
 */
export class HeroSubject {
  constructor({ name, image } = {}) {
    this.name = String(name || '').trim() || 'Hello';
    this.image = image || '';
  }

  /** Returns typed arrays of dots: positions (x, y), weights (w), jitter for the fly-in (jx, jy, jz), pointer offsets (dx, dy). */
  async rasterize(W, H) {
    const canvas = Object.assign(document.createElement('canvas'), { width: W, height: H });
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    let layout = this.image ? await this.#drawPortrait(ctx, W, H) : null;
    layout ??= this.#drawName(ctx, W, H);
    const pixels = ctx.getImageData(0, 0, W, H).data;
    return this.#sample(pixels, layout, W, H);
  }

  async #drawPortrait(ctx, W, H) {
    try {
      const img = new Image();
      img.src = this.image;
      await img.decode();
      const size = Math.min(W * 0.62, H * 0.42), cx = W / 2, cy = H * 0.3;
      const scale = Math.max(size / img.naturalWidth, size / img.naturalHeight);
      const w = img.naturalWidth * scale, h = img.naturalHeight * scale;
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, size / 2, 0, TAU); ctx.clip();
      ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
      ctx.restore();
      return { mode: 'image', box: [cx - size / 2, cy - size / 2, size, size], step: Math.max(5, Math.round(size / 52)) };
    } catch {
      ctx.clearRect(0, 0, W, H);
      return null;
    }
  }

  #drawName(ctx, W, H) {
    const font = px => `700 ${px}px Newsreader, Georgia, serif`;
    const maxW = W * 0.88, maxH = H * 0.4, probe = 100;
    ctx.font = font(probe);
    /* try one line, every two-line split, and one word per line; keep whichever allows the largest type */
    const words = this.name.split(/\s+/);
    const candidates = [[this.name]];
    for (let i = words.length - 1; i >= 1; i--) candidates.push([words.slice(0, i).join(' '), words.slice(i).join(' ')]);
    if (words.length > 2) candidates.push(words);
    let lines = candidates[0], size = 0;
    for (const c of candidates) {
      const widest = Math.max(...c.map(l => ctx.measureText(l).width));
      const fit = Math.min(H * 0.22, W * 0.24, probe * maxW / widest, maxH / (c.length * 0.95));
      if (fit > size * 1.04) { size = fit; lines = c; }
    }
    ctx.font = font(size);
    ctx.fillStyle = '#000'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const lineHeight = size * 0.95, cy = H * 0.31;
    const blockW = Math.max(...lines.map(l => ctx.measureText(l).width)), blockH = lines.length * lineHeight;
    lines.forEach((l, k) => ctx.fillText(l, W / 2, cy + (k - (lines.length - 1) / 2) * lineHeight));
    return {
      mode: 'text',
      box: [W / 2 - blockW / 2 - size * 0.2, cy - blockH / 2 - size * 0.2, blockW + size * 0.4, blockH + size * 0.4],
      step: Math.max(4.5, Math.min(11, size / 16))
    };
  }

  #sample(pixels, { mode, box, step }, W, H) {
    const xs = [], ys = [], ws = [], taps = [-step * 0.3, 0, step * 0.3];
    for (let y = box[1]; y < box[1] + box[3]; y += step) {
      for (let x = box[0]; x < box[0] + box[2]; x += step) {
        let sum = 0, n = 0;
        for (const ox of taps) for (const oy of taps) {
          const px = Math.round(x + ox), py = Math.round(y + oy);
          if (px < 0 || py < 0 || px >= W || py >= H) continue;
          const k = (py * W + px) * 4, alpha = pixels[k + 3] / 255;
          sum += mode === 'image'
            ? alpha * Math.pow(1 - (0.299 * pixels[k] + 0.587 * pixels[k + 1] + 0.114 * pixels[k + 2]) / 255, 1.1)
            : alpha;
          n++;
        }
        const v = n ? sum / n : 0;
        const weight = mode === 'image' ? v : (v > 0.12 ? Math.min(1, v * 1.25) : 0);
        if (weight > 0.04) { xs.push(x); ys.push(y); ws.push(weight); }
      }
    }
    const m = xs.length, rand = seededRandom(5), zeros = () => new Float32Array(m);
    const dots = { m, step, x: Float32Array.from(xs), y: Float32Array.from(ys), w: Float32Array.from(ws), jx: zeros(), jy: zeros(), jz: zeros(), dx: zeros(), dy: zeros() };
    for (let i = 0; i < m; i++) { dots.jx[i] = rand() * 2 - 1; dots.jy[i] = rand() * 2 - 1; dots.jz[i] = rand(); }
    return dots;
  }
}
