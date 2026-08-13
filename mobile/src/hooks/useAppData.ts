import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { AppData, ClassRow, Instructor, InstructorMap, ParsedTime, Studio } from '../types';

// How many days of past classes to serve — matches web/lib/data.js.
const HISTORY_DAYS = 60;

function parseTimeStart(tr: string | null | undefined): ParsedTime | null {
  if (!tr) return null;
  const m = tr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const ap = m[3].toUpperCase();
  if (ap === 'PM' && h !== 12) h += 12;
  if (ap === 'AM' && h === 12) h = 0;
  return { hour: h, minute: min };
}

// classes_display can exceed PostgREST's per-request row cap (1000), so
// page through it — ported from web/lib/data.js's fetchAllClasses.
async function fetchAllClasses(cutoff: string) {
  const PAGE = 1000;
  const all: any[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('classes_display')
      .select('*')
      .gte('date', cutoff)
      .order('id')
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    all.push(...(data || []));
    if (!data || data.length < PAGE) return all;
  }
}

async function fetchAppData(): Promise<AppData> {
  const cutoff = new Date(Date.now() - HISTORY_DAYS * 86400e3).toISOString().slice(0, 10);

  const [runsRes, studiosRes, instrsRes, classesRaw] = await Promise.all([
    supabase.from('scrape_runs').select('id, scraped_at').in('status', ['success', 'partial']).order('id', { ascending: false }).limit(1),
    supabase.from('studios').select('*').order('name'),
    supabase.from('instructors').select('*'),
    fetchAllClasses(cutoff),
  ]);

  if (runsRes.error) throw new Error(runsRes.error.message);
  if (studiosRes.error) throw new Error(studiosRes.error.message);
  if (instrsRes.error) throw new Error(instrsRes.error.message);

  const lastUpdated: string | null = runsRes.data?.[0]?.scraped_at || null;
  const studios: Studio[] = studiosRes.data || [];

  // Keyed by both id (stable, survives duplicate names) and name (legacy fallback)
  const instrs: InstructorMap = {};
  (instrsRes.data || []).forEach((i: Instructor) => { instrs[i.name] = i; });
  (instrsRes.data || []).forEach((i: Instructor) => { instrs[i.id] = i; });

  const classes: ClassRow[] = classesRaw.map((c: any) => ({
    ...c,
    name: c.class_name,
    studioId: c.studio_id,
    parsedTime: parseTimeStart(c.time_range),
  }));

  return { studios, instrs, classes, lastUpdated };
}

interface UseAppDataResult {
  data: AppData | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

// Data only changes once/day via the scraper cron, so a plain fetch-on-mount
// (no Next-style unstable_cache) is enough.
export function useAppData(): UseAppDataResult {
  const [data, setData] = useState<AppData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchAppData()
      .then(d => { if (!cancelled) setData(d); })
      .catch(e => { if (!cancelled) setError(e.message || String(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [tick]);

  return { data, loading, error, reload: () => setTick(t => t + 1) };
}
