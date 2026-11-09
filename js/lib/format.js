/* Pure formatting helpers for resume.json values (jsonresume dates are "YYYY", "YYYY-MM" or "YYYY-MM-DD"). */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const asArray = v => (Array.isArray(v) ? v : []);

/** "2021-03" -> { y: 2021, m: 3 }; "2021" -> { y: 2021, m: null }; anything else -> null. */
export function parseDate(s) {
  if (!s) return null;
  const [y, m] = String(s).split('-').map(Number);
  return Number.isFinite(y) ? { y, m: m || null } : null;
}

export function formatDate(s) {
  const d = parseDate(s);
  if (!d) return '';
  return d.m ? `${MONTHS[d.m - 1]} ${d.y}` : `${d.y}`;
}

/** "Mar 2021 — now". An item with only an end date shows just that date. */
export function formatRange({ startDate, endDate }) {
  if (!startDate) return endDate ? formatDate(endDate) : '';
  return `${formatDate(startDate)} — ${endDate ? formatDate(endDate) : 'now'}`;
}

/** "2y 3m" between start and end (or today). Empty when undated. */
export function formatDuration({ startDate, endDate }) {
  const a = parseDate(startDate);
  if (!a) return '';
  const now = new Date();
  const b = parseDate(endDate) || { y: now.getFullYear(), m: now.getMonth() + 1 };
  let months = (b.y - a.y) * 12 + ((b.m || 12) - (a.m || 1)) + 1;
  if (months < 1) return '';
  const years = Math.floor(months / 12);
  months %= 12;
  return [years && `${years}y`, months && `${months}m`].filter(Boolean).join(' ');
}

/** "BSc in Computer Science" from an education entry. */
export function formatDegree({ studyType, area }) {
  return [studyType, area && (studyType ? `in ${area}` : area)].filter(Boolean).join(' ');
}
