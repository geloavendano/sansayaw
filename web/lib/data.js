import { unstable_cache } from 'next/cache';
import { createServerClient } from './supabase';

function parseTimeStart(tr) {
  if (!tr) return null;
  const m = tr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!m) return null;
  let h = parseInt(m[1], 10), min = parseInt(m[2], 10);
  const ap = m[3].toUpperCase();
  if (ap === 'PM' && h !== 12) h += 12;
  if (ap === 'AM' && h === 12) h = 0;
  return { hour: h, minute: min };
}

// How many days of past classes to serve. Older classes age out of the
// payload (they stay in the DB — bump this to resurface them).
const HISTORY_DAYS = 60;

// classes_display can exceed PostgREST's per-request row cap (1000 on
// Supabase by default), so page through it.
async function fetchAllClasses(s, cutoff) {
  const PAGE = 1000;
  const all = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await s
      .from('classes_display').select('*')
      .gte('date', cutoff)
      .order('id')
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    all.push(...(data || []));
    if (!data || data.length < PAGE) return all;
  }
}

async function fetchAppData() {
  const db = createServerClient();

  const s = db.schema('sansayaw');
  const cutoff = new Date(Date.now() - HISTORY_DAYS * 86400e3).toISOString().slice(0, 10);

  const [runsRes, studiosRes, instrsRes, classesRes] = await Promise.all([
    s.from('scrape_runs').select('id, scraped_at').in('status', ['success', 'partial']).order('id', { ascending: false }).limit(1),
    s.from('studios').select('*').order('name'),
    s.from('instructors').select('*'),
    // classes_display serves each date from the latest run that covered it,
    // so past days stay visible; last_updated = that run's scraped_at
    fetchAllClasses(s, cutoff).then(rows => ({ rows })).catch(err => ({ err })),
  ]);

  if (runsRes.error) throw new Error(runsRes.error.message);

  const lastUpdated = runsRes.data?.[0]?.scraped_at || null;

  // Fallback: if the classes_display view doesn't exist yet (migration not
  // run), serve the latest run's classes like before instead of erroring.
  let classesRaw = classesRes.rows;
  if (classesRes.err) {
    console.warn('classes_display unavailable, falling back to latest run:', classesRes.err.message);
    const runId = runsRes.data?.[0]?.id;
    if (runId) {
      const legacy = await s.from('classes').select('*').eq('scrape_run_id', runId);
      if (legacy.error) throw new Error(legacy.error.message);
      classesRaw = (legacy.data || []).map(c => ({ ...c, last_updated: lastUpdated }));
    } else {
      classesRaw = [];
    }
  }
  const studios    = studiosRes.data || [];
  // Keyed by id (stable, survives duplicate names) and by name (legacy fallback)
  const instrs     = {};
  (instrsRes.data || []).forEach(i => { instrs[i.name] = i; });
  (instrsRes.data || []).forEach(i => { instrs[i.id] = i; });

  const classes = classesRaw.map(c => ({
    ...c,
    name:       c.class_name,
    studioId:   c.studio_id,
    parsedTime: parseTimeStart(c.time_range),
  }));

  return { studios, instrs, classes, lastUpdated };
}

// Cache for 24 hours — matches the daily scraper cron job
export const getAppData = unstable_cache(
  fetchAppData,
  ['sansayaw-app-data'],
  { revalidate: 86400, tags: ['app-data'] }
);
