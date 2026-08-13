import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.warn('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set — copy .env.example to .env.local');
}

// Same Supabase project/anon key as web/lib/supabase.js — scoped to the
// sansayaw schema, gated by RLS (migration_rls_hardening.sql).
export const supabase = createClient(url || '', anonKey || '', {
  db: { schema: 'sansayaw' },
});
