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

async function fetchAppData() {
  const db = createServerClient();

  const [runsRes, studiosRes, instrsRes] = await Promise.all([
    db.from('scrape_runs').select('id, scraped_at').eq('status', 'success').order('id', { ascending: false }).limit(1),
    db.from('studios').select('*').order('name'),
    db.from('instructors').select('*'),
  ]);

  if (runsRes.error) throw new Error(runsRes.error.message);

  const runRow     = runsRes.data?.[0];
  const runId      = runRow?.id;
  const lastUpdated = runRow?.scraped_at || null;
  const studios    = studiosRes.data || [];
  const instrs     = {};
  (instrsRes.data || []).forEach(i => { instrs[i.name] = i; });

  if (!runId) return { studios, instrs, classes: [], lastUpdated };

  const clsRes = await db.from('classes').select('*').eq('scrape_run_id', runId);
  if (clsRes.error) throw new Error(clsRes.error.message);

  const classes = (clsRes.data || []).map(c => ({
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
