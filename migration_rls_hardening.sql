-- Fix Supabase security-linter findings for the sansayaw schema.
-- Run in the Supabase SQL editor.
--
-- What was wrong: RLS was never enabled on these tables, even though
-- "Allow public read X" policies existed for them. Postgres ignores
-- policies entirely when RLS is off — so real access was governed purely
-- by table GRANTs. Those grants turned out to include INSERT/UPDATE/
-- DELETE/TRUNCATE for `anon` — the public key embedded in every browser
-- that loads the site. That means anyone could currently write or wipe
-- this data directly via the Supabase REST API, no login required.
--
-- Does this affect scraping or the site? No.
--   - The scraper and manage_instructors.py use the service_role key,
--     which bypasses RLS entirely in Supabase by design — unaffected.
--   - The website uses the anon key and only ever does SELECT — it keeps
--     exactly that access, nothing more, nothing less.

-- 1. Enable RLS on every sansayaw table
ALTER TABLE sansayaw.studios            ENABLE ROW LEVEL SECURITY;
ALTER TABLE sansayaw.instructors        ENABLE ROW LEVEL SECURITY;
ALTER TABLE sansayaw.scrape_runs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE sansayaw.classes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE sansayaw.instructor_aliases ENABLE ROW LEVEL SECURITY;

-- 2. Recreate clean, known-correct read-only policies for the tables the
--    website actually queries (data.js: studios, instructors, scrape_runs,
--    classes). Dropped first in case the existing ones aren't what their
--    name implies.
DROP POLICY IF EXISTS "Allow public read studios"     ON sansayaw.studios;
DROP POLICY IF EXISTS "Allow public read instructors" ON sansayaw.instructors;
DROP POLICY IF EXISTS "Allow public read scrape_runs" ON sansayaw.scrape_runs;
DROP POLICY IF EXISTS "Allow public read classes"     ON sansayaw.classes;

CREATE POLICY "Allow public read studios"     ON sansayaw.studios     FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow public read instructors" ON sansayaw.instructors FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow public read scrape_runs" ON sansayaw.scrape_runs FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow public read classes"     ON sansayaw.classes     FOR SELECT TO anon, authenticated USING (true);

-- instructor_aliases is never queried by the frontend — no policy for
-- anon/authenticated, so RLS denies them by default. service_role is
-- unaffected (bypasses RLS).

-- 3. Defense in depth: strip write/truncate grants from anon & authenticated
--    on the public-facing tables. RLS alone already blocks these (no
--    INSERT/UPDATE/DELETE policy exists for those roles), but removing the
--    grant means there's no privilege left to exploit even if a policy is
--    changed carelessly later.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE
  ON sansayaw.studios, sansayaw.instructors, sansayaw.scrape_runs, sansayaw.classes
  FROM anon, authenticated;

-- instructor_aliases: remove even the SELECT grant — the frontend never
-- reads it, so anon/authenticated shouldn't have any access at all.
REVOKE ALL ON sansayaw.instructor_aliases FROM anon, authenticated;

-- 4. Keep service_role's full access explicit (it bypasses RLS, but the
--    underlying grant must still exist for the scraper / CLI to work).
GRANT ALL ON sansayaw.studios, sansayaw.instructors, sansayaw.scrape_runs,
             sansayaw.classes, sansayaw.instructor_aliases
  TO service_role;

-- Note: public.spatial_ref_sys (a PostGIS system table, unrelated to this
-- app) is deliberately left alone — it's owned by a Supabase-internal role,
-- so ALTER TABLE on it fails with "must be owner of table" for a normal
-- project user ("ERROR: 42501"). This is a known, common Supabase linter
-- finding that project owners generally can't fix themselves; safe to
-- leave unresolved. See: https://github.com/orgs/supabase/discussions/22270
