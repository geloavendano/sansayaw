import { Browser } from '@capacitor/browser';
import { track } from './analytics';

// Native replacement for <a target="_blank"> — opens external links (studio
// websites, Instagram, Google Maps/Calendar) in a Safari overlay instead of
// inside the app's WebView. Single chokepoint for every outbound link, so
// it's also the one place we need to instrument to track all of them.
export function openExternal(url: string | null | undefined) {
  if (!url) return;
  track('external_link_opened', { url });
  Browser.open({ url });
}
