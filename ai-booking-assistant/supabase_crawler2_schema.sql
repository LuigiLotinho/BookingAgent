-- ============================================================
-- CRAWLER 2 – Band-Website → Gig-History → Venue-Queue
-- Alle Tabellen haben das Präfix "c2_" damit Crawler 1 nicht
-- berührt wird. Nur die finale Ausgabe geht in die gemeinsamen
-- "festivals" / "venues" Tabellen (mit source = 'crawler2').
-- ============================================================

-- 1. Rohdaten: Wo haben ähnliche Bands gespielt?
CREATE TABLE IF NOT EXISTS c2_band_gig_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  similar_band_name TEXT NOT NULL,
  event_date DATE,
  venue_name TEXT,
  venue_city TEXT,
  venue_country TEXT,
  venue_url TEXT,               -- direkte URL zur Venue, falls auf Tour-Seite verlinkt
  event_name TEXT,              -- z.B. "Das Fest 2024"
  source TEXT NOT NULL CHECK (source IN (
    'band_website',             -- Phase 1: offizielle Band-Website gecrawlt
    'bandsintown',              -- Phase 2 (später)
    'setlist_fm'                -- Phase 2 (später)
  )),
  source_url TEXT,              -- URL der Tour-Seite die gecrawlt wurde
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS c2_gig_band_idx    ON c2_band_gig_history(similar_band_name);
CREATE INDEX IF NOT EXISTS c2_gig_source_idx  ON c2_band_gig_history(source);
CREATE INDEX IF NOT EXISTS c2_gig_venue_idx   ON c2_band_gig_history(venue_url) WHERE venue_url IS NOT NULL;

-- 2. Queue: Venues die gecrawlt werden sollen
CREATE TABLE IF NOT EXISTS c2_venue_candidates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  url TEXT UNIQUE NOT NULL,
  name_hint TEXT,
  city_hint TEXT,
  country_hint TEXT,
  discovered_via_bands TEXT[] DEFAULT '{}',   -- Welche ähnlichen Bands führten hierher
  discovery_sources TEXT[] DEFAULT '{}',      -- ['band_website'] oder ['bandsintown']
  gig_count INTEGER DEFAULT 1,               -- Wie viele Bands haben hier gespielt
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending',    -- wartet auf Crawl
    'crawling',   -- gerade gecrawlt
    'done',       -- fertig gecrawlt
    'failed',     -- Fehler beim Crawlen
    'irrelevant'  -- nicht relevant (kein Festival/Venue)
  )),
  crawled_at TIMESTAMP WITH TIME ZONE,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS c2_candidates_status_idx ON c2_venue_candidates(status);

-- 3. Extrahierte Venue/Festival-Daten (vor Normalisierung in festivals/venues)
CREATE TABLE IF NOT EXISTS c2_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id UUID REFERENCES c2_venue_candidates(id) ON DELETE SET NULL,
  url TEXT NOT NULL,
  place_type TEXT CHECK (place_type IN ('festival', 'venue', 'unknown')),
  name TEXT,
  city TEXT,
  country TEXT,
  booking_email TEXT,
  booking_form_url TEXT,
  genres_detected JSONB,        -- [{"genre":"Rock","confidence":"explicit"}]
  capacity_hint TEXT,
  festival_dates JSONB,         -- [{"start":"2026-07-12","end":"2026-07-14","year":2026}]
  genre_match_score FLOAT,
  recommendation TEXT,
  relevance_score INTEGER,
  raw_text TEXT,
  written_to_output BOOLEAN DEFAULT FALSE,  -- wurde in festivals/venues geschrieben?
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS c2_results_written_idx ON c2_results(written_to_output);

-- 4. Step 3: Booking-Kontakte pro Venue
CREATE TABLE IF NOT EXISTS c2_venue_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_name TEXT NOT NULL,
  venue_city TEXT NOT NULL,
  website_url TEXT,
  booking_email TEXT,
  booking_form_url TEXT,
  contact_page_url TEXT,
  crawl_method TEXT,       -- 'main-page' | 'contact-page' | 'llm' | 'none'
  last_crawled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(venue_name, venue_city)
);

CREATE INDEX IF NOT EXISTS c2_contacts_email_idx ON c2_venue_contacts(booking_email) WHERE booking_email IS NOT NULL;

-- RLS deaktivieren für einfachen Zugriff in V1
ALTER TABLE c2_band_gig_history  DISABLE ROW LEVEL SECURITY;
ALTER TABLE c2_venue_candidates  DISABLE ROW LEVEL SECURITY;
ALTER TABLE c2_results           DISABLE ROW LEVEL SECURITY;
ALTER TABLE c2_venue_contacts    DISABLE ROW LEVEL SECURITY;
