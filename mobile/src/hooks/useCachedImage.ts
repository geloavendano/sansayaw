import { useEffect, useState } from 'react';
import { getCachedImageUri } from '../lib/imageCache';

// Resolves to a local on-device src once the image is cached; null (and the
// caller should fall back to the plain remote URL) until then or on failure.
export function useCachedImage(url: string | null | undefined): string | null {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setSrc(null);
    if (!url) return;
    getCachedImageUri(url).then(cachedSrc => {
      if (!cancelled && cachedSrc) setSrc(cachedSrc);
    });
    return () => { cancelled = true; };
  }, [url]);

  return src;
}
