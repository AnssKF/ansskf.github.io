/** Copy text to the clipboard. Resolves to true on success. Falls back to execCommand on insecure origins. */
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = Object.assign(document.createElement('textarea'), { value: text });
    area.style.cssText = 'position:fixed;opacity:0';
    document.body.append(area);
    area.select();
    try { return document.execCommand('copy'); } catch { return false; } finally { area.remove(); }
  }
}
