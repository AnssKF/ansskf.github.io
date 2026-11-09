import { SECTIONS } from '../config/sections.js';
import { reducedMotion } from '../lib/motion.js';

/**
 * Command-palette commands. Each provider is a function (ctx) => Command[]; the palette concatenates them in order.
 *
 * Command: { id, label, hint, kw, run }   (kw = extra search keywords)
 * ctx:     { resume, router, theme (store), copy(text), open(url) }
 *
 * ADD A COMMAND: add it to a provider below, or write a new provider and append it to `providers`.
 */
const jump = ({ resume, router }) =>
  SECTIONS.filter(s => s.palette && s.has(resume)).map(s => ({
    id: `jump-${s.id}`, ...s.palette, run: () => router.goTo(s.id)
  }));

const contact = ({ resume, copy, open }) => {
  const { email, resumeUrl, profiles } = resume.basics;
  const commands = [];
  if (email) commands.push({ id: 'email', label: 'Copy email', hint: email, kw: 'mail contact', run: () => copy(email) });
  if (resumeUrl) commands.push({ id: 'cv', label: 'Open resume / CV', hint: 'pdf', kw: 'cv download resume', run: () => open(resumeUrl) });
  profiles.forEach((p, i) => p.url && commands.push({
    id: `profile-${i}`, label: `Open ${p.network}`, hint: p.username || '', kw: 'profile social link', run: () => open(p.url)
  }));
  return commands;
};

const theming = ({ theme }) => {
  const other = theme.theme === 'dark' ? 'light' : 'dark';
  const commands = [{
    id: 'theme', label: `Switch to ${other} theme`, hint: other === 'dark' ? 'lights off' : 'lights on',
    kw: 'theme dark light mode night day',
    run: () => theme.toggle({ currentTarget: document.querySelector('.theme-btn') })
  }];
  if (theme.preference !== 'system') {
    commands.push({
      id: 'theme-system', label: 'Follow system theme', hint: `os: ${theme.osTheme}`,
      kw: 'theme auto system os default', run: () => theme.followSystem()
    });
  }
  return commands;
};

const misc = ({ open, router }) => [
  { id: 'raw', label: 'Read the raw resume.json', hint: 'for the curious', kw: 'json source data', run: () => open('resume.json') },
  { id: 'top', label: 'Back to the top', hint: '↑', kw: 'home start', run: () => router.goTo('home') }
];

const providers = [jump, contact, theming, misc];

export const buildCommands = ctx => providers.flatMap(provider => provider(ctx));

/** Case-insensitive AND-match of every query word against label, hint and keywords. */
export function filterCommands(commands, query) {
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return commands.filter(c => {
    const haystack = `${c.label} ${c.hint} ${c.kw}`.toLowerCase();
    return words.every(w => haystack.includes(w));
  });
}
