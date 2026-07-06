-- Move sansayaw tables out of public into their own schema.
-- Run this once in the Supabase SQL editor.
-- After running, add "sansayaw" to the exposed schemas in:
--   Supabase Dashboard → API → Exposed schemas

CREATE SCHEMA IF NOT EXISTS sansayaw;

ALTER TABLE public.studios      SET SCHEMA sansayaw;
ALTER TABLE public.instructors  SET SCHEMA sansayaw;
ALTER TABLE public.scrape_runs  SET SCHEMA sansayaw;
ALTER TABLE public.classes      SET SCHEMA sansayaw;
