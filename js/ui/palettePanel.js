import { copyText } from '../lib/clipboard.js';
import { isMac, isTouch } from '../lib/platform.js';
import { router } from '../services.js';
import { buildCommands, filterCommands } from './commands.js';

/**
 * Alpine component for the Ctrl/⌘+K command palette (`x-data="palette"`).
 * State + keyboard handling only; the commands themselves are in commands.js.
 */
export function palettePanel(Alpine) {
  const copy = async text => {
    const ok = await copyText(text);
    Alpine.store('toast').say(ok ? "Copied. Don't be a stranger." : text);
  };
  const open = url => window.open(url, '_blank', 'noopener');

  return {
    isOpen: false, query: '', index: 0, returnFocus: null,
    chip: isTouch ? 'jump to…' : (isMac ? '⌘K' : 'Ctrl K'),

    get commands() {
      return buildCommands({
        resume: Alpine.store('resume').data, theme: Alpine.store('theme'), router, copy, open
      });
    },
    get results() { return filterCommands(this.commands, this.query); },

    show() {
      this.returnFocus = document.activeElement;
      this.isOpen = true; this.query = ''; this.index = 0;
      this.$nextTick(() => this.$refs.q.focus());
    },
    hide() {
      this.isOpen = false;
      this.returnFocus?.focus?.();
    },
    move(delta) {
      const n = this.results.length;
      if (!n) return;
      this.index = (this.index + delta + n) % n;
      this.$nextTick(() => this.$refs.list.querySelector('li.on')?.scrollIntoView({ block: 'nearest' }));
    },
    run(command) {
      if (!command) return;
      this.isOpen = false;
      command.run();
    },
    onKey(e) {
      const key = (e.key || '').toLowerCase();
      if ((e.metaKey || e.ctrlKey) && key === 'k') { e.preventDefault(); this.isOpen ? this.hide() : this.show(); }
      else if (key === 'escape' && this.isOpen) { e.preventDefault(); this.hide(); }
      else if (key === '/' && !this.isOpen && !/input|textarea|select/i.test(e.target.tagName)) { e.preventDefault(); this.show(); }
    }
  };
}
