/**
 * A tiny line-based template engine. Templates stay readable because the syntax is just `{placeholders}`:
 *
 *   {key}          the value, escaped for the output format (HTML-escaped for .html templates)
 *   {!key}         the value as-is (for markup you already built)
 *   {.}            the current item (inside a loop over plain strings)
 *   {#list}        repeat the lines up to the matching {/list} once per item; inside, placeholders read from that item
 *   {?key}         include the lines up to the matching {/key} only if `key` has a value (non-empty)
 *   {/key}
 *
 * Rules that keep templates free of if/else noise:
 *   - `{#...}`, `{?...}` and `{/...}` sit on their own line and produce no output themselves.
 *   - A line whose placeholders are ALL empty is dropped, so "- Phone: {phone}" vanishes when there is no phone.
 *   - A multi-line value is indented to match the line it is placed on.
 *   - Inside a loop only the item's own fields are visible (no fallback to outer data, so nothing leaks in by accident).
 *   - Values are substituted once and never re-scanned, so a `{` inside your data is safe.
 */

const OPEN = /^\s*\{([#?])([\w.]+)\}\s*$/;
const CLOSE = /^\s*\{\/([\w.]+)\}\s*$/;
const PLACEHOLDER = /\{(!?)([\w.]+)\}/g;

const present = v => v != null && v !== false && v !== '' && !(Array.isArray(v) && v.length === 0);
const read = (scope, key) => (key === '.' ? scope : scope?.[key]);

export const escapeHtml = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * @param {string} template
 * @param {object} data
 * @param {{ escape?: (s: string) => string }} [options]  how `{key}` values are escaped (default: not at all)
 */
export function render(template, data, { escape = s => s } = {}) {
  const lines = template.replace(/\r\n/g, '\n').split('\n');
  const text = renderLines(lines, data, escape).join('\n');
  return text.replace(/\n{3,}/g, '\n\n').replace(/^\n+/, '').trimEnd() + '\n';   // keeps the first line's indentation
}

function renderLines(lines, scope, escape) {
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const open = lines[i].match(OPEN);
    if (!open) {
      const line = fillLine(lines[i], scope, escape);
      if (line !== null) out.push(line);
      continue;
    }
    const [, kind, key] = open;
    const end = findClose(lines, i, key);
    const body = lines.slice(i + 1, end);
    const value = read(scope, key);
    if (kind === '#') for (const item of Array.isArray(value) ? value : []) out.push(...renderLines(body, item, escape));
    else if (present(value)) out.push(...renderLines(body, scope, escape));
    i = end;
  }
  return out;
}

/** Index of the line that closes the block opened at `start` (blocks may nest). */
function findClose(lines, start, key) {
  let depth = 0;
  for (let i = start; i < lines.length; i++) {
    if (OPEN.test(lines[i])) depth++;
    else if (CLOSE.test(lines[i]) && --depth === 0) {
      const closed = lines[i].match(CLOSE)[1];
      if (closed !== key) throw new Error(`Template: {#${key}} on line ${start + 1} is closed by {/${closed}} on line ${i + 1}`);
      return i;
    }
  }
  throw new Error(`Template: {${key}} on line ${start + 1} is never closed`);
}

/** Substitute placeholders in one line; returns null when the line has placeholders and every one is empty. */
function fillLine(line, scope, escape) {
  const indent = line.match(/^\s*/)[0];
  let found = false, filled = false;
  const text = line.replace(PLACEHOLDER, (_, raw, key) => {
    found = true;
    const value = read(scope, key);
    if (!present(value)) return '';
    filled = true;
    const s = raw ? String(value) : escape(String(value));
    return s.split('\n').join('\n' + indent);
  });
  return found && !filled ? null : text;
}
