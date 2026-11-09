/**
 * Section registry: the one place that says which sections the page has, in order.
 *
 * A section is rendered by index.html's section loop and automatically gets a hash route (#id),
 * a copy-link icon beside its heading, a place on the ink line and a "Jump to…" palette command.
 *
 * ADD A SECTION
 *   1. Add an entry below.
 *        id       URL hash, e.g. "talks" -> /#talks (unique, lowercase)
 *        view     name of its <template x-if="s.view === '…'"> block in index.html
 *                 (reuse 'work' | 'projects' | 'skills' | 'education', or add a new block)
 *        key      mono label above the heading, usually the resume.json path
 *        title    the playful heading
 *        has      (resume) => boolean; the section is hidden when false
 *        palette  { label, hint, kw } for the Ctrl/⌘+K "jump" command (kw = search keywords)
 *   2. If you added a new view, write its <template> in index.html and any styles in css/site.css.
 *   3. Put the data in resume.json. Nothing else to wire.
 *
 * Landmarks (`landmark: true`) are hand-written in index.html (hero, footer): they only appear here
 * so they get palette commands. They have no `view`.
 */
export const SECTIONS = [
  {
    id: 'experience', view: 'work', key: 'work[]', title: "Where I've shipped things",
    has: r => r.work.length > 0,
    palette: { label: 'Jump to experience', hint: 'work[]', kw: 'jobs work career' }
  },
  {
    id: 'projects', view: 'projects', key: 'projects[]', title: "Things I built because I couldn't not",
    has: r => r.projects.length > 0,
    palette: { label: 'Jump to projects', hint: 'projects[]', kw: 'side oss build' }
  },
  {
    id: 'skills', view: 'skills', key: 'skills[]', title: 'Tools I reach for',
    has: r => r.skills.length > 0,
    palette: { label: 'Jump to skills', hint: 'skills[]', kw: 'stack tools tech' }
  },
  {
    id: 'education', view: 'education', key: 'education[]', title: 'Where it started',
    has: r => r.education.length > 0 || r.certificates.length > 0,
    palette: { label: 'Jump to education', hint: 'education[]', kw: 'school university degree certificates' }
  },
  {
    id: 'contact', landmark: true,
    has: () => true,
    palette: { label: 'Say hello', hint: 'to the signature', kw: 'contact end footer' }
  }
];

/** Sections rendered by the loop in index.html. */
export const contentSections = SECTIONS.filter(s => !s.landmark);
