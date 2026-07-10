-- Instagram reel/post URLs shown as embedded class previews on an
-- instructor's page. Manually curated — see manage_instructors.py's
-- add-reel / remove-reel commands. Run in the Supabase SQL editor.

ALTER TABLE sansayaw.instructors
  ADD COLUMN IF NOT EXISTS reel_urls text[] NOT NULL DEFAULT '{}';
