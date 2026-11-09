/* Motion preference. When true every animation renders in its finished state. */
export const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/** `behavior` value for scrollTo / scrollIntoView. */
export const scrollBehavior = () => (reducedMotion ? 'auto' : 'smooth');
