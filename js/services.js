/* Composition root: one instance of every service, wired together. UI code imports from here. */
import { DotField } from './ink/DotField.js';
import { InkLine } from './ink/InkLine.js';
import { Signature } from './ink/Signature.js';
import { HashRouter } from './services/HashRouter.js';
import { MetaSync } from './services/MetaSync.js';
import { ThemeManager } from './services/ThemeManager.js';
import { ViewportObserver } from './services/ViewportObserver.js';

export const field = new DotField();
export const line = new InkLine(field);
export const signature = new Signature();
export const router = new HashRouter();
export const meta = new MetaSync();
export const theme = new ThemeManager({ afterApply: () => field.refresh() });

/** Things that animate in the first time they scroll into view. (The signature waits for the ink line instead, see sitePage.) */
export const reveal = new ViewportObserver([
  { selector: '.reveal, .clusters', onEnter: el => el.classList.add('seen') },
  { selector: '.sig', onEnter: el => { if (!line.hasPath) signature.draw(el.querySelector('svg')); } }   // fallback only
]);
