import { contentSections } from '../config/sections.js';
import { asArray, formatDate, formatDegree, formatDuration, formatRange } from '../lib/format.js';
import { reducedMotion } from '../lib/motion.js';
import { skillCluster } from '../lib/skillCluster.js';
import { HeroSubject } from '../ink/HeroSubject.js';
import { Resume } from '../model/Resume.js';
import { field, line, meta, reveal, router, signature, theme } from '../services.js';

const HIGHLIGHTS_SHOWN = 2;   // work highlights visible before "+N more"

/**
 * Alpine component for the page (`x-data="site"` on <body>): loads resume.json, exposes the data and
 * formatting helpers to templates, and runs the boot sequence that starts every service.
 */
export function sitePage(Alpine) {
  return {
    ready: false,
    open: {},                 // expanded "+N more" lists, keyed "work-<index>"
    signatureSvg: '',
    year: new Date().getFullYear(),

    /* ---- data ---- */
    get r() { return Alpine.store('resume').data; },
    get sections() { return contentSections.filter(s => s.has(this.r)); },
    get words() { return this.r.summaryWords; },
    get place() { return this.r.place; },
    get hintDelay() { return reducedMotion ? 0 : 1100 + this.words.length * 55 + 400; },

    /* ---- template helpers ---- */
    fmt: formatDate,
    range: formatRange,
    duration: formatDuration,
    degree: formatDegree,
    cluster: skillCluster,
    hidden: job => Math.max(0, asArray(job.highlights).length - HIGHLIGHTS_SHOWN),
    shown: job => asArray(job.highlights).slice(0, HIGHLIGHTS_SHOWN),
    rest: job => asArray(job.highlights).slice(HIGHLIGHTS_SHOWN),
    list: asArray,

    /* ---- boot ---- */
    async init() {
      theme.start();
      field.start(document.getElementById('field'));
      await this.loadContent();
      meta.sync(this.r);
      await this.$nextTick();                      // sections render now that data is in
      await document.fonts.load('700 100px Newsreader').catch(() => {});   // fallback serif is fine
      await field.setSubject(new HeroSubject({ name: this.r.basics.name, image: this.r.basics.image }));
      const signatureSvg = this.$refs.page.querySelector('.sig svg');
      signature.prepare(signatureSvg);
      line.onArrive(() => signature.draw(signatureSvg));   // the pen runs into the first stroke, then keeps writing
      line.mount(this.$refs.page, this.$refs.ink);
      reveal.observe();
      this.ready = true;
      router.start();                              // after layout: deep links need real section positions
    },

    async loadContent() {
      const store = Alpine.store('resume');
      try {
        const [resume, svg] = await Promise.all([
          Resume.load('resume.json'),
          fetch('assets/signature.svg').then(res => (res.ok ? res.text() : '')).catch(() => '')
        ]);
        store.data = resume;
        this.signatureSvg = svg;
        store.loaded = true;
      } catch (error) {
        console.error('resume.json failed to load', error);
        Alpine.store('toast').say("resume.json didn't load. The pen has nothing to write.");
      }
    }
  };
}
