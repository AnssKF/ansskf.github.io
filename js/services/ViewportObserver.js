/**
 * Runs a callback the first time an element enters the viewport.
 * Rules are { selector, onEnter(el) }; call observe() after the DOM has rendered (and again after it changes).
 */
export class ViewportObserver {
  #observer;

  /** @param {{ selector: string, onEnter: (el: Element) => void }[]} rules */
  constructor(rules, { rootMargin = '0px 0px -12% 0px' } = {}) {
    this.rules = rules;
    this.#observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        this.#observer.unobserve(entry.target);
        this.rules.filter(r => entry.target.matches(r.selector)).forEach(r => r.onEnter(entry.target));
      }
    }, { rootMargin });
  }

  observe(root = document) {
    for (const { selector } of this.rules) root.querySelectorAll(selector).forEach(el => this.#observer.observe(el));
  }
}
