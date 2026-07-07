-- Instructor identity rules — like email filters for classes.
-- Run in the Supabase SQL editor.
--
-- instructor_aliases maps (scraped name, studio) → a confirmed instructor id.
-- The scraper only assigns classes.instructor_id when a rule exists; new
-- name+studio combos stay unassigned (NULL) until confirmed with:
--
--     python3 manage_instructors.py review
--
-- One person teaching at many studios = many alias rows → one instructor id.
-- The instructors row carries the curated identity: photo_url, instagram, bio.

-- 1. Rules table
CREATE TABLE IF NOT EXISTS sansayaw.instructor_aliases (
    id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name          text   NOT NULL,
    studio_id     text   NOT NULL REFERENCES sansayaw.studios(id),
    instructor_id bigint NOT NULL REFERENCES sansayaw.instructors(id) ON DELETE CASCADE,
    created_at    timestamptz DEFAULT now(),
    UNIQUE (name, studio_id)
);

-- 2. Allow duplicate names in instructors (different people can share a name)
ALTER TABLE sansayaw.instructors DROP CONSTRAINT IF EXISTS instructors_name_key;

-- 3. Backfill rules from existing data. This preserves the current state
--    (same name = same person everywhere). Wrong matches can be fixed later:
--        python3 manage_instructors.py unassign "<name>" <studio_id>
INSERT INTO sansayaw.instructor_aliases (name, studio_id, instructor_id)
SELECT DISTINCT i.name, c.studio_id, c.instructor_id
FROM sansayaw.classes c
JOIN sansayaw.instructors i ON i.id = c.instructor_id
WHERE c.instructor_id IS NOT NULL
ON CONFLICT (name, studio_id) DO NOTHING;

-- 4. Grants (custom schema — nothing is granted automatically)
GRANT SELECT ON sansayaw.instructor_aliases TO anon, authenticated;
GRANT ALL    ON sansayaw.instructor_aliases TO service_role;
GRANT USAGE  ON ALL SEQUENCES IN SCHEMA sansayaw TO service_role;
