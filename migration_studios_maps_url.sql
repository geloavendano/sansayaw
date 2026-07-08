-- Add official Google Maps share links to studios.
-- Run in the Supabase SQL editor.
--
-- Populated by the scraper from each SITE dict's maps_url; the frontend
-- prefers this over building a maps search URL from the address.
-- Never overwritten with NULL, so links for other studios can also be
-- added manually in the dashboard.

ALTER TABLE sansayaw.studios ADD COLUMN IF NOT EXISTS maps_url text;
