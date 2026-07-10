'use client';

import { useEffect } from 'react';

// Instagram's oEmbed script scans the DOM for .instagram-media blockquotes
// and swaps them for an iframe. It's loaded once and reused across every
// embed on the page; each embed just re-triggers .process() on mount.
let scriptPromise = null;
function loadEmbedScript() {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.instgrm) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise(resolve => {
      const script = document.createElement('script');
      script.src = 'https://www.instagram.com/embed.js';
      script.async = true;
      script.onload = resolve;
      document.body.appendChild(script);
    });
  }
  return scriptPromise;
}

export default function InstagramEmbed({ url }) {
  useEffect(() => {
    let cancelled = false;
    loadEmbedScript().then(() => {
      if (!cancelled && window.instgrm) window.instgrm.Embeds.process();
    });
    return () => { cancelled = true; };
  }, [url]);

  return (
    <blockquote
      className="instagram-media"
      data-instgrm-permalink={url}
      data-instgrm-version="14"
      style={{
        background: '#FFF', border: 0, borderRadius: 12, margin: '0 auto',
        maxWidth: 400, minWidth: 270, padding: 0, width: '99%',
      }}
    />
  );
}
