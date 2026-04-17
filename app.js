/**
 * Alpine.js portfolio component.
 * Data-driven by ./resume.json (jsonresume.org schema).
 *
 * Registered as a global function so Alpine can call it via
 *   x-data="portfolio()"
 * Both this script and Alpine.js use `defer`, so this runs first
 * (scripts are deferred in document order).
 */
function portfolio() {
  return {
    /* ── State ──────────────────────────────────────────────── */

    /** @type {Object|null} Parsed resume.json */
    resume: null,

    /** True while the JSON fetch is in flight */
    loading: true,

    /** Currently visible view */
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

    /** MediaQueryList instance for system theme tracking */
    _themeMediaQuery: null,

    /** Bound handler so it can be removed on teardown */
    _systemThemeHandler: null,

    /** Navigation items — icon names map to css.gg class suffixes */
    navItems: [
      { view: 'landing',    icon: 'home',      label: 'Home'       },
      { view: 'education',  icon: 'read',      label: 'Education'  },
      { view: 'skills',     icon: 'terminal',  label: 'Skills'     },
      { view: 'experience', icon: 'briefcase', label: 'Experience' },
      { view: 'contact',    icon: 'mail',      label: 'Contact'    },
    ],

    /* ── Lifecycle ──────────────────────────────────────────── */

    async init() {
      // Apply saved theme immediately (loader overlay is still covering the screen)
      const savedTheme = localStorage.getItem('portfolio-theme') || 'system';
      this.currentTheme = savedTheme;
      this._applyTheme(savedTheme);

      // Close settings on Escape
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.currentView === 'settings') this.toggleSettings();
      });

      try {
        const res = await fetch('./resume.json');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        this.resume = await res.json();

        const summary = this.resume?.basics?.summary;
        const name    = this.resume?.basics?.name ?? '';
        const label   = this.resume?.basics?.label ?? '';

        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) {
          metaDesc.setAttribute(
            'content',
            summary || [name, label].filter(Boolean).join(' — ') || metaDesc.getAttribute('content')
          );
        }

        const title    = document.querySelector('title');
        if (title) {
          title.textContent = [name, label].filter(Boolean).join(' — ') || title.textContent;
        }

      } catch (err) {
        console.warn('[portfolio] Could not load resume.json:', err.message);
        // Safe empty fallback so every template still renders
        this.resume = {
          basics:    { name: '', label: '', email: '', profiles: [] },
          education: [],
          work:      [],
          skills:    [],
        };
      } finally {
        // Brief intentional pause so the loader doesn't flash
        await this._sleep(280);
        this.loading = false;
      }
    },

    /* ── Computed getters ───────────────────────────────────── */

    get firstName() {
      const name = this.resume?.basics?.name ?? '';
      return name.split(' ')[0] ?? '';
    },

    get lastName() {
      const name = this.resume?.basics?.name ?? '';
      const parts = name.split(' ');
      return parts.length > 1 ? parts.slice(1).join(' ') : '';
    },

    /* ── Methods ────────────────────────────────────────────── */

    /**
     * Switch the active view with a coordinated enter / exit animation.
     * The old view animates upward (is-exiting) while the new one rises in
     * from below (is-active).
     */
    switchView(view) {
      if (this.currentView === view || this.loading) return;

      this.exitingView  = this.currentView;
      this.currentView  = view;

      // Clear the exiting class once the CSS transition finishes (~560 ms)
      setTimeout(() => { this.exitingView = null; }, 600);
    },

    /**
     * Map a social network name to a css.gg icon suffix.
     * Falls back to 'profile' for anything unknown.
     */
    profileIcon(network) {
      const map = {
        linkedin: 'profile',
        github:   'code',
        twitter:  'twitter',
        gitlab:   'code',
      };
      return map[(network ?? '').toLowerCase()] ?? 'profile';
    },

    /**
     * Format an ISO date string (YYYY-MM-DD or YYYY-MM or YYYY)
     * to a short locale string like "Jan 2020".
     */
    formatDate(dateStr) {
      if (!dateStr) return '';
      try {
        const parts = String(dateStr).split('-');
        const year  = parseInt(parts[0], 10);
        const month = parts[1] ? parseInt(parts[1], 10) - 1 : 0;
        const d     = new Date(year, month, 1);
        return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      } catch {
        return dateStr;
      }
    },

    /**
     * Open or close settings using the standard switchView animation.
     * Remembers the previous view to return to on close.
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
     * Persist and apply a theme: 'dark' | 'light' | 'system'.
     */
    setTheme(theme) {
      this.currentTheme = theme;
      localStorage.setItem('portfolio-theme', theme);
      this._applyTheme(theme);
    },

    /**
     * Write data-theme on <html> and wire / unwire the system
     * media-query listener when needed.
     */
    _applyTheme(theme) {
      const root = document.documentElement;

      // Clean up any existing system listener
      if (this._themeMediaQuery && this._systemThemeHandler) {
        this._themeMediaQuery.removeEventListener('change', this._systemThemeHandler);
        this._themeMediaQuery    = null;
        this._systemThemeHandler = null;
      }

      if (theme === 'system') {
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        this._systemThemeHandler = (e) => {
          document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
        };
        mq.addEventListener('change', this._systemThemeHandler);
        this._themeMediaQuery = mq;
        root.setAttribute('data-theme', mq.matches ? 'dark' : 'light');
      } else {
        root.setAttribute('data-theme', theme);
      }
    },

    /* ── Private helpers ────────────────────────────────────── */

    _sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  };
}
