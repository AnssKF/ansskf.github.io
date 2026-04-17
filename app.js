/**
 * Portfolio Alpine.js component — data-driven by ./resume.json
 *
 * Architecture (SOLID):
 *  VIEWS         — single registry; all view-related config lives here
 *  ThemeService  — persist & apply dark/light/system theme          (SRP)
 *  RouterService — hash ↔ view mapping, back/forward handling       (SRP)
 *  ResumeService — fetch resume JSON, icon map, date formatter      (SRP)
 *  portfolio()   — thin Alpine orchestrator; derives state from the
 *                  registry and delegates to services                (SRP / DIP)
 *
 * Adding a view:
 *  1. Append a record to VIEWS below.
 *  2. Add a matching <section class="view" …> in index.html.
 *  3. Add any needed styles in styles.css.
 *  — no other JS changes required (Open / Closed).
 *
 * Script load order: this file must be deferred before Alpine so that
 * `portfolio` is defined when Alpine bootstraps.
 */

/* ─────────────────────────────────────────────────────────────────────────
   View Registry
   Single source of truth.  Every piece of view config derives from here.
   ───────────────────────────────────────────────────────────────────────── */

/**
 * @typedef {Object} ViewRecord
 * @property {string}      id           - Unique view identifier (matches currentView values)
 * @property {string}      name         - Human-readable label (dock button, aria-label)
 * @property {string|null} hash         - URL hash segment; null = not routable (e.g. settings)
 * @property {string}      icon         - css.gg icon suffix used in dock
 * @property {boolean}     inNav        - Whether this view appears in the floating dock
 * @property {string}      sectionIndex - Display index shown in the section label (e.g. "01")
 */

/** @type {ViewRecord[]} */
const VIEWS = [
  {
    id:           'landing',
    name:         'Home',
    hash:         'home',
    icon:         'home',
    inNav:        true,
    sectionIndex: '01',
  },
  {
    id:           'education',
    name:         'Education',
    hash:         'education',
    icon:         'read',
    inNav:        true,
    sectionIndex: '02',
  },
  {
    id:           'skills',
    name:         'Skills',
    hash:         'skills',
    icon:         'terminal',
    inNav:        true,
    sectionIndex: '03',
  },
  {
    id:           'experience',
    name:         'Experience',
    hash:         'experience',
    icon:         'briefcase',
    inNav:        true,
    sectionIndex: '04',
  },
  {
    id:           'contact',
    name:         'Contact',
    hash:         'contact',
    icon:         'mail',
    inNav:        true,
    sectionIndex: '05',
  },
  {
    id:           'settings',
    name:         'Settings',
    hash:         null,     // intentionally not routable — no URL entry
    icon:         'options',
    inNav:        false,
    sectionIndex: '//',
  },
];


/* ─────────────────────────────────────────────────────────────────────────
   ThemeService
   Single responsibility: persist, apply, and track the active theme.
   ───────────────────────────────────────────────────────────────────────── */
class ThemeService {
  static STORAGE_KEY  = 'portfolio-theme';
  static VALID_THEMES = ['dark', 'light', 'system'];

  #mediaQuery    = null;
  #systemHandler = null;

  /**
   * Read the persisted theme, falling back to `fallback`.
   * @param  {string} [fallback='system']
   * @returns {string}
   */
  get(fallback = 'system') {
    const stored = localStorage.getItem(ThemeService.STORAGE_KEY);
    return ThemeService.VALID_THEMES.includes(stored) ? stored : fallback;
  }

  /**
   * Persist and immediately apply a theme.
   * @param {'dark'|'light'|'system'} theme
   */
  set(theme) {
    if (!ThemeService.VALID_THEMES.includes(theme)) return;
    localStorage.setItem(ThemeService.STORAGE_KEY, theme);
    this.apply(theme);
  }

  /**
   * Write `data-theme` on <html> and wire / unwire the system MQL listener.
   * Safe to call before set() (e.g. on cold boot without persisting).
   * @param {'dark'|'light'|'system'} theme
   */
  apply(theme) {
    this.#teardownSystemListener();
    const root = document.documentElement;

    if (theme === 'system') {
      this.#mediaQuery    = window.matchMedia('(prefers-color-scheme: dark)');
      this.#systemHandler = (e) =>
        root.setAttribute('data-theme', e.matches ? 'dark' : 'light');

      this.#mediaQuery.addEventListener('change', this.#systemHandler);
      root.setAttribute('data-theme', this.#mediaQuery.matches ? 'dark' : 'light');
    } else {
      root.setAttribute('data-theme', theme);
    }
  }

  // ── private ──────────────────────────────────────────────────────────────

  #teardownSystemListener() {
    if (this.#mediaQuery && this.#systemHandler) {
      this.#mediaQuery.removeEventListener('change', this.#systemHandler);
      this.#mediaQuery    = null;
      this.#systemHandler = null;
    }
  }
}


/* ─────────────────────────────────────────────────────────────────────────
   RouterService
   Single responsibility: hash ↔ view translation, history management,
   and back/forward event handling.
   ───────────────────────────────────────────────────────────────────────── */
class RouterService {
  #byId      = new Map();   // id   → ViewRecord
  #byHash    = new Map();   // hash → ViewRecord
  #onNavigate;              // (viewId: string) => void — called on hashchange

  /**
   * @param {ViewRecord[]} views
   * @param {(viewId: string) => void} onNavigate  Called when the browser
   *        navigates back/forward to a hash-mapped view.
   */
  constructor(views, onNavigate) {
    this.#onNavigate = onNavigate;

    for (const v of views) {
      this.#byId.set(v.id, v);
      if (v.hash) this.#byHash.set(v.hash, v);
    }
  }

  /**
   * Wire the hashchange listener and resolve the initial view from the URL.
   *
   * @param  {string} defaultViewId  Fallback view when no hash is present.
   * @returns {string|null}  The view id encoded in the URL, or null if none.
   */
  init(defaultViewId) {
    window.addEventListener('hashchange', () => {
      const view = this.#byHash.get(window.location.hash.slice(1));
      if (view) this.#onNavigate(view.id);
    });

    const initialHash = window.location.hash.slice(1);
    const initialView = this.#byHash.get(initialHash);

    if (initialView) return initialView.id;

    if (!initialHash) {
      // No hash at all → write the canonical default hash without a new
      // history entry so the back button still works correctly.
      const defaultView = this.#byId.get(defaultViewId);
      if (defaultView?.hash) history.replaceState(null, '', '#' + defaultView.hash);
    }

    return null;
  }

  /**
   * Push the canonical hash for a view (no-op for non-routable views).
   * @param {string} viewId
   */
  pushHash(viewId) {
    const view = this.#byId.get(viewId);
    if (view?.hash && window.location.hash !== '#' + view.hash) {
      window.location.hash = view.hash;
    }
  }

  /**
   * Retrieve a view record by id.
   * @param  {string} id
   * @returns {ViewRecord|undefined}
   */
  getView(id) {
    return this.#byId.get(id);
  }
}


/* ─────────────────────────────────────────────────────────────────────────
   ResumeService
   Single responsibility: fetch resume data, own the profile-icon map,
   and format dates.  All resume-domain knowledge lives here.
   ───────────────────────────────────────────────────────────────────────── */
class ResumeService {
  /** Safe empty resume so every template still renders on fetch failure. */
  static EMPTY = Object.freeze({
    basics:    { name: '', label: '', email: '', profiles: [] },
    education: [],
    work:      [],
    skills:    [],
  });

  /** social-network name → css.gg icon suffix */
  static #ICON_MAP = {
    linkedin: 'profile',
    github:   'code',
    twitter:  'twitter',
    gitlab:   'code',
  };

  /**
   * Fetch and parse resume JSON.
   * @param  {string} [url='./resume.json']
   * @returns {Promise<Object>}
   */
  async fetch(url = './resume.json') {
    const res = await globalThis.fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  /**
   * Map a social-network name to the corresponding css.gg icon suffix.
   * @param  {string} network
   * @returns {string}
   */
  profileIcon(network) {
    return ResumeService.#ICON_MAP[(network ?? '').toLowerCase()] ?? 'profile';
  }

  /**
   * Format an ISO date string (YYYY-MM-DD | YYYY-MM | YYYY) to "Mon YYYY".
   * @param  {string} dateStr
   * @returns {string}
   */
  formatDate(dateStr) {
    if (!dateStr) return '';
    try {
      const parts = String(dateStr).split('-');
      const d = new Date(
        parseInt(parts[0], 10),
        parts[1] ? parseInt(parts[1], 10) - 1 : 0,
        1,
      );
      return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  }
}


/* ─────────────────────────────────────────────────────────────────────────
   Alpine component — portfolio()
   Thin orchestrator: owns only UI state, derives all view config from the
   VIEWS registry, and delegates every domain concern to a service.
   ───────────────────────────────────────────────────────────────────────── */

/**
 * Registered as a global function so Alpine can call it via
 *   x-data="portfolio()"
 */
function portfolio() {
  // Instantiate services once per component lifetime.
  // router is declared with `let` because it is wired inside init().
  // All three are kept as plain closure variables so Alpine's Proxy
  // never wraps them (required for private class fields to work).
  const themeService  = new ThemeService();
  const resumeService = new ResumeService();
  let   router          = null;
  let   _hidePopupTimer = null;   // debounce timer for hiding the link popup

  return {
    /* ── State ──────────────────────────────────────────────── */

    /** Full VIEWS registry — exposed so templates can bind sectionIndex etc. */
    views: VIEWS,

    /** Dock items derived from the registry (O/C: adding a view needs no logic change). */
    navItems: VIEWS.filter(v => v.inNav),

    /** @type {Object|null} Parsed resume.json */
    resume: null,

    /** True while the JSON fetch is in flight */
    loading: true,

    /** Currently visible view id */
    currentView: 'landing',

    /**
     * View that is animating out.
     * Cleared after the transition duration to avoid stale classes.
     */
    exitingView: null,

    /** View to return to when closing settings */
    previousView: 'landing',

    /** Active theme: 'dark' | 'light' | 'system' */
    currentTheme: 'system',

    /**
     * State for the floating link-action popup shown on hover / long-press.
     * `href`   — target URL (may be a mailto: string)
     * `x/y`   — screen coordinates of the anchor element's top-left corner
     * `copied` — transient flag that drives the "Copied!" label feedback
     */
    linkPopup: { show: false, href: '', x: 0, y: 0, copied: false },

    /** Internal timers — kept off the Alpine reactive surface via a closure var */

    /* ── Lifecycle ──────────────────────────────────────────── */

    async init() {
      // Apply saved theme immediately (loader overlay is still covering the screen).
      const savedTheme = themeService.get();
      this.currentTheme = savedTheme;
      themeService.apply(savedTheme);

      // Initialise hash routing; the callback handles browser back/forward.
      // NOTE: router is kept in the closure (not on `this`) so Alpine's Proxy
      // never wraps it — private class fields (#byHash etc.) break under Proxy.
      router = new RouterService(VIEWS, (viewId) => {
        this.exitingView = this.currentView;
        this.currentView = viewId;
        setTimeout(() => { this.exitingView = null; }, 350);
      });

      const initialView = router.init(this.currentView);
      if (initialView) this.currentView = initialView;

      // Close settings on Escape.
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.currentView === 'settings') {
          this.toggleSettings();
        }
      });

      try {
        this.resume = await resumeService.fetch();
        this._syncDocumentMeta();
      } catch (err) {
        console.warn('[portfolio] Could not load resume.json:', err.message);
        this.resume = ResumeService.EMPTY;
      } finally {
        // Brief intentional pause so the loader does not flash (do not remove).
        await this._sleep(280);
        this.loading = false;
      }
    },

    /* ── Computed getters ───────────────────────────────────── */

    get firstName() {
      return (this.resume?.basics?.name ?? '').split(' ')[0] ?? '';
    },

    get lastName() {
      const parts = (this.resume?.basics?.name ?? '').split(' ');
      return parts.length > 1 ? parts.slice(1).join(' ') : '';
    },

    /* ── Public methods ─────────────────────────────────────── */

    /**
     * Switch the active view with a coordinated enter / exit animation.
     * @param {string} viewId
     */
    switchView(viewId) {
      if (this.currentView === viewId || this.loading) return;

      this.exitingView = this.currentView;
      this.currentView = viewId;

      // Push canonical hash for routable views; no-op for settings.
      router.pushHash(viewId);

      // Clear the exiting class once the CSS transition finishes.
      setTimeout(() => { this.exitingView = null; }, 350);
    },

    /**
     * Toggle the settings panel open/closed, remembering the previous view.
     */
    toggleSettings() {
      if (this.currentView === 'settings') {
        this.switchView(this.previousView);
      } else {
        this.previousView = this.currentView;
        this.switchView('settings');
      }
    },

    /**
     * Persist and apply a theme.
     * @param {'dark'|'light'|'system'} theme
     */
    setTheme(theme) {
      this.currentTheme = theme;
      themeService.set(theme);
    },

    /**
     * Delegated to ResumeService — keeps templates clean.
     * @param  {string} network
     * @returns {string} css.gg icon suffix
     */
    profileIcon(network) {
      return resumeService.profileIcon(network);
    },

    /**
     * Delegated to ResumeService — keeps templates clean.
     * @param  {string} dateStr
     * @returns {string}
     */
    formatDate(dateStr) {
      return resumeService.formatDate(dateStr);
    },

    /* ── Link-action popup ──────────────────────────────────── */

    /**
     * Show the popup anchored to the element that fired `event`.
     * Cancels any pending hide timer so moving between popup ↔ link is smooth.
     * @param {MouseEvent|TouchEvent} event
     * @param {string} href  Full URL or mailto: string
     */
    showLinkPopup(event, href) {
      clearTimeout(_hidePopupTimer);
      const rect    = event.currentTarget.getBoundingClientRect();
      this.linkPopup = { show: true, href, x: rect.left, y: rect.top, copied: false };
    },

    /**
     * Defer hiding so the user can mouse from the link into the popup without
     * it disappearing.  Pass `true` to close immediately (e.g. after "Open").
     * @param {boolean} [immediate=false]
     */
    hideLinkPopup(immediate = false) {
      if (immediate) {
        this.linkPopup.show = false;
      } else {
        _hidePopupTimer = setTimeout(() => { this.linkPopup.show = false; }, 220);
      }
    },

    /** Called when the cursor enters the popup itself — cancels the hide timer. */
    keepLinkPopup() {
      clearTimeout(_hidePopupTimer);
    },

    /** Write the link (or bare email address) to the clipboard. */
    async copyLink() {
      const text = this.linkPopup.href.startsWith('mailto:')
        ? this.linkPopup.href.slice(7)
        : this.linkPopup.href;
      try {
        await navigator.clipboard.writeText(text);
        this.linkPopup.copied = true;
        setTimeout(() => { this.linkPopup.copied = false; }, 1500);
      } catch { /* clipboard unavailable — fail silently */ }
    },

    /* ── Private helpers ────────────────────────────────────── */

    /** Sync <title> and <meta description> from loaded resume basics. */
    _syncDocumentMeta() {
      const { name = '', label = '', summary } = this.resume?.basics ?? {};

      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        metaDesc.setAttribute(
          'content',
          summary ||
          [name, label].filter(Boolean).join(' — ') ||
          metaDesc.getAttribute('content'),
        );
      }

      const title = document.querySelector('title');
      if (title && name) {
        title.textContent = [name, label].filter(Boolean).join(' — ');
      }
    },

    _sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  };
}
