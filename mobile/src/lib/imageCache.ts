import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';

// Caches studio/instructor photos on-device so repeat views are instant
// instead of re-fetching over the network every time. Files live in
// Directory.Cache (not Documents) specifically because iOS is free to purge
// that directory under storage pressure on its own — we get eviction for
// free instead of having to build it ourselves.
//
// A stale (>24h, matching the daily scrape cadence) cache entry is still
// served immediately, with a background re-download kicked off to refresh
// it for next time — stale-while-revalidate, so a changed photo shows up
// within a day without ever blocking the UI on a re-fetch.

const MANIFEST_KEY = 'sansayaw-image-cache-manifest';
const TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_DIR = 'img-cache';

interface ManifestEntry {
  path: string;
  cachedAt: number;
}
type Manifest = Record<string, ManifestEntry>;

// Kept as a single shared in-memory object once loaded so concurrent
// downloads (e.g. a prefetch pass over a dozen photos) mutate and persist
// the same growing manifest rather than racing separate load-modify-save
// cycles against each other.
let manifestCache: Manifest | null = null;
let manifestLoadPromise: Promise<Manifest> | null = null;

function safeParse(json: string): Manifest {
  try {
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

async function getManifest(): Promise<Manifest> {
  if (manifestCache) return manifestCache;
  if (!manifestLoadPromise) {
    manifestLoadPromise = Preferences.get({ key: MANIFEST_KEY }).then(({ value }) => {
      manifestCache = value ? safeParse(value) : {};
      return manifestCache;
    });
  }
  return manifestLoadPromise;
}

async function persistManifestEntry(url: string, entry: ManifestEntry) {
  const manifest = await getManifest();
  manifest[url] = entry;
  manifestCache = manifest;
  await Preferences.set({ key: MANIFEST_KEY, value: JSON.stringify(manifest) });
}

function hashUrl(url: string): string {
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    hash = (hash * 31 + url.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
}

function cacheFilename(url: string): string {
  const extMatch = url.match(/\.(jpe?g|png|webp|gif)(\?|$)/i);
  const ext = extMatch ? extMatch[1].toLowerCase() : 'img';
  return `${CACHE_DIR}/${hashUrl(url)}.${ext}`;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1] || '');
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function pathToWebviewSrc(path: string): Promise<string> {
  const { uri } = await Filesystem.getUri({ path, directory: Directory.Cache });
  return Capacitor.convertFileSrc(uri);
}

async function downloadAndCache(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    const base64 = await blobToBase64(blob);
    const path = cacheFilename(url);
    const { uri } = await Filesystem.writeFile({ path, data: base64, directory: Directory.Cache, recursive: true });
    await persistManifestEntry(url, { path, cachedAt: Date.now() });
    return Capacitor.convertFileSrc(uri);
  } catch {
    return null; // caller falls back to the original remote URL
  }
}

// Returns a local webview-servable src for this image, downloading and
// caching it first if needed. Never throws — returns null on any failure
// so callers can fall back to the plain remote URL.
export async function getCachedImageUri(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  const manifest = await getManifest();
  const entry = manifest[url];
  if (entry) {
    if (Date.now() - entry.cachedAt > TTL_MS) {
      void downloadAndCache(url); // background refresh; don't block on it
    }
    try {
      return await pathToWebviewSrc(entry.path);
    } catch {
      // Cached file vanished (e.g. iOS purged it) — fall through to re-download.
    }
  }
  return downloadAndCache(url);
}

// Fire-and-forget warm-up for a batch of URLs, lightly staggered so we
// don't fire a few dozen simultaneous fetches the moment the app opens.
export function prefetchImages(urls: (string | null | undefined)[]) {
  const unique = [...new Set(urls.filter((u): u is string => !!u))];
  unique.forEach((url, i) => {
    setTimeout(() => { void getCachedImageUri(url); }, i * 60);
  });
}
