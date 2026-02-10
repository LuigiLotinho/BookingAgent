-- Migration: Erweiterte Festival-Felder (Genre-Match, Red-Flags, Empfehlung)
-- Im Supabase SQL Editor ausführen.

ALTER TABLE festivals
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS distance_km INTEGER,
  ADD COLUMN IF NOT EXISTS application_url TEXT,
  ADD COLUMN IF NOT EXISTS application_period TEXT CHECK (application_period IN ('explicit', 'estimated')),
  ADD COLUMN IF NOT EXISTS genres_detected JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS genre_match_score INTEGER CHECK (genre_match_score >= 0 AND genre_match_score <= 100),
  ADD COLUMN IF NOT EXISTS showcase_status TEXT CHECK (showcase_status IN ('true', 'false', 'unknown')),
  ADD COLUMN IF NOT EXISTS recommendation TEXT CHECK (recommendation IN ('apply', 'watch', 'skip')),
  ADD COLUMN IF NOT EXISTS explanation TEXT,
  ADD COLUMN IF NOT EXISTS source_urls TEXT[] DEFAULT '{}';

NOTIFY pgrst, 'reload schema';
