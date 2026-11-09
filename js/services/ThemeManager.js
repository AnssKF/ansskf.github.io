import { reducedMotion } from '../lib/motion.js';

const PAPER = { light: '#F3EEE4', dark: '#161513' };   // <meta name="theme-color"> per theme

/**
 * Light/dark theme. Follows the OS (live) until the visitor picks one; picking the OS value again returns to "follow".
 * The choice persists in localStorage. Switching spreads from a point via a View Transition, like ink soaking into paper.
 * An inline script in <head> sets data-theme before first paint; this class takes over after load.
 */
export class ThemeManager {
  #pref = 'system';                       // 'system' | 'light' | 'dark'
  #theme = 'light';                       // what is currently applied
  #media = matchMedia('(prefers-color-scheme: dark)');
  #listeners = new Set();

  /** @param {{ storageKey?: string, afterApply?: () => void }} options  afterApply runs after every data-theme change */
  constructor({ storageKey = 'theme', afterApply = () => {} } = {}) {
    this.storageKey = storageKey;
    this.afterApply = afterApply;
  }

  get theme() { return this.#theme; }
  get preference() { return this.#pref; }
  get osTheme() { return this.#media.matches ? 'dark' : 'light'; }

  /** Called with { theme, preference } whenever either changes. Returns an unsubscribe function. */
  subscribe(fn) {
    this.#listeners.add(fn);
    return () => this.#listeners.delete(fn);
  }

  start() {
    const saved = this.#readStored();
    if (saved) this.#pref = saved;
    this.#media.addEventListener('change', () => { if (this.#pref === 'system') this.#apply(this.osTheme); });
    this.#apply(this.#pref === 'system' ? this.osTheme : this.#pref, { instant: true });
  }

  /** Flip light/dark. `origin` ({x, y} in viewport px) is where the new theme spreads from. */
  toggle(origin = null) {
    const next = this.#theme === 'dark' ? 'light' : 'dark';
    this.#setPreference(next === this.osTheme ? 'system' : next);
    this.#apply(next, { origin });
  }

  followSystem() {
    this.#setPreference('system');
    this.#apply(this.osTheme, { instant: true });
  }

  #setPreference(pref) {
    this.#pref = pref;
    try {
      if (pref === 'system') localStorage.removeItem(this.storageKey);
      else localStorage.setItem(this.storageKey, pref);
    } catch { /* storage blocked: the choice just won't persist */ }
    this.#emit();
  }

  #readStored() {
    try {
      const value = localStorage.getItem(this.storageKey);
      return value === 'dark' || value === 'light' ? value : null;
    } catch { return null; }
  }

  #apply(theme, { origin = null, instant = false } = {}) {
    const root = document.documentElement;
    const commit = () => {
      root.dataset.theme = theme;
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', PAPER[theme]);
      this.afterApply();
    };
    const wasApplied = root.dataset.theme === theme;
    this.#theme = theme;
    this.#emit();
    if (wasApplied || instant || reducedMotion || !origin || !document.startViewTransition) return commit();

    const transition = document.startViewTransition(commit);
    transition.ready.then(() => {
      const radius = Math.hypot(Math.max(origin.x, innerWidth - origin.x), Math.max(origin.y, innerHeight - origin.y));
      root.animate(
        { clipPath: [`circle(0px at ${origin.x}px ${origin.y}px)`, `circle(${radius}px at ${origin.x}px ${origin.y}px)`] },
        { duration: 700, easing: 'cubic-bezier(.45, 0, .2, 1)', pseudoElement: '::view-transition-new(root)' }
      );
    }).catch(() => {});
  }

  #emit() {
    for (const fn of this.#listeners) fn({ theme: this.#theme, preference: this.#pref });
  }
}
