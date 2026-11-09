/*
 * Entry point (loaded as an ES module, before Alpine so the alpine:init listener is ready).
 *
 *   resume.json ─▶ model/Resume ─▶ Alpine stores ─▶ index.html templates
 *   config/sections.js ─▶ section loop, hash routes, palette "jump" commands
 *   services.js ─▶ ink engine, HashRouter, ThemeManager, MetaSync …  (plain classes, no Alpine)
 *   ui/ ─▶ thin Alpine glue: stores, components, the x-anchor directive
 */
import { registerAnchorDirective } from './ui/anchorDirective.js';
import { palettePanel } from './ui/palettePanel.js';
import { sitePage } from './ui/sitePage.js';
import { registerStores } from './ui/stores.js';

document.addEventListener('alpine:init', () => {
  const { Alpine } = window;
  registerStores(Alpine);
  registerAnchorDirective(Alpine);
  Alpine.data('site', () => sitePage(Alpine));
  Alpine.data('palette', () => palettePanel(Alpine));
});
