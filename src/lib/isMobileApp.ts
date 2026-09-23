/** Installed PWA or phone-width client — TRA setup stays on desktop/web only. */
export function isMobileAppClient(): boolean {
  if (typeof window === 'undefined') return false;
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  const phoneViewport = window.matchMedia('(max-width: 768px)').matches;
  return standalone || phoneViewport;
}
