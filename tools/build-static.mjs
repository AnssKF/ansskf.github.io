#!/usr/bin/env node
/**
 * Builds everything crawlers and AI agents read without running JavaScript, from resume.json (the single source of truth).
 *
 *   node tools/build-static.mjs           write the files
 *   node tools/build-static.mjs --check   exit 1 if any generated file is out of date (for CI / a pre-commit hook)
 *
 * The output text lives in tools/templates/ (placeholder syntax: see tools/lib/template.mjs). This script only
 * prepares the data and decides which template goes where:
 *
 *   templates/seo.html      -> index.html (title, description, canonical, og:/twitter: tags, JSON-LD), between <!-- build:seo --> markers
 *   templates/content.html  -> index.html, between <!-- build:content --> markers (shown only when JS is off)
 *   templates/resume.md     -> resume.md
 *   templates/llms.txt      -> llms.txt
 *   templates/robots.txt    -> robots.txt
 *   templates/sitemap.xml   -> sitemap.xml
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { escapeHtml, render } from './lib/template.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHECK = process.argv.includes('--check');
const AI_BOTS = [
  'GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-User', 'Claude-SearchBot', 'PerplexityBot',
  'Perplexity-User', 'Google-Extended', 'Applebot-Extended', 'CCBot', 'Bytespider', 'Amazonbot', 'meta-externalagent'
];

const readText = path => readFileSync(join(ROOT, path), 'utf8');
const readTemplate = name => readText(`tools/templates/${name}`);

// ---------- data ----------

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthYear = date => { const [year, month] = String(date).split('-'); return month ? `${MONTHS[month - 1]} ${year}` : year; };
const period = ({ startDate, endDate }) => (startDate ? `${monthYear(startDate)} – ${endDate ? monthYear(endDate) : 'Present'}` : '');
const unique = list => [...new Set(list)];

/** schema.org graph: the Person plus the ProfilePage that is about them. */
function structuredData({ resume, site, title, description, jobTitle, keywords, imageUrl }) {
  const { basics, work = [], education = [] } = resume;
  const { name, email, phone, location = {}, profiles = [] } = basics;
  const shortName = name.split(' ').slice(0, 2).join(' ');
  const person = {
    '@type': 'Person', '@id': `${site}/#person`,
    name, ...(shortName !== name && { alternateName: shortName }),
    url: site, email, telephone: phone, jobTitle, description, image: imageUrl,
    sameAs: profiles.map(p => p.url),
    knowsAbout: keywords,
    ...(work[0] && { worksFor: { '@type': 'Organization', name: work[0].name } }),
    alumniOf: education.map(e => ({ '@type': 'CollegeOrUniversity', name: e.institution, url: e.url })),
    ...(location.country && {
      homeLocation: { '@type': 'Place', address: { '@type': 'PostalAddress', addressLocality: location.city, addressCountry: location.countryCode || location.country } }
    })
  };
  const page = { '@type': 'ProfilePage', url: site, name: title, description, inLanguage: 'en', mainEntity: { '@id': person['@id'] } };
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': [person, page] }, null, 2).replace(/</g, '\\u003c');
}

/** Everything the templates can reference, derived from resume.json. */
function buildView(resume) {
  const { basics, work = [], projects = [], skills = [], education = [], certificates = [] } = resume;
  const site = (basics.url || 'https://anssk.me').replace(/\/$/, '');
  const jobTitle = work[0]?.position || basics.label || '';
  const title = [basics.name.split(' ').slice(0, 2).join(' '), jobTitle].filter(Boolean).join(' — ');
  const description = basics.summary || title;
  const place = [basics.location?.city, basics.location?.country].filter(Boolean).join(', ');
  const keywords = unique(skills.flatMap(s => s.keywords ?? []));
  const imageUrl = `${site}/assets/og.png`;

  return {
    site, title, description, jobTitle,
    imageUrl,
    imageAlt: [basics.name, jobTitle].filter(Boolean).join(' — '),
    firstName: basics.name.split(' ')[0], lastName: basics.name.split(' ').slice(1).join(' '),
    name: basics.name, headline: [jobTitle, place].filter(Boolean).join(' · '), summary: basics.summary,
    email: basics.email, phone: basics.phone, resumeUrl: basics.resumeUrl, profiles: basics.profiles ?? [],
    jsonLd: structuredData({ resume, site, title, description, jobTitle, keywords, imageUrl }),

    work: work.map(job => ({ ...job, period: period(job) })),
    projects: projects.map(p => ({ ...p, keywordList: (p.keywords ?? []).join(', ') })),
    skills: skills.map(s => ({ label: s.level ? `${s.name} (${s.level})` : s.name, keywordList: (s.keywords ?? []).join(', ') })),
    education: education.map(e => ({
      degree: [e.studyType, e.area].filter(Boolean).join(', '),
      institution: e.institution,
      detail: [e.endDate, e.score].filter(Boolean).length ? ` (${[e.endDate, e.score].filter(Boolean).join(', ')})` : ''
    })),
    certificates,

    aiBots: AI_BOTS,
    pages: [['/', 1.0], ['/resume.md', 0.6], ['/resume.json', 0.5], ['/llms.txt', 0.3]]
      .map(([path, priority]) => ({ loc: site + path, priority: priority.toFixed(1) }))
  };
}

// ---------- outputs ----------

/** Replace what sits between `<!-- build:name -->` and `<!-- /build:name -->` in `html`. */
function fillRegion(html, name, body) {
  const region = new RegExp(`(<!-- build:${name} -->\\n)[\\s\\S]*?(\\n\\s*<!-- /build:${name} -->)`);
  if (!region.test(html)) throw new Error(`index.html needs <!-- build:${name} --> and <!-- /build:${name} --> markers`);
  return html.replace(region, (_, open, close) => open + body.trimEnd() + close);
}

function buildOutputs(view) {
  const html = text => render(readTemplate(text), view, { escape: escapeHtml });
  const plain = file => render(readTemplate(file), view);

  const index = [['seo', 'seo.html'], ['content', 'content.html']]
    .reduce((page, [region, template]) => fillRegion(page, region, html(template)), readText('index.html'));

  return {
    'index.html': index,
    'resume.md': plain('resume.md'),
    'llms.txt': plain('llms.txt'),
    'robots.txt': plain('robots.txt'),
    'sitemap.xml': render(readTemplate('sitemap.xml'), view, { escape: escapeHtml })
  };
}

// ---------- run ----------

const resume = JSON.parse(readText('resume.json'));
const outputs = buildOutputs(buildView(resume));
const sameText = (a, b) => a.replace(/\r\n/g, '\n') === b.replace(/\r\n/g, '\n');   // git on Windows may check out CRLF

let stale = 0;
for (const [file, text] of Object.entries(outputs)) {
  const path = join(ROOT, file);
  if (existsSync(path) && sameText(readFileSync(path, 'utf8'), text)) { console.log(`  ok       ${file}`); continue; }
  stale++;
  if (CHECK) console.log(`  STALE    ${file}`);
  else { writeFileSync(path, text); console.log(`  written  ${file}`); }
}
if (CHECK && stale) {
  console.error('\nGenerated files are out of date. Run: node tools/build-static.mjs');
  process.exit(1);
}
