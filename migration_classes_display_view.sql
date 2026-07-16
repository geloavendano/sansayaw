-- Historical class display. Run in the Supabase SQL editor.
--
-- Each scrape run only contains today-and-future classes, so the website
-- (which read only the latest run) lost past days entirely. This view
-- keeps every date's classes visible: for each (date, studio) pair it
-- serves the classes from the LATEST run that covered that pair.
--
--   - Idempotent: a class present in runs 49 and 50 appears once (run 50).
--   - Past dates: Monday's classes aren't in Tuesday's run, so Monday is
--     served by Monday's run — with last_updated = that run's scraped_at.
--   - Partial-failure-proof: if a studio errors in today's run, its classes
--     survive from the last run that scraped it, instead of vanishing.
--
-- security_invoker makes the view run with the caller's permissions, so
-- the existing RLS read policies on classes/scrape_runs still apply.

CREATE OR REPLACE VIEW sansayaw.classes_display
WITH (security_invoker = true) AS
SELECT id, scrape_run_id, studio_id, instructor_id, instructor, date,
       class_name, genre, time_range, venue, created_at, last_updated
FROM (
  SELECT c.*,
         r.scraped_at AS last_updated,
         rank() OVER (PARTITION BY c.date, c.studio_id ORDER BY c.scrape_run_id DESC) AS rn
  FROM sansayaw.classes c
  JOIN sansayaw.scrape_runs r ON r.id = c.scrape_run_id
  WHERE r.status IN ('success', 'partial')
) ranked
WHERE rn = 1;

-- Speeds up the per-(date, studio) latest-run ranking
CREATE INDEX IF NOT EXISTS idx_classes_date_studio_run
  ON sansayaw.classes (date, studio_id, scrape_run_id DESC);

GRANT SELECT ON sansayaw.classes_display TO anon, authenticated, service_role;
