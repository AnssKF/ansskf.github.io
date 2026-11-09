import { asArray } from '../lib/format.js';

/** Read-only view over resume.json (jsonresume schema v1 + custom `basics.resumeUrl`). Missing arrays become []. */
export class Resume {
  constructor(raw = {}) {
    const basics = raw.basics || {};
    this.raw = raw;
    this.basics = { ...basics, profiles: asArray(basics.profiles), location: basics.location || {} };
    this.work = asArray(raw.work);
    this.projects = asArray(raw.projects);
    this.skills = asArray(raw.skills);
    this.education = asArray(raw.education);
    this.certificates = asArray(raw.certificates);
  }

  static async load(url = 'resume.json') {
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
    return new Resume(await res.json());
  }

  /** "City, Country" */
  get place() {
    const { city, country } = this.basics.location;
    return [city, country].filter(Boolean).join(', ');
  }

  get summaryWords() {
    return String(this.basics.summary || '').split(/\s+/).filter(Boolean);
  }

  get keywords() {
    return this.skills.flatMap(group => asArray(group.keywords));
  }
}
