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

    /* ── Private helpers ────────────────────────────────────── */

    _sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  };
}
