-- Migration: Staging-Tabellen und source_detail für finale DB
-- Im Supabase SQL Editor ausführen, danach: NOTIFY pgrst, 'reload schema';

-- 1. Tabelle similar_bands (eine Zeile pro ähnliche Band)
CREATE TABLE IF NOT EXISTS similar_bands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabelle crawler_results (Rohdaten vom Brave/Listen-Crawler, dauerhaft behalten)
CREATE TABLE IF NOT EXISTS crawler_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT,
  url TEXT,
  city TEXT,
  country TEXT,
  raw_text TEXT,
  relevance_score INT,
  source TEXT,
  source_detail TEXT,
  extracted JSONB DEFAULT '{}',
  processed_at TIMESTAMPTZ,
  festival_id UUID REFERENCES festivals(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2b. Eindeutiger Index für Festival-Upsert (name + date_start)
CREATE UNIQUE INDEX IF NOT EXISTS festivals_name_date_start_key ON festivals (name, date_start);

-- 3. source_detail in finale Tabellen (Herkunft: Crawler vs. ähnliche Bands)
ALTER TABLE festivals
  ADD COLUMN IF NOT EXISTS source_detail TEXT;

ALTER TABLE venues
  ADD COLUMN IF NOT EXISTS source_detail TEXT;

-- 4. Tabelle band_events (pro Event einer ähnlichen Band; Verknüpfung zu Festival/Venue nach Merge)
CREATE TABLE IF NOT EXISTS band_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  band_id UUID NOT NULL REFERENCES similar_bands(id) ON DELETE CASCADE,
  event_name TEXT,
  event_date DATE,
  location_name TEXT,
  city TEXT,
  country TEXT,
  country_code TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  source TEXT,
  source_url TEXT,
  festival_id UUID REFERENCES festivals(id) ON DELETE SET NULL,
  venue_id UUID REFERENCES venues(id) ON DELETE SET NULL,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_band_events_unique
  ON band_events (band_id, event_date, location_name, city);

NOTIFY pgrst, 'reload schema';
