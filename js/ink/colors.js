/* Canvas colours come from CSS custom properties so the dot field follows the theme. */
export const inkColors = {
  faint: '#CFC7B5',
  mid: '#8A8377',
  ink: '#141412',

  /** Re-read --dot, --dot-mid and --ink from :root (call after a theme change). */
  read() {
    const styles = getComputedStyle(document.documentElement);
    const token = name => styles.getPropertyValue(name).trim();
    this.faint = token('--dot') || this.faint;
    this.mid = token('--dot-mid') || this.mid;
    this.ink = token('--ink') || this.ink;
  }
};
