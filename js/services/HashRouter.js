import { copyText } from '../lib/clipboard.js';
import { reducedMotion } from '../lib/motion.js';

/**
 * Hash routing for the single long page. Any element with `data-section` and an `id` is a route.
 *  - Opening the site on `#id` jumps to that section.
 *  - Scrolling updates the hash to the section being read (history.replaceState: no history spam, no hashchange loop).
 *  - Changing the hash by hand / back-forward scrolls there.
 *  - copyLink(id) puts the section's full URL on the clipboard.
 * Sections are looked up in the DOM on demand, so sections rendered later are picked up automatically.
 */
export class HashRouter {
  static HOME = 'home';                    // top of the page: represented by an empty hash

  #lockedTo = null;                        // id we are scrolling to; scroll-spy stays quiet meanwhile
  #lockTimer = 0;
  #frame = 0;

  /** @param {{ readingLine?: number }} options  fraction of viewport height where a section counts as "current" */
  constructor({ readingLine = 0.35 } = {}) { this.readingLine = readingLine; }

  /** Begin routing. Call once the sections have rendered. */
  start() {
    addEventListener('scroll', () => this.#scheduleSpy(), { passive: true });
    addEventListener('resize', () => this.#scheduleSpy());
    addEventListener('hashchange', () => this.#goToHash({ smooth: true }));
    for (const type of ['wheel', 'touchstart', 'keydown']) addEventListener(type, () => this.#unlock(), { passive: true });
    this.#goToHash({ smooth: false }) || this.#spy();
  }

  /** Scroll to a section and put it in the URL. Returns false when there is no such section. */
  goTo(id, { smooth = true, writeHash = true } = {}) {
    const el = this.#find(id);
    if (!el) return false;
    this.#lock(id, smooth);
    if (writeHash) this.#writeHash(id);
    el.scrollIntoView({ behavior: smooth && !reducedMotion ? 'smooth' : 'auto', block: 'start' });
    return true;
  }

  /** Full URL of a section. */
  urlFor(id) {
    const url = new URL(location.href);
    url.hash = id === HashRouter.HOME ? '' : id;
    return url.href;
  }

  /** Copy a section's URL (and show it in the address bar). Resolves to the URL, or null if copying failed. */
  async copyLink(id) {
    const url = this.urlFor(id);
    this.#writeHash(id);
    return (await copyText(url)) ? url : null;
  }

  #find(id) {
    const el = id && document.getElementById(id);
    return el && el.hasAttribute('data-section') ? el : null;
  }

  #sections() {
    return [...document.querySelectorAll('[data-section][id]')].filter(el => el.offsetParent !== null);
  }

  #goToHash({ smooth }) {
    let id = '';
    try { id = decodeURIComponent(location.hash.slice(1)); } catch { /* malformed hash */ }
    return this.goTo(id, { smooth, writeHash: false });
  }

  /* ---- scroll-spy ---- */
  #scheduleSpy() {
    if (this.#frame) return;
    this.#frame = requestAnimationFrame(() => { this.#frame = 0; this.#spy(); });
  }

  #spy() {
    if (this.#lockedTo) return;
    const current = this.#currentSection();
    if (current) this.#writeHash(current);
  }

  #currentSection() {
    const sections = this.#sections();
    if (!sections.length) return null;
    const doc = document.documentElement;
    if (innerHeight + scrollY >= doc.scrollHeight - 4) return sections.at(-1).id;
    const line = innerHeight * this.readingLine;
    let current = sections[0];
    for (const el of sections) if (el.getBoundingClientRect().top <= line) current = el;
    return current.id;
  }

  #writeHash(id) {
    const hash = id === HashRouter.HOME ? '' : `#${id}`;
    if (location.hash === hash) return;
    history.replaceState(history.state, '', `${location.pathname}${location.search}${hash}`);
  }

  /* ---- programmatic-scroll lock ---- */
  #lock(id, smooth) {
    this.#lockedTo = id;
    clearTimeout(this.#lockTimer);
    addEventListener('scrollend', () => this.#unlock(), { once: true });
    this.#lockTimer = setTimeout(() => this.#unlock(), smooth ? 1200 : 120);   // fallback: scrollend never fires if already there
  }

  #unlock() {
    if (!this.#lockedTo) return;
    this.#lockedTo = null;
    clearTimeout(this.#lockTimer);
    this.#spy();
  }
}
