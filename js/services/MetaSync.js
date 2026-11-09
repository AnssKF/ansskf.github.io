/**
 * Keeps <title>, meta description, Open Graph, Twitter tags and JSON-LD in step with resume.json.
 * The static values in index.html are fallbacks for crawlers that don't run JavaScript.
 */
export class MetaSync {
  /** @param {import('../model/Resume.js').Resume} resume */
  sync(resume) {
    const { name = '', label = '', summary = '', url = '' } = resume.basics;
    if (!name) return;
    const parts = name.split(' ').filter(Boolean);
    const jobTitle = resume.work[0]?.position || label;
    const description = summary || [name, jobTitle].filter(Boolean).join(' — ');
    const title = [parts.slice(0, 2).join(' '), jobTitle].filter(Boolean).join(' — ');

    document.title = title;
    this.#meta('name', 'description', description);
    this.#meta('property', 'og:title', title);
    this.#meta('property', 'og:description', description);
    this.#meta('property', 'og:url', url);
    this.#meta('property', 'profile:first_name', parts[0]);
    this.#meta('property', 'profile:last_name', parts.slice(1).join(' '));
    this.#meta('name', 'twitter:title', title);
    this.#meta('name', 'twitter:description', description);
    this.#jsonLd(this.#person(resume, { parts, jobTitle, description }));
  }

  #meta(attr, key, content) {
    if (content) document.querySelector(`meta[${attr}="${key}"]`)?.setAttribute('content', content);
  }

  /** schema.org Person; empty fields are omitted. */
  #person(resume, { parts, jobTitle, description }) {
    const { name, url, email, phone, location, profiles } = resume.basics;
    const job = resume.work[0] || {}, keywords = resume.keywords;
    return {
      '@context': 'https://schema.org', '@type': 'Person', name,
      ...(parts.length > 1 ? { alternateName: parts.slice(0, 2).join(' ') } : {}),
      ...(url ? { url } : {}), ...(email ? { email } : {}), ...(phone ? { telephone: phone } : {}),
      ...(jobTitle ? { jobTitle } : {}), description,
      ...(profiles.length ? { sameAs: profiles.map(p => p.url).filter(Boolean) } : {}),
      ...(keywords.length ? { knowsAbout: keywords } : {}),
      ...(job.name ? { worksFor: { '@type': 'Organization', name: job.name } } : {}),
      ...(location.country ? { homeLocation: { '@type': 'Country', name: location.country } } : {})
    };
  }

  #jsonLd(data) {
    const el = document.querySelector('script[type="application/ld+json"]');
    if (el) el.textContent = JSON.stringify(data, null, 2);
  }
}
