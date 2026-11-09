import { router } from '../services.js';

const LINK_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M10 14a4.2 4.2 0 0 0 6 0l3-3a4.2 4.2 0 0 0-6-6l-1 1"/><path d="M14 10a4.2 4.2 0 0 0-6 0l-3 3a4.2 4.2 0 0 0 6 6l1-1"/></svg>`;

/**
 * x-anchor="id": appends a small link icon to a heading. Click copies that section's URL.
 *   <h2 x-anchor="'skills'"><span x-text="title"></span></h2>
 * Works on any heading, in any section, including ones added later.
 */
export function registerAnchorDirective(Alpine) {
  Alpine.directive('anchor', (el, { expression }, { evaluate, cleanup }) => {
    const id = evaluate(expression);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'anchor';
    button.innerHTML = LINK_ICON;

    const heading = () => [...el.childNodes].filter(n => n !== button).map(n => n.textContent).join('').trim();
    const sync = () => button.setAttribute('aria-label', `Copy link to “${heading()}”`);
    const onClick = async () => {
      const url = await router.copyLink(id);
      Alpine.store('toast').say(url ? 'Link copied. Share the chapter.' : 'Could not copy. The link is in the address bar.');
    };

    button.addEventListener('click', onClick);
    el.append(button);
    sync();
    const labelWatcher = new MutationObserver(sync);
    labelWatcher.observe(el, { childList: true, subtree: true, characterData: true });
    cleanup(() => { labelWatcher.disconnect(); button.remove(); });
  });
}
