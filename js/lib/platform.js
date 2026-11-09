/* Input-device facts used for UI copy (shortcut hints). */
export const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);
export const isTouch = matchMedia('(pointer: coarse)').matches;
