import { Resume } from '../model/Resume.js';
import { theme } from '../services.js';

/**
 * Alpine stores: reactive state shared between components. Logic lives in services; stores only hold
 * what templates need to re-render on, and forward actions to the services.
 */
export function registerStores(Alpine) {
  Alpine.store('resume', { data: new Resume(), loaded: false });

  let toastTimer = 0;
  Alpine.store('toast', {
    message: '',
    say(message, ms = 2600) {
      this.message = message;
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => { this.message = ''; }, ms);
    }
  });

  Alpine.store('theme', {
    theme: theme.theme,
    preference: theme.preference,
    osTheme: theme.osTheme,
    /** @param {Event} [event] the click that triggered it: the new theme spreads from its target */
    toggle(event) {
      const box = event?.currentTarget?.getBoundingClientRect();
      theme.toggle(box ? { x: box.left + box.width / 2, y: box.top + box.height / 2 } : null);
    },
    followSystem: () => theme.followSystem()
  });
  theme.subscribe(state => {
    const store = Alpine.store('theme');
    store.theme = state.theme;
    store.preference = state.preference;
    store.osTheme = theme.osTheme;
  });
}
