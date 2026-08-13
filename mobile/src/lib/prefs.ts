import { Preferences } from '@capacitor/preferences';

// Native replacement for localStorage — more durable across iOS storage
// eviction. Same key/shape as the web app's 'sansayaw-filter'.
const FILTER_KEY = 'sansayaw-filter';

export async function loadFilter(): Promise<string[] | null> {
  try {
    const { value } = await Preferences.get({ key: FILTER_KEY });
    if (!value) return null;
    const saved = JSON.parse(value);
    return Array.isArray(saved) ? saved : null;
  } catch {
    return null;
  }
}

export async function saveFilter(ids: string[]) {
  try {
    await Preferences.set({ key: FILTER_KEY, value: JSON.stringify(ids) });
  } catch {
    // non-fatal — filter just won't persist across relaunch
  }
}
