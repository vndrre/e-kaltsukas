import type { Href } from 'expo-router';

/**
 * Remembers the last main tab route so Sell flow can return there after draft save / exit.
 * Updated from `(tabs)/_layout` whenever pathname is not under `sell`.
 */
let lastNonSellTabHref: Href = '/(tabs)';

export function rememberNonSellTabFromPathname(pathname: string | null | undefined) {
  if (!pathname || typeof pathname !== 'string') {
    return;
  }
  if (pathname.includes('/sell')) {
    return;
  }
  lastNonSellTabHref = pathname as Href;
}

export function getLastNonSellTabHref(): Href {
  return lastNonSellTabHref;
}
